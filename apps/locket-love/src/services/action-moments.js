// ActionMoments.js
// Thin wrappers around moment fetch endpoints in the BE's "dio" namespace.
//
// Exposes a stable `GetAllMoments` signature that matches the lovekit ABI so
// store / hook code can be ported verbatim. The underlying request is the
// same one used by moment.services.getAllMoments — kept separate to preserve
// the legacy import path expected by future phases.

import { api } from "@/libs";

/**
 * Paginated moment fetch.
 *
 * Accepts `uid` (when filtering to a specific user's moments) and either
 * `lastMomentId` (legacy cursor name) or `syncToken` (current BE field).
 * Both map to the same upstream `syncToken` request param — `syncToken`
 * wins when both are present.
 *
 * Returns `{ items, syncToken }`:
 *   - items: array of moments (never undefined; [] if BE returned none)
 *   - syncToken: next-page cursor; `null` signals end-of-feed
 *
 * Throws on network/HTTP errors so callers can distinguish "no more pages"
 * (syncToken=null in a successful response) from a real failure.
 */
export const GetAllMoments = async ({
  uid = null,
  friendId = null,
  lastMomentId = null,
  syncToken = null,
  limit = 60,
} = {}) => {
  // Prefer explicit syncToken, then legacy lastMomentId, then null.
  const cursor = syncToken ?? lastMomentId ?? null;
  // Prefer explicit friendId param, then uid (kept as alias for lovekit ABI).
  const target = friendId ?? uid ?? null;

  const res = await api.post("/locket/getMomentV2", {
    friendId: target,
    limit,
    syncToken: cursor,
  });

  return {
    items: res.data?.data ?? [],
    syncToken: res.data?.syncToken ?? null,
  };
};

/**
 * Fetch full metadata for a single moment (reactions, viewers, etc.).
 * Safe to call without auth-refresh interleaving; returns `{ reactions: [] }`
 * on failure so UI render paths can stay simple.
 */
export const GetInfoMoment = async (idMoment) => {
  if (!idMoment) return { reactions: [] };
  try {
    const res = await api.post("/locket/getInfoMomentV2", {
      pageToken: null,
      idMoment,
      limit: null,
    });
    return res.data?.data ?? { reactions: [] };
  } catch (err) {
    console.warn("[ActionMoments] GetInfoMoment failed:", err?.message);
    return { reactions: [] };
  }
};
