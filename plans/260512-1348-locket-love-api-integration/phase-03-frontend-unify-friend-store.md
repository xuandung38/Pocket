# Phase 03 — Frontend: Unify on `useFriendStoreV2` (Delete V1 Store)

**Owner:** dev-3 · **Effort:** 1.5h · **Status:** pending · **Blocks:** 09

## Context Links
- Plan: `plan.md`
- V1 store (delete): `apps/self-hosted/lovekit/src/stores/useFriendStore.js`
- V2 store (keep): `apps/self-hosted/lovekit/src/stores/friendStore/index.js`
- V1 consumers (rewire): `apps/self-hosted/lovekit/src/screens/FeedScreen.jsx:11-12`, `apps/self-hosted/lovekit/src/screens/ProfileScreen.jsx:11`
- Stores barrel: `apps/self-hosted/lovekit/src/stores/index.js:5,12`

## Overview
**Priority:** P1 · **Status:** pending
Two friend stores coexist with different shapes. Each screen reads from a different one,
so friends loaded by Camera/Messages don't appear in Feed/Profile (and vice versa).
Source-of-truth: `useFriendStoreV2` (already used by Camera, Messages, FriendsSheet, FriendMomentRow).

## Key Insights
| Field on V1 (`useFriendStore`) | Equivalent on V2 (`useFriendStoreV2`) |
|---|---|
| `friendDetails: Friend[]` | `friendList: Friend[]` |
| `loading` | `loading` |
| `loadFriends()` | `loadFriends()` |
| `clearFriends()` | `clearFriends()` |
| `addFriend(f)` | `addFriendLocal(f)` |
| (no map) | `friendDetailsMap: { [uid]: Friend }` |
| (no relations) | `friendRelationsMap: { [uid]: { hidden, isCelebrity, ... } }` |

V2 is a strict superset → no functional loss in cutover.

`useFriendStoreV2` already normalizes via the cache layer; `normalizeFriend` helper in V1
must be ported to V2 if rendered fields drift (verify in `FriendListItem`).

## Requirements
**Functional**
- `FeedScreen` & `ProfileScreen` render same friend list as Camera/Messages
- No console errors on mount
- `ProfileScreen` rollcall filter (`f.rollcall_pending`) still works

**Non-functional**
- Net store count drops by one
- No dead imports left

## Architecture
```
Before:
LoadFriends() in V1 ──IndexedDB── V1 store ── FeedScreen, ProfileScreen
LoadFriends() in V2 ──IndexedDB── V2 store ── Camera, Messages, FriendsSheet, FriendMomentRow

After:
LoadFriends() in V2 ──IndexedDB── V2 store ── ALL CONSUMERS
```

## Related Code Files
**Modify**
- `apps/self-hosted/lovekit/src/stores/index.js` — drop `export * from "./useFriendStore"`
- `apps/self-hosted/lovekit/src/screens/FeedScreen.jsx` — switch import + use `friendList` and `friendDetailsMap`
- `apps/self-hosted/lovekit/src/screens/ProfileScreen.jsx` — switch import + use `friendList`

**Delete**
- `apps/self-hosted/lovekit/src/stores/useFriendStore.js`

**Read (no edit)**
- `apps/self-hosted/lovekit/src/components/FriendListItem.jsx` — confirm reads `firstName`, `lastName`, `profilePic`, `rollcall_pending`
- `apps/self-hosted/lovekit/src/utils/SyncData/friendSyncUtils.js` — only used by V1 store; can remain orphaned (deleted in cleanup pass)

## Implementation Steps
1. **FeedScreen.jsx** (lines 9-13, 126-127):
   ```js
   import { useAuthStore, useMomentsStoreV2 } from "@/stores";
   import { useFriendStoreV2 } from "@/stores/friendStore";
   ...
   const friends = useFriendStoreV2((s) => s.friendList);
   const loadFriends = useFriendStoreV2((s) => s.loadFriends);
   ```
   `friendMap` block (lines 138-144) can be replaced with:
   ```js
   const friendMap = useFriendStoreV2((s) => s.friendDetailsMap);
   ```
   (drop the `useMemo`).
2. **ProfileScreen.jsx** (line 11, 24-26):
   ```js
   import { useFriendStoreV2 } from "@/stores/friendStore";
   ...
   const friends = useFriendStoreV2((s) => s.friendList);
   const friendsLoading = useFriendStoreV2((s) => s.loading);
   const loadFriends = useFriendStoreV2((s) => s.loadFriends);
   ```
3. **stores/index.js**: remove `export * from "./useFriendStore";` (line 5)
4. **Delete** `stores/useFriendStore.js`
5. Run `pnpm dev` — verify no compile errors
6. Smoke test: log in → check Camera bottom row, Feed avatars, Profile list, Messages friend names — all populated

## Todo List
- [ ] Update FeedScreen imports + selector
- [ ] Update ProfileScreen imports + selector
- [ ] Remove V1 export from stores/index.js
- [ ] Delete `stores/useFriendStore.js`
- [ ] Verify dev build compiles
- [ ] Visual smoke on all 4 screens

## Success Criteria
- Single friend store powers all screens
- Friend names + avatars consistent across Feed, Profile, Messages, Camera
- No "Cannot read property 'firstName' of undefined" in console

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `friendDetailsMap` undefined on first paint | Med | Med | Selector returns `{}` default; consumers tolerate empty |
| `rollcall_pending` not on V2 friend shape | Low | Low | Check `friendsDB` cache shape; if missing, V2 sync needs to preserve it |
| Other consumers of V1 missed | Med | Med | `grep -rn "useFriendStore[^V]" lovekit/src` — scan full tree before deletion |

## Security Considerations
- None — pure refactor

## Next Steps
- Phase 09 (FeedScreen pagination) blocked on this phase to avoid merge conflict
- Phase 06 (OptionMoment store key uses friendUid) benefits from unified map
