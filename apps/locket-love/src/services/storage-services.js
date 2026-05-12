// storage-services.js
// Media upload layer — two paths, both terminating in a publicly-reachable URL
// that the moment-post endpoint can reference.
//
// 1. `uploadFileViaInitFinalize` — preferred. The BE issues a Firebase resumable
//    upload session; the browser PUTs the file body directly to Firebase Storage
//    (zero VPS bandwidth on the body), then the BE turns the metadata URL into
//    a token-signed download URL via /locket/finalizeUpload.
//
// 2. `uploadFileAndGetInfoR2` — legacy fallback. Some environments (corporate
//    proxies, strict CORS) block the direct Firebase PUT. The presignedV3 shim
//    accepts file metadata and hands back a presigned URL that still routes to
//    the same Firebase bucket end-to-end on the self-hosted backend.
//
// Both helpers return the same envelope `{ downloadURL, metadata }` so
// `payload-services.createRequestPayloadV5` can stay agnostic about which path
// was taken.

import { CONFIG } from "@/config";
import { api } from "@/libs";

/**
 * Preferred upload path. Uses Locket's Firebase-backed init/finalize flow.
 *
 *   1. POST /locket/initUpload     → { uploadUrl, getUrl }
 *   2. PUT  uploadUrl              (browser → Firebase Storage)
 *   3. POST /locket/finalizeUpload → { downloadUrl }
 *
 * @param {File|Blob} file        - source media (must have `.size`; `.type` preferred)
 * @param {"image"|"video"|string} previewType - dispatches MIME + bucket folder
 * @param {string} [_localId]     - unused, kept for signature parity with legacy uploader
 * @returns {Promise<{
 *   downloadURL: string,
 *   metadata: {
 *     name: string,
 *     size: number,
 *     type: string,
 *     uploadedAt: string,
 *     path: string,
 *     getUrl: string,
 *   }
 * }>}
 */
export const uploadFileViaInitFinalize = async (
  file,
  previewType = "image",
  _localId,
) => {
  if (!file) throw new Error("No file provided");

  const safeType = String(previewType).toLowerCase();
  const isVideo = safeType === "video";

  // Prefer the blob's actual content-type. Falls back to a sensible default
  // per kind — Firebase rejects PUTs whose Content-Type header doesn't match
  // what the resumable session advertised at init time.
  const contentType = file.type || (isVideo ? "video/mp4" : "image/webp");

  // 1) Ask backend to mint a Firebase resumable-upload session.
  const initRes = await api.post("/locket/initUpload", {
    fileSize: file.size,
    contentType,
    type: safeType,
  });

  const { uploadUrl, getUrl } = initRes?.data || {};
  if (!uploadUrl || !getUrl) {
    throw new Error("initUpload returned invalid payload");
  }

  // 2) PUT the body directly to Firebase. We use `fetch` (not `api`) so the
  // auth interceptor doesn't try to attach our JWT to Firebase's CORS-strict
  // URL. The Firebase response is opaque — only the HTTP status matters.
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error(
      `Firebase PUT failed: ${putRes.status} ${putRes.statusText}`,
    );
  }

  // 3) Resolve the public download URL via Firebase metadata (token-signed).
  const finRes = await api.post("/locket/finalizeUpload", { getUrl });
  const downloadUrl = finRes?.data?.downloadUrl;
  if (!downloadUrl) {
    throw new Error("finalizeUpload did not return downloadUrl");
  }

  // Stable filename for logging / BE indirect path (server inspects extension).
  const ext = isVideo ? "mp4" : "webp";
  const fileName =
    file.name ||
    `locketlove_${Date.now()}_cli${CONFIG.app.clientVersion}.${ext}`;

  return {
    downloadURL: downloadUrl,
    metadata: {
      name: fileName,
      size: file.size,
      type: contentType,
      uploadedAt: new Date().toISOString(),
      // `path` doubles as `mediaInfo.url` for the BE "indirect" video path.
      path: getUrl,
      getUrl,
    },
  };
};

/**
 * Legacy R2 presigned-URL upload. Retained as a fallback for environments
 * where the browser cannot PUT directly to Firebase (typically CORS or
 * proxy interference). The self-hosted `/api/presignedV3` shim returns a
 * Firebase URL, so the end-to-end behaviour is identical to the init/finalize
 * flow — the only difference is who orchestrates the upload session.
 *
 * Prefer `uploadFileViaInitFinalize` for new code.
 *
 * @param {File|Blob} file
 * @param {"image"|"video"|"other"|string} previewType
 * @param {string} localId
 * @returns {Promise<{downloadURL: string, metadata: object}>}
 */
export const uploadFileAndGetInfoR2 = async (
  file,
  previewType = "other",
  localId,
) => {
  if (!file) throw new Error("No file provided");

  const safeType = String(previewType).toLowerCase();
  const timestamp = Date.now();
  const extension =
    file.name?.split(".").pop() || (safeType === "video" ? "mp4" : "webp");

  const fileName = `locketlove_${timestamp}_${localId || "anon"}_cli${CONFIG.app.clientVersion}.${extension}`;

  // Step 1 — BE returns a presigned PUT URL + public mirror URL.
  const res = await api.post(`${CONFIG.api.storage}/api/presignedV3`, {
    filename: fileName,
    contentType: file.type,
    type: safeType,
    size: file.size,
    uploadedAt: new Date().toISOString(),
  });

  const { url, publicURL, key } = res.data?.data || {};
  if (!url || !publicURL) {
    throw new Error("presignedV3 returned invalid payload");
  }

  // Step 2 — upload to storage. Same caveat as Firebase PUT: skip our axios
  // instance to keep auth headers off the third-party endpoint.
  const uploadRes = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error(
      `R2 PUT failed: ${uploadRes.status} ${uploadRes.statusText}`,
    );
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
