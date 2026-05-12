// Compatibility shim for the frontend's existing R2-style presigned upload flow.
// The FE currently calls `POST /api/presignedV3` (R2 storage). The self-hosted
// backend doesn't have R2 — instead we resolve a Firebase resumable upload
// session and return its URLs in the same shape the FE expects.
//
// Shape:
//   { data: { url, publicURL, key, expiresIn } }
//
// - `url`        — Firebase resumable upload URL (FE PUTs file directly)
// - `publicURL`  — Firebase object metadata URL (later resolved to a real
//                   download URL via `/locket/finalizeUpload` or by the
//                   backend when posting the moment).
// - `key`        — original filename echoed back (FE bookkeeping).
// - `expiresIn`  — best-effort TTL (Firebase resumable tokens are short-lived).
//
// NOTE: This is a temporary compat layer until Phase 05 rewires the FE
// directly to `/locket/initUpload` + `/locket/finalizeUpload`.

const { initImageUploadSession } = require("../services/FirestorageService");

const PRESIGNED_TTL_SECONDS = 3600;

exports.presignedV3 = async (req, res, next) => {
  try {
    const { idToken, localId } = req.user || {};
    if (!idToken || !localId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { filename, contentType, type, size } = req.body || {};

    if (!size || typeof size !== "number") {
      return res.status(400).json({
        success: false,
        message: "Missing or invalid `size`",
      });
    }

    const { uploadUrl, getUrl } = await initImageUploadSession(
      localId,
      idToken,
      size,
      { contentType, type },
    );

    return res.status(200).json({
      data: {
        url: uploadUrl,
        publicURL: getUrl,
        key: filename || null,
        expiresIn: PRESIGNED_TTL_SECONDS,
      },
    });
  } catch (err) {
    return next(err);
  }
};
