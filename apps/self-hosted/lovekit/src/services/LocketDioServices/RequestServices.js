import api from "@/lib/axios";

/**
 * Fetch incoming friend requests (people who want to befriend the current user).
 * Backed by self-hosted `/locket/getIncomingFriendRequestsV2`.
 */
export const getListRequestFriendV2 = async (pageToken = null, limit = 10) => {
  try {
    const res = await api.post("/locket/getIncomingFriendRequestsV2", {
      pageToken,
      limit,
    });

    const { success, message, data, nextPageToken } = res.data;

    if (!success) {
      return {
        friends: [],
        nextPageToken: null,
        errorMessage: message || "Lỗi khi lấy danh sách lời mời",
      };
    }

    const cleanedFriends = (data || []).map((friend) => ({
      uid: friend.uid,
      createdAt: friend.date,
    }));

    return {
      friends: cleanedFriends,
      nextPageToken: nextPageToken || null,
      errorMessage: null,
    };
  } catch (err) {
    console.error("❌ Lỗi khi gọi API getIncomingFriendRequestsV2:", err);

    const errorMessage =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err.message ||
      "Lỗi không xác định";

    return {
      friends: [],
      nextPageToken: null,
      errorMessage,
    };
  }
};

/**
 * Fetch outgoing friend requests (people the current user has invited).
 * Backed by self-hosted `/locket/getOutgoingFriendRequestsV2`.
 */
export const getOutgoingRequestFriend = async (
  pageToken = null,
  limit = 100,
) => {
  try {
    const res = await api.post("/locket/getOutgoingFriendRequestsV2", {
      pageToken,
      limit,
    });

    const { success, message, data, nextPageToken } = res.data;

    if (!success) {
      return {
        friends: [],
        nextPageToken: null,
        errorMessage: message || "Lỗi khi lấy danh sách lời mời",
      };
    }

    const cleanedFriends = (data || []).map((friend) => ({
      uid: friend.to,
      createdAt: friend.date,
    }));

    return {
      friends: cleanedFriends,
      nextPageToken: nextPageToken || null,
      errorMessage: null,
    };
  } catch (err) {
    console.error("❌ Lỗi khi gọi API getOutgoingFriendRequestsV2:", err);

    const errorMessage =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err.message ||
      "Lỗi không xác định";

    return {
      friends: [],
      nextPageToken: null,
      errorMessage,
    };
  }
};

/**
 * Send a friend request to a normal (non-celebrity) user.
 *
 * Flows through the generic Locket proxy whitelisted in
 * `apps/self-hosted/api/src/controllers/locket.controller.js` (Phase 01).
 *
 * IMPORTANT — request envelope:
 *   The upstream Locket API expects `{ data: { user_uid } }`, matching the
 *   shape used by acceptFriendRequest / removeFriend / deleteFriendRequest.
 *   Do NOT rename `user_uid` to `friendUid` — the proxy forwards the body
 *   verbatim and the wrong key results in a silent no-op upstream.
 */
export const SendRequestToFriend = async (uid) => {
  try {
    const body = { data: { user_uid: uid } };
    const response = await api.post(
      "/locket/proxy/sendFriendRequestV2",
      body,
    );
    return response.data?.result?.data;
  } catch (error) {
    console.error(
      "❌ Lỗi khi gửi lời mời kết bạn:",
      error?.response?.data || error.message,
    );
    throw error;
  }
};

/**
 * Send a follow-request to a celebrity user. Goes through the dedicated
 * `/locket/sendCelebrityRequestV2` endpoint (beta API) — celebrity flow
 * uses a different envelope from normal friend requests.
 */
export const SendRequestToCelebrity = async (uid) => {
  try {
    const response = await api.post("/locket/sendCelebrityRequestV2", {
      friendUid: uid,
    });
    return response?.data;
  } catch (error) {
    console.error(
      "❌ Lỗi khi gửi lời mời celebrity:",
      error?.response?.data || error.message,
    );
    throw error;
  }
};
