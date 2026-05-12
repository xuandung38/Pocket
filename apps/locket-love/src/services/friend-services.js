// friend.services.js
// Friend graph HTTP layer — wraps the self-hosted backend's /locket/* friend endpoints.
//
// Phase 3 surface (consumed by useFriendStoreV2):
//   - getFriends()                  → friend graph (uid + minimal relation map)
//   - getIncomingFriendRequests()   → incoming pending requests
//   - getOutgoingFriendRequests()   → outgoing pending requests
//   - acceptFriendRequest(uid)      → accept an incoming request, returns new friend
//   - denyFriendRequest(uid)        → reject incoming request
//   - cancelFriendRequest(uid)      → withdraw an outgoing request
//   - removeFriend(uid)             → unfriend
//
// Lower-level helpers (used by sync logic + Phase 7 UI):
//   - sendFriendRequest(uid)        → invite a normal user
//   - toggleHiddenFriend(uid)       → soft-hide a friend without removing
//   - fetchUserDetails(uidList)     → batch-fetch normalized user objects
//
// All requests go through the authenticated `api` client (auto-refresh built in).

import { api } from "@/libs";

// ---- Internal normalization helpers (kept inline to avoid extra modules) ----

// Firebase Storage URLs are rewritten to the Locket CDN for faster cold-loads.
function rewriteAvatarUrl(url) {
  if (!url) return "";
  return url.replace(
    "https://firebasestorage.googleapis.com",
    "https://cdn.locketcamera.com",
  );
}

// Convert a raw `/fetchUserV2` payload into the shape the UI/store expects.
// `friend` may be either the inner data object or a `result.data` envelope.
function normalizeFriend(friend) {
  if (!friend) return null;
  const data = friend.result?.data ?? friend.data ?? friend;
  if (!data?.uid) return null;
  return {
    uid: data.uid,
    firstName: data.first_name ?? "",
    lastName: data.last_name ?? "",
    username: data.username ?? "",
    profilePic: data.profile_picture_url
      ? rewriteAvatarUrl(data.profile_picture_url)
      : null,
    badge: data.badge ?? null,
    isTemp: Boolean(data.temp),
    isCelebrity: Boolean(data.celebrity),
    friendshipStatus: data.friendship_status ?? null,
    celebrityData: data.celebrity_data ?? null,
  };
}

// Split a flat array into fixed-size chunks for batched API calls.
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ---- Friend list ----

/**
 * Returns the authenticated user's friend graph from the BE.
 * Shape: `[ { uid, createdAt, updatedAt, hidden, sharedHistoryOn, isCelebrity } ]`
 * Returns [] on transport failure (never null) so the store can render safely.
 */
export const getFriends = async () => {
  try {
    const res = await api.post("/locket/getAllFriendsV2");
    return res?.data?.data ?? [];
  } catch (err) {
    console.error("[friend.services] getFriends failed:", err);
    return [];
  }
};

/**
 * Batch-fetch detailed user records for a list of friend descriptors.
 * `friends` is the array returned from getFriends() — only `uid` is used.
 * Uses Promise.allSettled per batch so a single bad uid never aborts the rest.
 */
export const fetchUserDetails = async (friends) => {
  if (!friends?.length) return [];

  const batchSize = 20;
  const results = [];
  const batches = chunk(friends, batchSize);

  for (const batch of batches) {
    const settled = await Promise.allSettled(
      batch.map((f) =>
        api
          .post("/locket/proxy/fetchUserV2", { data: { user_uid: f?.uid } })
          .then((res) => normalizeFriend(res.data)),
      ),
    );
    for (const r of settled) {
      if (r.status === "fulfilled" && r.value) results.push(r.value);
    }
    // Throttle between batches to avoid spamming the proxy.
    if (batch !== batches[batches.length - 1]) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  return results;
};

/**
 * Fetch a single user's normalized record by uid.
 */
export const fetchFriendById = async (uid) => {
  if (!uid) return null;
  try {
    const res = await api.post("/locket/proxy/fetchUserV2", {
      data: { user_uid: uid },
    });
    return normalizeFriend(res?.data);
  } catch (err) {
    console.error("[friend.services] fetchFriendById failed:", err);
    return null;
  }
};

// ---- Friend requests ----

/**
 * Incoming friend requests (people who want to befriend the current user).
 * Returns `{ uid, createdAt }[]` for store consumption.
 */
export const getIncomingFriendRequests = async (
  pageToken = null,
  limit = 100,
) => {
  try {
    const res = await api.post("/locket/getIncomingFriendRequestsV2", {
      pageToken,
      limit,
    });
    const { success, data } = res.data ?? {};
    if (!success) return [];
    return (data ?? []).map((f) => ({ uid: f.uid, createdAt: f.date }));
  } catch (err) {
    console.error(
      "[friend.services] getIncomingFriendRequests failed:",
      err,
    );
    return [];
  }
};

/**
 * Outgoing friend requests (people the current user has invited).
 * Note: BE returns `to` (target uid) not `uid` — normalize to `uid` for consistency.
 */
export const getOutgoingFriendRequests = async (
  pageToken = null,
  limit = 100,
) => {
  try {
    const res = await api.post("/locket/getOutgoingFriendRequestsV2", {
      pageToken,
      limit,
    });
    const { success, data } = res.data ?? {};
    if (!success) return [];
    return (data ?? []).map((f) => ({ uid: f.to, createdAt: f.date }));
  } catch (err) {
    console.error(
      "[friend.services] getOutgoingFriendRequests failed:",
      err,
    );
    return [];
  }
};

/**
 * Send a friend request to a normal (non-celebrity) user. Throws on network
 * failure so callers can show the right toast.
 */
export const sendFriendRequest = async (uid) => {
  if (!uid) throw new Error("uid is required");
  const res = await api.post("/locket/proxy/sendFriendRequestV2", {
    data: { user_uid: uid },
  });
  return res?.data?.result?.data ?? null;
};

/**
 * Send a celebrity follow-request (different upstream endpoint envelope).
 */
export const sendCelebrityRequest = async (uid) => {
  if (!uid) throw new Error("uid is required");
  const res = await api.post("/locket/sendCelebrityRequestV2", {
    friendUid: uid,
  });
  return res?.data ?? null;
};

/**
 * Accept an incoming friend request. On success, fetches the new friend's
 * normalized record so the store can splice them into `friends` immediately.
 * Returns `null` on failure so the caller can keep UI state consistent.
 */
export const acceptFriendRequest = async (uid) => {
  if (!uid) return null;
  try {
    const res = await api.post("/locket/proxy/acceptFriendRequest", {
      data: { user_uid: uid },
    });
    const acceptedUid = res?.data?.result?.data?.user_uid || uid;
    if (!acceptedUid) return null;
    return await fetchFriendById(acceptedUid);
  } catch (err) {
    console.error(
      "[friend.services] acceptFriendRequest failed:",
      err?.response?.data || err?.message,
    );
    return null;
  }
};

/**
 * Reject an incoming friend request.
 */
export const denyFriendRequest = async (uid) => {
  if (!uid) return false;
  try {
    await api.post("/locket/proxy/deleteFriendRequest", {
      data: { user_uid: uid, direction: "incoming" },
    });
    return true;
  } catch (err) {
    console.error("[friend.services] denyFriendRequest failed:", err?.message);
    return false;
  }
};

/**
 * Withdraw an outgoing friend request (i.e. cancel an invite you sent).
 * Uses the same backend endpoint as deny with `direction=outgoing`.
 */
export const cancelFriendRequest = async (uid) => {
  if (!uid) return false;
  try {
    await api.post("/locket/proxy/deleteFriendRequest", {
      data: { user_uid: uid, direction: "outgoing" },
    });
    return true;
  } catch (err) {
    console.error(
      "[friend.services] cancelFriendRequest failed:",
      err?.message,
    );
    return false;
  }
};

/**
 * Bulk-reject incoming/outgoing requests with built-in throttling.
 * Returns counts so callers can show progress toasts.
 */
export const rejectFriendRequestsBulk = async (
  uidList,
  direction = "incoming",
  batchSize = 50,
) => {
  const result = { successCount: 0, successUidList: [], total: uidList.length };
  try {
    for (const batch of chunk(uidList, batchSize)) {
      const settled = await Promise.allSettled(
        batch.map((uid) =>
          api
            .post("/locket/proxy/deleteFriendRequest", {
              data: { user_uid: uid, direction },
            })
            .then(() => uid),
        ),
      );
      for (const r of settled) {
        if (r.status === "fulfilled") {
          result.successCount += 1;
          result.successUidList.push(r.value);
        }
      }
      // Throttle to avoid backend rate limits on huge lists.
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } catch (err) {
    console.error(
      "[friend.services] rejectFriendRequestsBulk failed:",
      err?.message,
    );
  }
  return result;
};

// ---- Friend mutation ----

/**
 * Permanently remove a friend. Throws so callers can show a confirmation toast.
 */
export const removeFriend = async (uid) => {
  if (!uid) throw new Error("uid is required");
  const res = await api.post("/locket/proxy/removeFriend", {
    data: { user_uid: uid },
  });
  return res?.data?.result?.data?.user_uid ?? null;
};

/**
 * Toggle the per-friend "hidden" flag (mutes their moments without unfriending).
 * Returns { success, uid } for store-side reconciliation.
 */
export const toggleHiddenFriend = async (uid) => {
  if (!uid) return { success: false, uid };
  try {
    const res = await api.post("/locket/proxy/toggleFriendHidden", {
      data: { user_uid: uid },
    });
    return { success: res.status === 200, uid };
  } catch (err) {
    console.error(
      "[friend.services] toggleHiddenFriend failed:",
      err?.message,
    );
    return { success: false, uid };
  }
};
