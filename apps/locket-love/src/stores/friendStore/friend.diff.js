// friend.diff.js
// Set-based diff used by the friend sync routine to figure out which UIDs are
// new (need fetching) vs. removed (need pruning). Pure helper, no I/O.

/**
 * Compare a remote friend list against a cached one and return the delta.
 *
 * @param {{uid: string}[]} apiFriends  - remote list (source of truth)
 * @param {{uid: string}[]} cachedIds   - locally stored uids
 * @returns {{ newIds: object[], removedIds: object[] }}
 *   - newIds:     entries from `apiFriends` not yet in cache (need fetching)
 *   - removedIds: entries from `cachedIds` no longer present remotely
 */
export const diffFriendIds = (apiFriends = [], cachedIds = []) => {
  const apiUidSet = new Set(apiFriends.map((f) => f.uid));
  const cachedUidSet = new Set(cachedIds.map((f) => f.uid));

  const newIds = apiFriends.filter((f) => !cachedUidSet.has(f.uid));
  const removedIds = cachedIds.filter((f) => !apiUidSet.has(f.uid));

  return { newIds, removedIds };
};
