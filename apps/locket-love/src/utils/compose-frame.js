/**
 * compose-frame.js
 *
 * Client-side canvas compositing: bake a frame spec into a photo Blob/File
 * and return a new File ready for upload via storage-services.
 *
 * All rendering is pure browser APIs (Canvas 2D) — no server round-trips,
 * no new npm dependencies.
 *
 * API:
 *   composeFrame(photoBlob, frameSpec) → Promise<File>
 *
 * frameSpec shapes:
 *   { type: "none" }
 *   { type: "png",      url: string }               // PNG overlay from R2
 *   { type: "polaroid", date?: string, caption?: string }
 */

/** Output canvas resolution used for all composited frames. */
const CANVAS_SIZE = 1080;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Load any URL or Blob into an HTMLImageElement using `decode()` for a
 * reliable "image ready to draw" guarantee before the caller touches canvas.
 *
 * @param {string | Blob} srcOrBlob
 * @param {{ crossOrigin?: string }} [opts]
 * @returns {Promise<HTMLImageElement>}
 */
async function loadImage(srcOrBlob, { crossOrigin } = {}) {
  const isBlob = srcOrBlob instanceof Blob;
  const url = isBlob ? URL.createObjectURL(srcOrBlob) : srcOrBlob;

  const img = new Image();
  // crossOrigin MUST be set before .src to prevent canvas taint on early
  // browsers that check the attribute at request time.
  if (crossOrigin) img.crossOrigin = crossOrigin;
  img.src = url;

  try {
    // decode() rejects immediately on network/decode error (no hung promises).
    await img.decode();
  } finally {
    // Always revoke object URLs we created to avoid memory leaks.
    if (isBlob) URL.revokeObjectURL(url);
  }
  return img;
}

/**
 * Draw an image into a destination rect using CSS `cover` behavior:
 * scale up/down uniformly until the image fills (w × h), then center-crop.
 * Clips to the rect so no overflow bleeds outside.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement} img
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 */
function drawCover(ctx, img, x, y, w, h) {
  const natW = img.naturalWidth || img.width;
  const natH = img.naturalHeight || img.height;
  if (!natW || !natH) return; // guard against zero-size images

  // Cover = use the larger scale so both dimensions fill.
  const scale = Math.max(w / natW, h / natH);
  const scaledW = natW * scale;
  const scaledH = natH * scale;

  // Center the scaled image inside the target rect.
  const offsetX = x + (w - scaledW) / 2;
  const offsetY = y + (h - scaledH) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, offsetX, offsetY, scaledW, scaledH);
  ctx.restore();
}

/**
 * Promise wrapper for `canvas.toBlob` (which uses a callback).
 *
 * @param {HTMLCanvasElement} canvas
 * @param {string} mimeType
 * @param {number} quality   0.0–1.0
 * @returns {Promise<Blob>}
 */
function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("canvas.toBlob returned null — canvas may be tainted or too large"));
      },
      mimeType,
      quality,
    );
  });
}

/**
 * Derive a stable output filename for the composited image.
 * Preserves the original base-name and always appends "_framed.jpg"
 * so the backend can infer the JPEG extension correctly.
 *
 * @param {Blob | File} photoBlob
 * @returns {string}
 */
function outputFileName(photoBlob) {
  if (photoBlob instanceof File && photoBlob.name) {
    // Strip existing extension then re-append.
    const base = photoBlob.name.replace(/\.[^.]+$/, "");
    return `${base}_framed.jpg`;
  }
  return `framed_${Date.now()}.jpg`;
}

/**
 * Truncate `text` so it fits within `maxWidth` canvas pixels (at the current
 * ctx font), appending "…" when a cut is made. Returns original text unchanged
 * if it already fits.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} maxWidth  in canvas pixels
 * @returns {string}
 */
function truncateText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + "…").width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "…";
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Bake `frameSpec` into `photoBlob` on a client-side canvas and return the
 * composited image as a new `File` (JPEG) uploadable via storage-services.
 *
 * On `type: "none"` the original blob/File is returned unchanged (no quality
 * loss from a re-encode).
 *
 * On frame-image load failure (404, CORS taint, network error) a descriptive
 * Error is thrown so the caller can show a toast and fall back to posting the
 * original photo without a frame.
 *
 * @param {Blob | File} photoBlob
 * @param {{ type: "none" }
 *        | { type: "png",      url: string }
 *        | { type: "polaroid", date?: string, caption?: string }} frameSpec
 * @returns {Promise<File>}
 */
export async function composeFrame(photoBlob, frameSpec) {
  if (!photoBlob) throw new Error("composeFrame: photoBlob is required");
  if (!frameSpec?.type) throw new Error("composeFrame: frameSpec.type is required");

  // ------------------------------------------------------------------
  // none — no-op, preserve original quality
  // ------------------------------------------------------------------
  if (frameSpec.type === "none") {
    if (photoBlob instanceof File) return photoBlob;
    // Wrap a bare Blob so the caller always receives a File.
    return new File([photoBlob], outputFileName(photoBlob), { type: photoBlob.type });
  }

  // ------------------------------------------------------------------
  // png — load photo + frame in parallel, overlay frame on top
  // ------------------------------------------------------------------
  if (frameSpec.type === "png") {
    const { url } = frameSpec;
    if (!url) throw new Error("composeFrame: frameSpec.url is required for type=png");

    // Load both in parallel; fail fast if either fails.
    const [photo, frame] = await Promise.all([
      loadImage(photoBlob),
      // Frame PNGs come from Cloudflare R2 with CORS GET *; crossOrigin is
      // mandatory so toBlob doesn't throw "canvas tainted by cross-origin data".
      loadImage(url, { crossOrigin: "anonymous" }).catch((err) => {
        throw new Error(
          `composeFrame: failed to load frame image "${url}" — ${err.message}`,
        );
      }),
    ]);

    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext("2d");

    // Photo: cover-fit the full 1080² square (center-crop, no letterbox).
    drawCover(ctx, photo, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Frame PNG: stretch to fill the full square — frame assets are designed 1:1.
    ctx.drawImage(frame, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const blob = await canvasToBlob(canvas, "image/jpeg", 0.9);
    return new File([blob], outputFileName(photoBlob), { type: blob.type });
  }

  // ------------------------------------------------------------------
  // polaroid — white border + inset photo + date/caption text strip
  // ------------------------------------------------------------------
  if (frameSpec.type === "polaroid") {
    const { date = "", caption = "" } = frameSpec;

    const photo = await loadImage(photoBlob);

    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext("2d");

    // Polaroid white background (the border).
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Photo inset: thin 48px border on top/sides; thick bottom strip for text.
    // Geometry: photo occupies x=48,y=48,w=984,h=804 → bottom edge at y=852.
    // Bottom white strip: 1080-852 = 228px total (includes 48px visual padding +
    // ~180px text area), matching the Polaroid aesthetic.
    const photoX = 48;
    const photoY = 48;
    const photoW = 984;
    const photoH = 804;
    drawCover(ctx, photo, photoX, photoY, photoW, photoH);

    // Wait for document fonts so custom typefaces render correctly in text.
    await document.fonts.ready;

    // Text: centered horizontally in the bottom white strip.
    const stripTop = photoY + photoH; // 852
    const stripH = CANVAS_SIZE - stripTop; // 228
    const centerX = CANVAS_SIZE / 2;

    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (date && caption) {
      // Two-line layout: date (smaller) above caption (larger).
      ctx.font = "500 30px sans-serif";
      ctx.fillText(date, centerX, stripTop + stripH * 0.33); // date stays as-is
      ctx.font = "600 38px sans-serif";
      // Truncate caption so it cannot overflow the 1080² canvas (max ~900px).
      ctx.fillText(truncateText(ctx, caption, 900), centerX, stripTop + stripH * 0.67);
    } else {
      // Single line centered in strip.
      const text = date || caption;
      if (text) {
        ctx.font = "500 34px sans-serif";
        // Truncate only user-supplied caption; dates are predictably short.
        const displayText = caption && !date ? truncateText(ctx, text, 900) : text;
        ctx.fillText(displayText, centerX, stripTop + stripH / 2);
      }
    }

    const blob = await canvasToBlob(canvas, "image/jpeg", 0.95);
    return new File([blob], outputFileName(photoBlob), { type: blob.type });
  }

  throw new Error(`composeFrame: unknown frameSpec.type "${frameSpec.type}"`);
}
