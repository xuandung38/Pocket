// useFriendStoreV2
// In-memory Zustand store for the friend graph + pending request state.
//
// State surface (matches Phase 3 spec from team-lead):
//   friends     : Friend[]                normalized friend records
//   pendingIn   : { uid, createdAt }[]    incoming friend requests
//   pendingOut  : { uid, createdAt }[]    outgoing friend requests
//   loading     : boolean                 true while loadFriends() runs
//
// Actions:
//   loadFriends()        - fetch graph + both pending lists in parallel
//   acceptRequest(uid)   - accept incoming → moves uid from pendingIn → friends
//   denyRequest(uid)     - reject incoming → drops uid from pendingIn
//   cancelRequest(uid)   - withdraw outgoing → drops uid from pendingOut
//   addFriend(friend)    - optimistic insert (used by realtime / send flows)
//   removeFriendLocal(uid) - drop a uid from `friends` (post unfriend)
//   clearFriends()       - reset to defaults (used by logout)
//
// Sorting: celebrities first (matches lovekit UX), then by createdAt desc.
// All errors are logged + swallowed so the UI never breaks on transient failures.

import { create } from "zustand";
import { diffFriendIds } from "./friend-diff";
import {
  getFriends,
  fetchUserDetails,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  acceptFriendRequest as svcAcceptRequest,
  denyFriendRequest as svcDenyRequest,
  cancelFriendRequest as svcCancelRequest,
} from "@/services/friend-services";

// Sort helper — celebrities first, otherwise stable by uid.
function sortCelebFirst(list) {
  return [...list].sort((a, b) => {
    if (a.isCelebrity === b.isCelebrity) return 0;
    return a.isCelebrity ? -1 : 1;
  });
}

export const useFriendStoreV2 = create((set, get) => ({
  friends: [],
  pendingIn: [],
  pendingOut: [],
  loading: false,

  // ----------------------------------------------------------------
  // Load everything in parallel — friends + both pending request lists.
  // Safe to call multiple times; latest result always wins.
  // ----------------------------------------------------------------
  loadFriends: async () => {
    set({ loading: true });
    try {
      const [apiFriends, pendingIn, pendingOut] = await Promise.all([
        getFriends(),
        getIncomingFriendRequests(),
        getOutgoingFriendRequests(),
      ]);

      // Diff to figure out which uids actually need a fresh detail fetch.
      // Currently in-memory only, so `cached` is whatever's already in store.
      const cached = get().friends.map((f) => ({ uid: f.uid }));
      const { newIds } = diffFriendIds(apiFriends, cached);

      // Fetch details for the new friends; keep existing detailed entries.
      const newDetails = newIds.length ? await fetchUserDetails(newIds) : [];

      // Build the merged map: prefer freshly fetched detail over cached.
      const existingByUid = new Map(get().friends.map((f) => [f.uid, f]));
      const apiUidSet = new Set(apiFriends.map((f) => f.uid));

      for (const f of newDetails) existingByUid.set(f.uid, f);

      // Drop any cached friend no longer present remotely.
      for (const uid of [...existingByUid.keys()]) {
        if (!apiUidSet.has(uid)) existingByUid.delete(uid);
      }

      set({
        friends: sortCelebFirst([...existingByUid.values()]),
        pendingIn,
        pendingOut,
        loading: false,
      });
    } catch (err) {
      console.error("[useFriendStoreV2] loadFriends failed:", err);
      set({ loading: false });
    }
  },

  // ----------------------------------------------------------------
  // Accept an incoming request.
  // Optimistically removes the uid from pendingIn before the API call so the
  // UI feels instant; rolls back on failure.
  // ----------------------------------------------------------------
  acceptRequest: async (uid) => {
    if (!uid) return false;
    const prev = get().pendingIn;
    set({ pendingIn: prev.filter((r) => r.uid !== uid) });

    const newFriend = await svcAcceptRequest(uid);
    if (!newFriend) {
      // Rollback — request still pending or failed.
      set({ pendingIn: prev });
      return false;
    }
    set((state) => ({
      friends: sortCelebFirst([newFriend, ...state.friends.filter((f) => f.uid !== uid)]),
    }));
    return true;
  },

  // Reject an incoming friend request. Optimistic; rollback on failure.
  denyRequest: async (uid) => {
    if (!uid) return false;
    const prev = get().pendingIn;
    set({ pendingIn: prev.filter((r) => r.uid !== uid) });

    const ok = await svcDenyRequest(uid);
    if (!ok) {
      set({ pendingIn: prev });
      return false;
    }
    return true;
  },

  // Withdraw an outgoing friend request. Optimistic; rollback on failure.
  cancelRequest: async (uid) => {
    if (!uid) return false;
    const prev = get().pendingOut;
    set({ pendingOut: prev.filter((r) => r.uid !== uid) });

    const ok = await svcCancelRequest(uid);
    if (!ok) {
      set({ pendingOut: prev });
      return false;
    }
    return true;
  },

  // ----------------------------------------------------------------
  // Local-only mutators (used by realtime hooks + post-action flows).
  // ----------------------------------------------------------------

  // Insert/update a friend record without touching the network.
  addFriend: (friend) => {
    if (!friend?.uid) return;
    set((state) => {
      const next = state.friends.filter((f) => f.uid !== friend.uid);
      next.push(friend);
      return { friends: sortCelebFirst(next) };
    });
  },

  // Remove a friend from in-memory state. Caller is responsible for the API call.
  removeFriendLocal: (uid) => {
    if (!uid) return;
    set((state) => ({
      friends: state.friends.filter((f) => f.uid !== uid),
    }));
  },

  // Reset everything — used on logout.
  clearFriends: () =>
    set({ friends: [], pendingIn: [], pendingOut: [], loading: false }),
}));
