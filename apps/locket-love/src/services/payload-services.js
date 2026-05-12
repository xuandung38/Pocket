// payload-services.js
// Glue between the media upload and the moment-post endpoints.
//
// `createRequestPayloadV5` orchestrates:
//   1. Upload the file (init/finalize → Firebase, fallback R2).
//   2. Build a BE-compatible payload shape that the Locket "postMomentV2"
//      endpoint accepts, switching between the "direct" (image) and
//      "indirect" (video) variants based on the media kind.
//
// `postMoment` posts the assembled payload and returns the BE response. It is
// kept here (rather than in `action-moments.js`) because the upload+post pair
// is one logical send-moment unit owned by Phase 5.

import { api } from "@/libs";
import { getToken } from "@/utils";
import { SonnerWarning } from "@/components/ui/sonner-toast";
import { uploadFileViaInitFinalize } from "./storage-services";

// Decide who actually receives the moment. The BE only honours `recipients`
// when `audience === "selected"`. For "private" we send the user a copy of
// their own moment so it shows up in their solo feed.
function determineRecipients(audience, selectedRecipients, localId) {
  if (audience === "selected") return selectedRecipients || [];
  if (audience === "private") return localId ? [localId] : [];
  return []; // "all" / default → server fans out to friends
}

/**
 * Build the moment-post payload after pushing the media file to storage.
 *
 * @param {object} args
 * @param {File|Blob} args.mediaFile         - source media to upload
 * @param {"image"|"video"} [args.previewType="image"]
 * @param {string} [args.caption=""]         - free-text caption (in the message bubble)
 * @param {object} [args.overlayData]        - sticker / overlay fields
 * @param {"all"|"selected"|"private"} [args.audience="all"]
 * @param {string[]} [args.recipients=[]]    - friend uids when `audience === "selected"`
 * @returns {Promise<object|null>}           - payload ready to POST, or null on auth-fail
 */
export const createRequestPayloadV5 = async ({
  mediaFile,
  previewType = "image",
  caption = "",
  overlayData = {},
  audience = "all",
  recipients = [],
} = {}) => {
  if (!mediaFile) throw new Error("createRequestPayloadV5: mediaFile is required");

  const { localId } = getToken() || {};
  if (!localId) {
    SonnerWarning("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
    return null;
  }

  // Build the options blob — caption + any overlay fields the UI provided.
  const optionsData = {
    caption,
    overlay_id: overlayData.overlay_id ?? null,
    type: overlayData.type ?? "default",
    icon: overlayData.icon ?? "",
    text_color: overlayData.text_color ?? "#FFFFFF",
    color_top: overlayData.color_top ?? "rgba(0,0,0,0.45)",
    color_bottom: overlayData.color_bottom ?? "rgba(0,0,0,0.45)",
    audience,
    recipients: determineRecipients(audience, recipients, localId),
    music: overlayData?.music || "",
    ...(overlayData.weatherData && { payload: overlayData.weatherData }),
    ...(overlayData.payload && { payload: overlayData.payload }),
  };

  // Push the media to storage. Errors propagate so the caller can surface a
  // retry UI (the camera screen catches and shows a Sonner toast).
  const fileInfo = await uploadFileViaInitFinalize(
    mediaFile,
    previewType,
    localId,
  );

  const isVideo = String(previewType).toLowerCase() === "video";

  // BE accepts two media shapes:
  //   - direct (image)  : { imageUrl }                — server skips download
  //   - indirect (video): { url, path, name, size, … } — server downloads, transcodes, thumbnails
  const mediaInfo = isVideo
    ? {
        url: fileInfo.downloadURL,
        path: fileInfo.metadata.path,
        name: fileInfo.metadata.name,
        size: fileInfo.metadata.size,
        uploadedAt: fileInfo.metadata.uploadedAt,
        type: previewType,
      }
    : {
        imageUrl: fileInfo.downloadURL,
      };

  return {
    options: optionsData,
    model: "Version-UploadmediaV3.1",
    mediaInfo,
    contentType: previewType,
  };
};

/**
 * POST an assembled payload to the Locket moment endpoint.
 *
 * The timeout label below is informational only — axios itself has no
 * timeout configured here so resumable Firebase URLs can still resolve.
 *
 * @param {object} payload  - shape produced by `createRequestPayloadV5`
 * @returns {Promise<object>} BE response body
 */
export const postMoment = async (payload) => {
  if (!payload) throw new Error("postMoment: payload is required");

  const fileType = payload?.mediaInfo?.type || payload?.contentType || "image";
  const timeoutMs =
    fileType === "image" ? 10_000 : fileType === "video" ? 15_000 : 5_000;
  const warnTimer = setTimeout(() => {
    console.log(
      `[payload-services] postMoment slower than expected (>${timeoutMs}ms)`,
    );
  }, timeoutMs);

  try {
    const res = await api.post("/locket/postMomentV2", payload, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  } finally {
    clearTimeout(warnTimer);
  }
};
