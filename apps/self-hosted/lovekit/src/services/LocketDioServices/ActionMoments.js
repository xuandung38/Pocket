import api from "@/lib/axios";

/**
 * Fetch moments from BE.
 *
 * BE `/locket/getMomentV2` body: { friendId, limit, syncToken }
 * BE response:                   { data: Moment[], syncToken: string|null, success, message }
 *
 * Returns { items, syncToken }:
 *   - items: array of moments (never undefined; empty array if none)
 *   - syncToken: nextPageToken to pass back on next call; null = no more pages
 *
 * Throws on network/HTTP errors so callers can distinguish "end-of-feed"
 * (syncToken=null in a successful response) from a real failure. The store's
 * try/catch handles errors without corrupting pagination state.
 */
export const GetAllMoments = async ({
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

export const GetInfoMoment = async (idMoment) => {
  try {
    const res = await api.post("/locket/getInfoMomentV2", {
      pageToken: null,
      idMoment,
      limit: null,
    });
    const moments = res.data.data;
    return moments;
  } catch (err) {
    console.warn("❌ React Failed", err);
    return { reactions: [] };
  }
};
