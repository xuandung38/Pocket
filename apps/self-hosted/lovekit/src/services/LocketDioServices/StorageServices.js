import { CONFIG } from "@/config/webConfig";
import api from "@/lib/axios";

/**
 * Upload a file via Locket's Firebase-backed init/finalize flow.
 *
 * Flow:
 *   1. POST /locket/initUpload  → { uploadUrl, getUrl }
 *   2. PUT  uploadUrl           (browser uploads directly to Firebase Storage)
 *   3. POST /locket/finalizeUpload { getUrl } → { downloadUrl }
 *
 * This path keeps VPS bandwidth at zero for the file body (only metadata
 * crosses our backend). The caller decides whether to post the moment via
 * the BE "direct" path (image, using `mediaInfo.imageUrl`) or "indirect"
 * path (video, using `mediaInfo.url`+`path`+`type`+`size` so BE downloads
 * and processes/thumbnails).
 *
 * @param {File|Blob} file - source file (must have .size and ideally .type)
 * @param {"image"|"video"|string} previewType - dispatches BE bucket/folder/MIME
 * @param {string} [_localId] - unused, kept for signature parity with legacy uploader
 * @returns {Promise<{
 *   downloadURL: string,
 *   metadata: {
 *     name: string,
 *     size: number,
 *     type: string,
 *     uploadedAt: string,
 *     path: string,   // Firebase get URL — usable as mediaInfo.url for indirect path
 *     getUrl: string  // raw Firebase metadata endpoint
 *   }
 * }>}
 */
export const uploadFileViaInitFinalize = async (
  file,
  previewType = "image",
  _localId
) => {
  if (!file) throw new Error("No file provided");

  const safeType = String(previewType).toLowerCase();
  const isVideo = safeType === "video";

  // Pick a sensible content type: prefer the blob's, else default per kind.
  const contentType = file.type || (isVideo ? "video/mp4" : "image/webp");

  // 1) Ask backend for a Firebase resumable upload session
  const initRes = await api.post("/locket/initUpload", {
    fileSize: file.size,
    contentType,
    type: safeType,
  });

  const { uploadUrl, getUrl } = initRes?.data || {};
  if (!uploadUrl || !getUrl) {
    throw new Error("initUpload returned invalid payload");
  }

  // 2) PUT the file body directly to Firebase Storage (zero VPS bandwidth)
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error(`Firebase PUT failed: ${putRes.status} ${putRes.statusText}`);
  }

  // 3) Resolve the public download URL via Firebase metadata (token-signed)
  const finRes = await api.post("/locket/finalizeUpload", { getUrl });
  const downloadUrl = finRes?.data?.downloadUrl;
  if (!downloadUrl) {
    throw new Error("finalizeUpload did not return downloadUrl");
  }

  // Stable filename for logging / BE indirect path (server only inspects extension)
  const ext = isVideo ? "mp4" : "webp";
  const fileName =
    file.name || `locketdio_${Date.now()}_cli${CONFIG.app.clientVersion}.${ext}`;

  return {
    downloadURL: downloadUrl,
    metadata: {
      name: fileName,
      size: file.size,
      type: contentType,
      uploadedAt: new Date().toISOString(),
      path: getUrl,
      getUrl,
    },
  };
};

/**
 * Legacy R2 presigned-URL upload. Kept as a fallback for environments where
 * browser CORS blocks the direct Firebase PUT performed by
 * `uploadFileViaInitFinalize`. The shim `/api/presignedV3` added in Phase 02
 * returns a Firebase URL, so this path still works end-to-end on the
 * self-hosted backend.
 *
 * Prefer `uploadFileViaInitFinalize` for new code.
 */
export const uploadFileAndGetInfoR2 = async (
  file,
  previewType = "other",
  localId
) => {
  if (!file) throw new Error("No file provided");

  const safeType = previewType.toLowerCase(); // image / video / other
  const timestamp = Date.now();
  const extension = file.name?.split(".").pop() || (safeType === "video" ? "mp4" : "webp");

  const fileName = `locketdio_${timestamp}_${localId}_cli${CONFIG.app.clientVersion}.${extension}`;

  // === Bước 1: Gọi BE để lấy Presigned URL
  const res = await api.post(`${CONFIG.api.storage}/api/presignedV3`, {
    filename: fileName,
    contentType: file.type,
    type: safeType,
    size: file.size,
    uploadedAt: new Date().toISOString(),
  });

  const { url, publicURL, key } = res.data.data;

  // === Bước 2: Upload file qua presigned URL
  const uploadRes = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error("❌ Upload to R2 failed");
  }

  return {
    downloadURL: publicURL,
    metadata: {
      name: fileName,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      path: key,
    },
  };
};
