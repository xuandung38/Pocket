// moment.services.js
// Moment HTTP layer — wraps /locket/* moment endpoints.
//
// Read-path entry-point used by Phase 3 store + Phase 4 feed:
//   - getAllMoments({ friendId, limit, syncToken }) → { items, syncToken }
//
// Mutation helpers used by Phase 5/7 (reactions, delete):
//   - sendReactMoment, deleteMoment, markAsViewedMoment, getMomentViews
//
// All requests authenticated; pagination uses BE-provided `syncToken` cursor.

import { api } from "@/libs";
import { getToken } from "@/utils";

// Tiny UUID v4 generator — used by chat-from-moment payloads. Inlined to avoid
// pulling in a generator module for one call site.
function generateUUIDv4Upper() {
  const hex = "0123456789ABCDEF";
  let out = "";
  for (let i = 0; i < 32; i++) {
    if (i === 12) out += "4";
    else if (i === 16) out += hex[(Math.floor(Math.random() * 4) + 8)];
    else out += hex[Math.floor(Math.random() * 16)];
    if (i === 7 || i === 11 || i === 15 || i === 19) out += "-";
  }
  return out;
}

/**
 * Paginated moment feed fetch.
 *
 * BE: POST /locket/getMomentV2  body: { friendId, limit, syncToken }
 *     response: { data: Moment[], syncToken: string|null, success, message }
 *
 * Returns `{ items, syncToken }`:
 *   - items: array of moments (never undefined; [] when none)
 *   - syncToken: cursor for next page; `null` = end-of-feed
 *
 * Throws on transport/HTTP error so the store can distinguish "no more pages"
 * (syncToken=null in a successful response) from a real failure.
 */
export const getAllMoments = async ({
  friendId = null,
  limit = 60,
  syncToken = null,
} = {}) => {
  const res = await api.post("/locket/getMomentV2", {
    friendId,
    limit,
    syncToken,
  });
  return {
    items: res.data?.data ?? [],
    syncToken: res.data?.syncToken ?? null,
  };
};

/**
 * Fetch detailed info for a single moment (reactions, viewers, etc.).
 */
export const getInfoMoment = async (idMoment) => {
  if (!idMoment) return { reactions: [] };
  try {
    const res = await api.post("/locket/getInfoMomentV2", {
      pageToken: null,
      idMoment,
      limit: null,
    });
    return res.data?.data ?? { reactions: [] };
  } catch (err) {
    console.warn("[moment.services] getInfoMoment failed:", err?.message);
    return { reactions: [] };
  }
};

/**
 * Send a reaction emoji to a moment. `power` is the reaction intensity (0-3).
 */
export const sendReactMoment = async (emoji, momentId, power = 0) => {
  if (!momentId) return null;
  try {
    const { localId } = getToken() || {};
    const res = await api.post("/locket/proxy/reactToMoment", {
      data: {
        intensity: power,
        moment_uid: momentId,
        reaction: emoji || "💛",
        owner_uid: localId,
      },
    });
    return res.data;
  } catch (err) {
    console.warn("[moment.services] sendReactMoment failed:", err?.message);
    return null;
  }
};

/**
 * Fetch the viewer list for a moment.
 */
export const getMomentViews = async (momentId) => {
  if (!momentId) return null;
  try {
    const res = await api.post("/locket/proxy/getMomentViews", {
      data: { moment_uid: momentId },
    });
    return res.data?.result ?? null;
  } catch (err) {
    console.warn("[moment.services] getMomentViews failed:", err?.message);
    return null;
  }
};

/**
 * Mark a moment as viewed by the current user. Best-effort; failures swallowed.
 */
export const markAsViewedMoment = async (momentId) => {
  if (!momentId) return null;
  try {
    const res = await api.post("/locket/proxy/markMomentAsViewed", {
      data: { moment_uid: momentId, notify: false },
    });
    return res.data;
  } catch (err) {
    console.warn(
      "[moment.services] markAsViewedMoment failed:",
      err?.message,
    );
    return null;
  }
};

/**
 * Delete a moment. Caller must provide `ownerUid` so we know whether to delete
 * globally (own moment) or just hide from this user's feed (friend's moment).
 * Returns the deleted moment id on success, null otherwise.
 */
export const deleteMoment = async (momentId, ownerUid) => {
  if (!momentId) return null;
  try {
    const { localId } = getToken() || {};
    const owner = ownerUid ?? localId;
    const deleteGlobally = owner === localId;

    const res = await api.post("/locket/proxy/deleteMomentV2", {
      data: {
        moment_uid: momentId,
        owner_uid: owner,
        delete_globally: deleteGlobally,
      },
    });

    const ids = res?.data?.result?.data;
    return Array.isArray(ids) ? ids[0] : null;
  } catch (err) {
    console.warn("[moment.services] deleteMoment failed:", err?.message);
    return null;
  }
};

/**
 * Send a chat message replying to a moment. Used by feed → chat shortcuts.
 * Throws so caller can show a retry UI on failure.
 */
export const sendMessageMoment = async (message, momentId, receiverUid) => {
  const res = await api.post("/locket/proxy/sendChatMessageV2", {
    data: {
      msg: message || " ",
      analytics: {
        amplitude: {
          device_id: generateUUIDv4Upper(),
          session_id: -1,
        },
        google_analytics: {
          app_instance_id: "e88d4daed0ded172248753851bf67772",
        },
        android_version: "1.196.0",
        android_build: "406",
        platform: "android",
      },
      client_token: generateUUIDv4Upper(),
      moment_uid: momentId || null,
      receiver_uid: receiverUid,
    },
  });
  return res.data;
};
