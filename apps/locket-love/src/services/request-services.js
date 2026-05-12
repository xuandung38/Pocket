// request-services.js
// Friend-request flow HTTP layer for the locket-love UI.
//
// All friend-graph mutation endpoints (send/accept/deny/cancel) already live
// in `friend-services.js` and are consumed by `useFriendStoreV2`. This module
// surfaces them under lovekit-aligned names so the request-flow UI components
// (FindFriend / IncomingRequests / OutgoingRequest / NormalItemFriend) stay
// portable with the lovekit reference implementation.
//
// It also owns the one new endpoint the request flow needs that Phase 3 did
// not ship: `findFriendByUserName` — username search via /locket/getUserByData.

import { api } from "@/libs";
import {
  sendFriendRequest,
  sendCelebrityRequest,
  acceptFriendRequest,
  denyFriendRequest,
  cancelFriendRequest,
} from "./friend-services";

// NOTE: We intentionally do NOT re-export `getIncomingFriendRequests`,
// `getOutgoingFriendRequests`, or `sendCelebrityRequest` from here — they are
// already exported by `friend-services.js` and live in the `@/services`
// barrel. Re-exporting them through `export *` would create a duplicate-name
// collision that ESM resolves by silently hiding the binding.

// ---- lovekit-aligned aliases ---------------------------------------------
//
// Keeps the request-flow UI components 1:1 with `apps/self-hosted/lovekit`
// so future patches/ports stay mechanical. Underlying impl is `friend-services`.

/**
 * Send a friend request to a normal (non-celebrity) user.
 * Throws on transport error so callers can surface a toast.
 */
export const SendRequestToFriend = (uid) => sendFriendRequest(uid);

/**
 * Send a follow request to a celebrity user.
 * Different upstream endpoint envelope from the normal flow.
 */
export const SendRequestToCelebrity = (uid) => sendCelebrityRequest(uid);

/**
 * Accept an incoming friend request. Returns the new friend's normalized
 * record on success, `null` on failure.
 */
export const AcceptRequestToFriend = (uid) => acceptFriendRequest(uid);

/**
 * Deny an incoming friend request. Returns `true`/`false`.
 */
export const DenyRequestToFriend = (uid) => denyFriendRequest(uid);

/**
 * Cancel an outgoing friend request (withdraw the invite you sent).
 * Returns `true`/`false`.
 */
export const CancelRequestToFriend = (uid) => cancelFriendRequest(uid);

// ---- Username search ------------------------------------------------------

/**
 * Find a user by exact username/phone. Backend route: POST /locket/getUserByData
 * with `{ username }`. Returns the raw `{ success, data }` envelope so the
 * caller can branch on `result.success`. Throws on network failure.
 *
 * The returned `data` carries the same shape used by NormalItemFriend, so the
 * UI can read `data.friendship_status`, `data.profile_picture_url`, etc.
 */
export const findFriendByUserName = async (username) => {
  if (!username) return { success: false, data: null };
  try {
    const res = await api.post("/locket/getUserByData", { username });
    return res?.data ?? { success: false, data: null };
  } catch (err) {
    console.error("[request-services] findFriendByUserName failed:", err);
    throw err;
  }
};
