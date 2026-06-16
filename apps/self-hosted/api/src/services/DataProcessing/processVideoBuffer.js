const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("@ffprobe-installer/ffprobe").path;
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const os = require("os");
const path = require("path");
const sharp = require("sharp");
const { logInfo, logSuccess, logWarning, logTable } = require("../../utils/logEventUtils");

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// ============================================================================
// CONSTANTS
// ============================================================================
const MAX_COMPRESSION_ATTEMPTS = 10; // Giới hạn 10 lần thử
const COMPRESSION_TIMEOUT = 60000; // 60s
const EMERGENCY_TIMEOUT = 30000; // Timeout cho emergency mode

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getTempDir = () => {
  const tmpDir = path.join(os.tmpdir(), "processed-videos");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  return tmpDir;
};

const cleanup = (...filePaths) => {
  filePaths.forEach((filePath) => {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        logInfo("cleanup", `Deleted: ${path.basename(filePath)}`);
      } catch (e) {
        logWarning("cleanup", `Failed to delete: ${path.basename(filePath)}`);
      }
    }
  });
};

const calculateCenterCrop = (width, height) => {
  const side = Math.min(width, height);
  const cropX = Math.floor((width - side) / 2);
  const cropY = Math.floor((height - side) / 2);
  
  const safeCropX = Math.max(0, Math.min(cropX, width - side));
  const safeCropY = Math.max(0, Math.min(cropY, height - side));
  
  logInfo("calculateCenterCrop", 
    `${width}x${height} → ${side}x${side} at (${safeCropX}, ${safeCropY})`
  );
  
  return { width: side, height: side, x: safeCropX, y: safeCropY };
};

// ============================================================================
// STEP 1: GET VIDEO METADATA
// ============================================================================

const getVideoMetadata = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        logInfo("getVideoMetadata", `Error: ${err.message}`);
        return reject(new Error("❌ Lỗi lấy metadata: " + err.message));
      }

      const videoStream = metadata.streams?.find(
        (s) => s.codec_type === "video"
      );

      if (!videoStream?.width || !videoStream?.height) {
        return reject(new Error("❌ Không tìm thấy video stream hợp lệ"));
      }

      // ✅ Normalize numbers
      const width = Number(videoStream.width);
      const height = Number(videoStream.height);

      const rawDuration =
        metadata.format?.duration ??
        videoStream?.duration ??
        0;

      const duration = Number(rawDuration);
      const safeDuration = Number.isFinite(duration) && duration > 0
        ? duration
        : 10;

      const size = Number(metadata.format?.size) || 0;
      const sizeMB = size / (1024 * 1024);

      const format = metadata.format?.format_name || "";
      const codec = videoStream.codec_name || "unknown";

      const isSquare = width === height;
      const isMp4 = format.includes("mp4");

      logTable(
        "getVideoMetadata",
        {
          Path: filePath,
          Format: format || "unknown",
          Codec: codec,
          Size: `${width}x${height}`,
          Duration: `${safeDuration.toFixed(1)}s`,
          FileSize: `${sizeMB.toFixed(2)}MB`,
          Square: isSquare,
          MP4: isMp4,
        },
        "Video Metadata"
      );

      resolve({
        width,
        height,
        duration: safeDuration,
        sizeMB,
        format,
        codec,
        isSquare,
        isMp4,
      });
    });
  });
};

// ============================================================================
// STEP 2: CHECK IF PROCESSING NEEDED
// ============================================================================

const needsProcessing = (metadata, maxSizeMB) => {
  const { isSquare, isMp4, sizeMB } = metadata;

  if (isMp4 && isSquare && sizeMB <= maxSizeMB) {
    logInfo("needsProcessing", "No processing needed - already optimized");
    return { needed: false, reason: "already_optimized" };
  }

  if (isMp4 && isSquare && sizeMB > maxSizeMB) {
    logInfo("needsProcessing", "Compression needed - file too large");
    return { needed: true, reason: "needs_compression" };
  }

  if (isMp4 && !isSquare) {
    logInfo("needsProcessing", "Crop needed - not square");
    return { needed: true, reason: "needs_crop" };
  }

  if (!isMp4) {
    logInfo("needsProcessing", "Format conversion needed");
    return { needed: true, reason: "needs_conversion" };
  }

  return { needed: true, reason: "needs_processing" };
};

// ============================================================================
// STEP 3: CROP TO SQUARE
// ============================================================================

const cropToSquare = (inputPath, outputPath, metadata) => {
  return new Promise((resolve, reject) => {
    const { width, height } = metadata;
    const cropParams = calculateCenterCrop(width, height);

    logInfo("cropToSquare", `Cropping to ${cropParams.width}x${cropParams.height}`);

    const videoFilters = [
      `crop=${cropParams.width}:${cropParams.height}:${cropParams.x}:${cropParams.y}`,
      "scale=1080:1080",
    ];

    let timeout;
    const command = ffmpeg(inputPath)
      .inputOptions(["-threads 1"])
      .videoFilters(videoFilters.join(","))
      .videoCodec("libx264")
      .outputOptions([
        "-preset medium",
        "-movflags +faststart",
        "-pix_fmt yuv420p",
        "-r 30",
        "-an",
        "-profile:v baseline",
        "-level 3.0",
      ])
      .format("mp4")
      .on("start", () => {
        logInfo("cropToSquare", "Started");
        timeout = setTimeout(() => {
          command.kill("SIGKILL");
          reject(new Error("Crop timeout"));
        }, COMPRESSION_TIMEOUT);
      })
      .on("end", () => {
        clearTimeout(timeout);
        const stats = fs.statSync(outputPath);
        const sizeMB = stats.size / (1024 * 1024);
        logInfo("cropToSquare", `Completed: ${sizeMB.toFixed(2)}MB`);
        resolve(outputPath);
      })
      .on("error", (err) => {
        clearTimeout(timeout);
        cleanup(outputPath);
        reject(err);
      });

    command.save(outputPath);
  });
};

// ============================================================================
// STEP 4: COMPRESS VIDEO (WITH LIMITED RECURSIVE COMPRESSION)
// ============================================================================

const performSingleCompression = (inputPath, outputPath, metadata, finalBitrate) => {
  return new Promise((resolve, reject) => {
    const outputOptions = [
      `-b:v ${finalBitrate}`,
      `-maxrate ${Math.floor(finalBitrate * 1.2)}`,
      `-bufsize ${Math.floor(finalBitrate * 2)}`,
      "-preset medium",
      "-movflags +faststart",
      "-pix_fmt yuv420p",
      "-r 30",
      "-an",
      "-profile:v baseline",
      "-level 3.0",
    ];

    let timeout;
    const command = ffmpeg(inputPath)
      .inputOptions(["-threads 1"])
      .videoCodec("libx264")
      .outputOptions(outputOptions)
      .format("mp4")
      .on("start", () => {
        timeout = setTimeout(() => {
          command.kill("SIGKILL");
          reject(new Error("Compression timeout"));
        }, COMPRESSION_TIMEOUT);
      })
      .on("end", () => {
        clearTimeout(timeout);
        resolve(outputPath);
      })
      .on("error", (err) => {
        clearTimeout(timeout);
        cleanup(outputPath);
        reject(err);
      });

    command.save(outputPath);
  });
};

const compressVideoRecursive = async (
  inputPath, 
  tmpDir, 
  timestamp, 
  filename, 
  metadata, 
  maxSizeMB, 
  attempt = 1, 
  bitrateMultiplier = 0.8,
  previousAttempts = []
) => {
  const { duration } = metadata;
  
  // GIỚI HẠN: Chỉ cho phép 5 lần thử
  if (attempt > MAX_COMPRESSION_ATTEMPTS) {
    logWarning("compressVideo", 
      `Đã đạt giới hạn ${MAX_COMPRESSION_ATTEMPTS} lần nén. Dừng lại.`
    );
    
    // Cleanup tất cả các attempts trước
    cleanup(...previousAttempts);
    
    // Tìm file nhỏ nhất trong các attempts
    const lastPath = previousAttempts[previousAttempts.length - 1];
    if (lastPath && fs.existsSync(lastPath)) {
      const stats = fs.statSync(lastPath);
      const sizeMB = stats.size / (1024 * 1024);
      logWarning("compressVideo", 
        `Trả về kết quả tốt nhất: ${sizeMB.toFixed(2)}MB (có thể > ${maxSizeMB}MB)`
      );
      return { path: lastPath, sizeMB };
    }
    
    throw new Error(`Không thể nén video xuống dưới ${maxSizeMB}MB sau ${MAX_COMPRESSION_ATTEMPTS} lần thử`);
  }
  
  const baseBitrate = Math.floor((maxSizeMB * 8 * 1024 * 1024) / duration);
  const targetBitrate = Math.floor(baseBitrate * bitrateMultiplier);
  const finalBitrate = Math.max(targetBitrate, 100000);

  logInfo("compressVideo", 
    `Lần thử ${attempt}/${MAX_COMPRESSION_ATTEMPTS}, Bitrate: ${Math.round(finalBitrate/1000)}kbps, Multiplier: ${bitrateMultiplier.toFixed(2)}`
  );

  const outputPath = path.join(tmpDir, `${timestamp}_${filename}_compress_${attempt}.mp4`);

  try {
    await performSingleCompression(inputPath, outputPath, metadata, finalBitrate);
    
    const stats = fs.statSync(outputPath);
    const sizeMB = stats.size / (1024 * 1024);
    logInfo("compressVideo", `Lần thử ${attempt} kết quả: ${sizeMB.toFixed(2)}MB`);

    // Thành công: file <= maxSizeMB
    if (sizeMB <= maxSizeMB) {
      cleanup(...previousAttempts); // Cleanup các attempts trước
      logSuccess("compressVideo", 
        `Thành công ở lần thử ${attempt}/${MAX_COMPRESSION_ATTEMPTS}: ${sizeMB.toFixed(2)}MB`
      );
      return { path: outputPath, sizeMB };
    }

    // Còn quá lớn, thử lại với bitrate thấp hơn
    const newMultiplier = bitrateMultiplier * 0.7;
    return await compressVideoRecursive(
      inputPath, 
      tmpDir, 
      timestamp, 
      filename, 
      metadata, 
      maxSizeMB, 
      attempt + 1, 
      newMultiplier,
      [...previousAttempts, outputPath] // Track để cleanup sau
    );

  } catch (error) {
    cleanup(outputPath);
    logWarning("compressVideo", `Lần thử ${attempt} thất bại: ${error.message}`);
    
    // Nếu đã hết số lần thử, throw error
    if (attempt >= MAX_COMPRESSION_ATTEMPTS) {
      cleanup(...previousAttempts);
      throw new Error(
        `Không thể nén video sau ${MAX_COMPRESSION_ATTEMPTS} lần thử. Lỗi cuối: ${error.message}`
      );
    }
    
    // Còn lượt thử, giảm bitrate mạnh hơn và thử lại
    const newMultiplier = bitrateMultiplier * 0.6;
    return await compressVideoRecursive(
      inputPath, 
      tmpDir, 
      timestamp, 
      filename, 
      metadata, 
      maxSizeMB, 
      attempt + 1, 
      newMultiplier,
      previousAttempts
    );
  }
};

const compressVideo = async (inputPath, tmpDir, timestamp, filename, metadata, maxSizeMB) => {
  try {
    return await compressVideoRecursive(
      inputPath, 
      tmpDir, 
      timestamp, 
      filename, 
      metadata, 
      maxSizeMB
    );
  } catch (error) {
    // Nếu tất cả đều thất bại, log rõ ràng
    logWarning("compressVideo", 
      `Tất cả ${MAX_COMPRESSION_ATTEMPTS} lần nén đều thất bại hoặc không đạt ${maxSizeMB}MB`
    );
    throw error;
  }
};

// ============================================================================
// STEP 5: CONVERT FORMAT
// ============================================================================

const convertFormat = (inputPath, outputPath, metadata) => {
  return new Promise((resolve, reject) => {
    logInfo("convertFormat", "Converting to MP4");

    let timeout;
    const command = ffmpeg(inputPath)
      .inputOptions(["-threads 1"])
      .videoCodec("libx264")
      .outputOptions([
        "-preset medium",
        "-movflags +faststart",
        "-pix_fmt yuv420p",
        "-r 30",
        "-an",
        "-profile:v baseline",
        "-level 3.0",
      ])
      .format("mp4")
      .on("start", () => {
        timeout = setTimeout(() => {
          command.kill("SIGKILL");
          reject(new Error("Conversion timeout"));
        }, COMPRESSION_TIMEOUT);
      })
      .on("end", () => {
        clearTimeout(timeout);
        const stats = fs.statSync(outputPath);
        const sizeMB = stats.size / (1024 * 1024);
        logInfo("convertFormat", `Completed: ${sizeMB.toFixed(2)}MB`);
        resolve(outputPath);
      })
      .on("error", (err) => {
        clearTimeout(timeout);
        cleanup(outputPath);
        reject(err);
      });

    command.save(outputPath);
  });
};

// ============================================================================
// MAIN PROCESSING FUNCTION
// ============================================================================

const processVideoBuffer = ({ videoBuffer, filename = "temp", maxSizeMB = 5, frameUrl = null, polaroid = null }) => {
  return new Promise(async (resolve, reject) => {
    const frameTag = frameUrl ? " (with PNG frame)" : polaroid ? " (with polaroid frame)" : "";
    logInfo("processVideoBuffer", `Start processing: ${filename}${frameTag}`);

    const tmpDir = getTempDir();
    const timestamp = Date.now();
    const inputPath = path.join(tmpDir, `${timestamp}_${filename}`);
    let needsCleanup = [];

    // Write buffer to temp file
    try {
      fs.writeFileSync(inputPath, videoBuffer);
      needsCleanup.push(inputPath);
      
      const inputStats = fs.statSync(inputPath);
      const inputSizeMB = inputStats.size / (1024 * 1024);
      logInfo("processVideoBuffer", `Input: ${inputSizeMB.toFixed(2)}MB`);

      if (inputSizeMB < 0.2) {
        cleanup(...needsCleanup);
        logWarning("processVideoBuffer", "Video too small");
        return reject(new Error("❌ Video quá nhỏ hoặc lỗi."));
      }
    } catch (err) {
      cleanup(...needsCleanup);
      return reject(new Error("❌ Lỗi ghi buffer: " + err.message));
    }

    try {
      // STEP 1: Get metadata
      const metadata = await getVideoMetadata(inputPath);
      
      // STEP 2: Check if processing needed
      const processingCheck = needsProcessing(metadata, maxSizeMB);
      
      if (!processingCheck.needed && !frameUrl && !polaroid) {
        // Video is already 1080² mp4 under the size cap and no frame overlay needed.
        const resultBuffer = fs.readFileSync(inputPath);
        cleanup(...needsCleanup);
        logSuccess("processVideoBuffer",
          `Already optimized: ${metadata.sizeMB.toFixed(2)}MB - No processing needed`
        );
        return resolve(resultBuffer);
      }

      let currentPath = inputPath;

      // STEP 3: Convert format if needed
      if (!metadata.isMp4) {
        const convertedPath = path.join(tmpDir, `${timestamp}_${filename}_converted.mp4`);
        await convertFormat(currentPath, convertedPath, metadata);
        needsCleanup.push(convertedPath);
        currentPath = convertedPath;
        
        const newMetadata = await getVideoMetadata(currentPath);
        Object.assign(metadata, newMetadata);
      }

      // STEP 4: Crop to square if needed
      if (!metadata.isSquare) {
        const croppedPath = path.join(tmpDir, `${timestamp}_${filename}_cropped.mp4`);
        await cropToSquare(currentPath, croppedPath, metadata);
        needsCleanup.push(croppedPath);
        currentPath = croppedPath;
        
        const newMetadata = await getVideoMetadata(currentPath);
        Object.assign(metadata, newMetadata);
      }

      // STEP 5: Compress if needed (GIỚ HẠN 5 LẦN)
      if (metadata.sizeMB > maxSizeMB) {
        try {
          const result = await compressVideo(
            currentPath, 
            tmpDir, 
            timestamp, 
            filename, 
            metadata, 
            maxSizeMB
          );
          needsCleanup.push(result.path);
          currentPath = result.path;
          
          // Cảnh báo nếu vẫn > maxSizeMB
          if (result.sizeMB > maxSizeMB) {
            logWarning("processVideoBuffer", 
              `Không thể nén xuống ${maxSizeMB}MB sau ${MAX_COMPRESSION_ATTEMPTS} lần. ` +
              `Kết quả: ${result.sizeMB.toFixed(2)}MB`
            );
          }
        } catch (compressionError) {
          // Nếu compression hoàn toàn thất bại, vẫn trả về file hiện tại
          logWarning("processVideoBuffer", 
            `Compression failed: ${compressionError.message}. Returning current file.`
          );
        }
      }

      // STEP 6: Overlay PNG frame when requested (graceful fallback on any error).
      // The frame PNG is downloaded from the URL, composited on top of the video
      // via ffmpeg filter_complex, then the temp PNG is removed.
      if (frameUrl) {
        let framePng = null;
        const framedPath = path.join(tmpDir, `${timestamp}_${filename}_framed.mp4`);
        try {
          framePng = await downloadFramePng(frameUrl, tmpDir, timestamp);
          await overlayFrameOnVideo(currentPath, framePng, framedPath);
          needsCleanup.push(framedPath);
          currentPath = framedPath;
          logSuccess("processVideoBuffer", "PNG frame baked into video");
        } catch (frameErr) {
          // Non-fatal: log and continue with the un-framed video.
          logWarning("processVideoBuffer", `Frame overlay skipped: ${frameErr.message}`);
          cleanup(framedPath);
        } finally {
          if (framePng) cleanup(framePng);
        }
      }

      // STEP 7: Polaroid frame — build the white-border + text-strip PNG via sharp,
      // then reuse overlayFrameOnVideo to bake it. Graceful fallback on any error.
      if (polaroid) {
        let polaroidPng = null;
        const polaroidPath = path.join(tmpDir, `${timestamp}_${filename}_polaroid.mp4`);
        try {
          polaroidPng = await buildPolaroidFramePng(polaroid, tmpDir, timestamp);
          await overlayFrameOnVideo(currentPath, polaroidPng, polaroidPath);
          needsCleanup.push(polaroidPath);
          currentPath = polaroidPath;
          logSuccess("processVideoBuffer", "Polaroid frame baked into video");
        } catch (polaroidErr) {
          // Non-fatal: log and continue with the un-framed video.
          logWarning("processVideoBuffer", `Polaroid overlay skipped: ${polaroidErr.message}`);
          cleanup(polaroidPath);
        } finally {
          if (polaroidPng) cleanup(polaroidPng);
        }
      }

      // Final result
      const resultBuffer = fs.readFileSync(currentPath);
      const finalSize = resultBuffer.length / (1024 * 1024);

      cleanup(...needsCleanup);

      logSuccess("processVideoBuffer",
        `Final output: ${finalSize.toFixed(2)}MB (.mp4) - Completed`
      );
      resolve(resultBuffer);

    } catch (error) {
      cleanup(...needsCleanup);
      logInfo("processVideoBuffer", `Processing failed: ${error.message}`);
      reject(new Error("❌ Lỗi xử lý video: " + error.message));
    }
  });
};

// ============================================================================
// STEP 6: OVERLAY PNG FRAME (server-side bake for video + PNG frames)
// ============================================================================

/**
 * Download the PNG frame from a URL into a temp file.
 * Uses the global `fetch` available in Node 20+.
 * Returns the local temp path, or throws on failure.
 */
const downloadFramePng = async (frameUrl, tmpDir, timestamp) => {
  const response = await fetch(frameUrl);
  if (!response.ok) {
    throw new Error(`Failed to download frame PNG: HTTP ${response.status} ${frameUrl}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const framePath = path.join(tmpDir, `${timestamp}_frame.png`);
  fs.writeFileSync(framePath, buffer);
  logInfo("downloadFramePng", `Downloaded frame: ${(buffer.length / 1024).toFixed(1)}KB → ${path.basename(framePath)}`);
  return framePath;
};

/**
 * Overlay a 1080×1080 PNG frame on top of a 1080×1080 mp4 video.
 * The PNG is expected to be transparent in the centre and opaque on borders.
 * Output is written to outputPath. Returns outputPath on success.
 *
 * filter_complex breakdown:
 *   [1:v]scale=1080:1080[fr]   — ensure the PNG input matches the video size
 *   [0:v][fr]overlay=0:0[v]   — composite frame on top of video at origin
 */
const overlayFrameOnVideo = (inputPath, framePng, outputPath) => {
  return new Promise((resolve, reject) => {
    logInfo("overlayFrameOnVideo", `Overlaying frame: ${path.basename(framePng)}`);

    let timeout;
    const command = ffmpeg(inputPath)
      .input(framePng)
      .complexFilter([
        "[1:v]scale=1080:1080[fr]",
        "[0:v][fr]overlay=0:0[v]",
      ])
      .outputOptions([
        "-map [v]",
        "-c:v libx264",
        "-preset medium",
        "-pix_fmt yuv420p",
        "-movflags +faststart",
        "-an",
      ])
      .format("mp4")
      .on("start", (cmd) => {
        logInfo("overlayFrameOnVideo", "Started");
        timeout = setTimeout(() => {
          command.kill("SIGKILL");
          reject(new Error("Frame overlay timeout"));
        }, COMPRESSION_TIMEOUT);
      })
      .on("end", () => {
        clearTimeout(timeout);
        const stats = fs.statSync(outputPath);
        logSuccess("overlayFrameOnVideo", `Completed: ${(stats.size / (1024 * 1024)).toFixed(2)}MB`);
        resolve(outputPath);
      })
      .on("error", (err) => {
        clearTimeout(timeout);
        cleanup(outputPath);
        reject(err);
      });

    command.save(outputPath);
  });
};

// ============================================================================
// STEP 7: POLAROID FRAME — render border + text strip via sharp, then overlay
// ============================================================================

// Polaroid geometry mirrors compose-frame.js at 1080×1080 canvas size exactly:
//   white border: 48px top/left/right; bottom strip 228px (1080-852)
//   photo inset: x=48, y=48, w=984, h=804 → bottom edge y=852
//   date text (30px): centered at y=927 (852 + 228*0.33)
//   caption text (38px): centered at y=1005 (852 + 228*0.67)
const POLAROID_SIZE = 1080;
const POLAROID_BORDER = 48;         // top / left / right white border
const POLAROID_PHOTO_W = 984;       // POLAROID_SIZE - 2*POLAROID_BORDER
const POLAROID_PHOTO_H = 804;       // empirical: leaves 228px bottom strip
const POLAROID_STRIP_TOP = POLAROID_BORDER + POLAROID_PHOTO_H; // 852
const POLAROID_STRIP_H = POLAROID_SIZE - POLAROID_STRIP_TOP;    // 228
const POLAROID_DATE_Y = Math.round(POLAROID_STRIP_TOP + POLAROID_STRIP_H * 0.33);  // 927
const POLAROID_CAPTION_Y = Math.round(POLAROID_STRIP_TOP + POLAROID_STRIP_H * 0.67); // 1005
const TEXT_COLOR = "#333333";
const DATE_FONT_SIZE = 30;
const CAPTION_FONT_SIZE = 38;
const TEXT_MAX_CHARS = 40; // safety truncation before SVG render

/**
 * Truncate text to at most `max` chars, appending "…" when cut.
 * This is a conservative estimate used before SVG; SVG has no measureText.
 */
// Escape XML so a caption containing & < > " ' can't break the SVG composite
// (an unescaped char throws inside sharp → polaroid would silently not apply).
const escapeXML = (text) =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const truncateSVGText = (text, max) => {
  const str = String(text);
  const truncated = str.length > max ? str.slice(0, max - 1) + "…" : str;
  return escapeXML(truncated);
};

/**
 * Build a 1080×1080 RGBA PNG that acts as the polaroid frame overlay:
 *   - white on all border areas (top 48px, left 48px, right 48px, bottom 228px)
 *   - transparent cut-out in the inner 984×804 photo area so the video shows through
 *   - date + caption rendered in the bottom white strip via SVG composite
 *
 * Returns the path of the temp PNG file.
 */
const buildPolaroidFramePng = async (polaroid, tmpDir, timestamp) => {
  const { date = "", caption = "" } = polaroid;

  // Build SVG text elements for the bottom strip. Using dominant-baseline and
  // text-anchor to match the Canvas 2D textBaseline:"middle" + textAlign:"center".
  const centerX = POLAROID_SIZE / 2;

  let svgText = "";
  if (date && caption) {
    // Two-line: date (lighter) then caption (bolder)
    svgText = `
      <text x="${centerX}" y="${POLAROID_DATE_Y}"
            font-family="DejaVu Sans, sans-serif" font-size="${DATE_FONT_SIZE}"
            font-weight="500" fill="${TEXT_COLOR}"
            text-anchor="middle" dominant-baseline="middle">
        ${truncateSVGText(date, TEXT_MAX_CHARS)}
      </text>
      <text x="${centerX}" y="${POLAROID_CAPTION_Y}"
            font-family="DejaVu Sans, sans-serif" font-size="${CAPTION_FONT_SIZE}"
            font-weight="600" fill="${TEXT_COLOR}"
            text-anchor="middle" dominant-baseline="middle">
        ${truncateSVGText(caption, TEXT_MAX_CHARS)}
      </text>`;
  } else {
    const singleText = date || caption;
    if (singleText) {
      const midY = Math.round(POLAROID_STRIP_TOP + POLAROID_STRIP_H / 2);
      svgText = `
        <text x="${centerX}" y="${midY}"
              font-family="DejaVu Sans, sans-serif" font-size="${DATE_FONT_SIZE}"
              font-weight="500" fill="${TEXT_COLOR}"
              text-anchor="middle" dominant-baseline="middle">
          ${truncateSVGText(singleText, TEXT_MAX_CHARS)}
        </text>`;
    }
  }

  // SVG overlay: only renders into the bottom strip area. The inner photo
  // area remains transparent so the video frame shows through after compositing.
  const svgOverlay = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${POLAROID_SIZE}" height="${POLAROID_SIZE}">
      ${svgText}
    </svg>`);

  // Step A: Create white 1080×1080, then punch out the inner photo area to alpha=0.
  // sharp doesn't have a direct "cut rectangle to transparent" op, but we can achieve
  // it via a composite with a black PNG in "dest-out" blend mode.
  const innerCutout = await sharp({
    create: {
      width: POLAROID_PHOTO_W,
      height: POLAROID_PHOTO_H,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  }).png().toBuffer();

  const framePngBuffer = await sharp({
    create: {
      width: POLAROID_SIZE,
      height: POLAROID_SIZE,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }, // white
    },
  })
    .composite([
      // Punch out the inner photo area to transparent using dest-out blend.
      {
        input: innerCutout,
        left: POLAROID_BORDER,
        top: POLAROID_BORDER,
        blend: "dest-out",
      },
      // Render date/caption SVG on top of the (now transparent-centre) white frame.
      {
        input: svgOverlay,
        left: 0,
        top: 0,
        blend: "over",
      },
    ])
    .png()
    .toBuffer();

  const framePath = path.join(tmpDir, `${timestamp}_polaroid_frame.png`);
  fs.writeFileSync(framePath, framePngBuffer);
  logInfo("buildPolaroidFramePng", `Built polaroid frame PNG (${(framePngBuffer.length / 1024).toFixed(1)}KB)`);
  return framePath;
};

// ============================================================================
// THUMBNAIL GENERATION
// ============================================================================

const generateThumbnail = (videoInput, localId, options = {}) => {
  const { seekTime = 0.1 } = options;
  
  return new Promise((resolve, reject) => {
    logInfo("generateThumbnail", `Start generating for ${localId}`);

    const tmpDir = getTempDir();
    const timestamp = Date.now();
    const thumbnailFileName = `thumb_${timestamp}_${localId}.png`;
    const inputPath = typeof videoInput === "string" 
      ? videoInput 
      : path.join(tmpDir, `input_${timestamp}_${localId}.mp4`);
    const outputPath = path.join(tmpDir, thumbnailFileName);

    // Write buffer if needed
    if (Buffer.isBuffer(videoInput)) {
      try {
        fs.writeFileSync(inputPath, videoInput);
      } catch (err) {
        return reject(new Error("❌ Lỗi ghi buffer: " + err.message));
      }
    }

    if (!fs.existsSync(inputPath)) {
      return reject(new Error("❌ File input không tồn tại"));
    }

    // Get video duration to adjust seek time
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      let finalSeekTime = 0;
      
      if (metadata && metadata.format && metadata.format.duration) {
        const duration = parseFloat(metadata.format.duration);
        if (duration >= 3) {
          finalSeekTime = Math.min(seekTime, duration - 0.5);
        } else if (duration >= 1) {
          finalSeekTime = Math.max(0.1, duration * 0.1);
        }
      }

      let timeout;
      ffmpeg(inputPath)
        .inputOptions(["-threads 1"])
        .screenshots({
          timestamps: [finalSeekTime],
          filename: thumbnailFileName,
          folder: tmpDir,
          size: "500x500",
        })
        .on("start", () => {
          logInfo("generateThumbnail", "Started (500x500)");
          timeout = setTimeout(() => {
            reject(new Error("❌ Timeout tạo thumbnail"));
          }, 30000);
        })
        .on("end", () => {
          clearTimeout(timeout);
          
          if (!fs.existsSync(outputPath)) {
            cleanup(Buffer.isBuffer(videoInput) ? inputPath : null);
            return reject(new Error("❌ Không tạo được thumbnail"));
          }

          try {
            const thumbBuffer = fs.readFileSync(outputPath);
            const stats = fs.statSync(outputPath);
            const sizeKB = stats.size / 1024;
            
            cleanup(outputPath, Buffer.isBuffer(videoInput) ? inputPath : null);
            
            logSuccess("generateThumbnail", `Output: ${sizeKB.toFixed(1)}KB`);
            resolve(thumbBuffer);
          } catch (e) {
            cleanup(outputPath, Buffer.isBuffer(videoInput) ? inputPath : null);
            reject(new Error("❌ Lỗi đọc thumbnail: " + e.message));
          }
        })
        .on("error", (err) => {
          clearTimeout(timeout);
          cleanup(outputPath, Buffer.isBuffer(videoInput) ? inputPath : null);
          reject(new Error("❌ Lỗi tạo thumbnail: " + err.message));
        });
    });
  });
};

module.exports = {
  processVideoBuffer,
  generateThumbnail,
};