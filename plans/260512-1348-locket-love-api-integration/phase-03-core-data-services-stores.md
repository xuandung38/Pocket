---
phase: 3
title: "Core data services + stores"
status: pending
priority: P1
effort: "6h"
dependencies: [2]
---

# Phase 3: Core data services + stores

## Overview
Wire up the four data domains the UI depends on: **Friends**, **Profile**, **Moments (read)**, and **Notifications**. Copy the matching services from `apps/main`, build slim Zustand stores around them, expose hooks (`useFriends`, `useProfile`, `useMoments`, `useNotifications`) for screen components.

## Requirements
**Functional:**
- `useFriends()` returns the current user's friend list with `{ id, name, avatar, status }`
- `useProfile()` returns the logged-in user's profile + edit mutators (saveName, saveBirthday, saveEmail, saveAvatar)
- `useMoments({ audience, date })` returns the filtered feed (already used by FeedScreen)
- `useNotifications()` exposes the toggles persisted server-side
- All stores hydrate from cache (Dexie/IndexedDB) on mount, then sync with server in background

**Non-functional:**
- Stores expose loading/error state separately from data → UI can render skeletons
- Stale-while-revalidate behaviour: show cached data instantly, refetch in background, swap on success

## Architecture
```
Screens (camera / feed / memories / profile)
    ↓ hook
useFriends / useProfile / useMoments / useNotifications
    ↓ subscribe
Zustand store (in-memory + persisted to Dexie)
    ↓ on mount: load from Dexie → set initial state
    ↓ in background: fetch from API → diff → update store + Dexie
Service layer (FriendsServices, AuthServices.profile, PostMoments)
    ↓ axios
LocketDio backend
```

## Related Code Files
**Create (copied/adapted from `apps/main`):**
- `apps/locket-love/src/services/FriendsServices.js`
- `apps/locket-love/src/services/PostMoments.js` (read paths only — write in Phase 5)
- `apps/locket-love/src/services/PayloadServices.js` (token-bound payload fetcher)
- `apps/locket-love/src/services/RequestServices.js` (low-level request helper)
- `apps/locket-love/src/stores/friend-store.js` — port of `useFriendStoreV3` trimmed for the new UI
- `apps/locket-love/src/stores/profile-store.js`
- `apps/locket-love/src/stores/moment-store.js`
- `apps/locket-love/src/stores/notification-store.js`
- `apps/locket-love/src/stores/build-friend-data.js`, `diff-friend-ids.js`, `sort-friend-data.js` (helpers from `apps/main`)
- `apps/locket-love/src/cache/dexie-db.js` — Dexie schema for `friends`, `moments`, `profile`

**Modify:**
- `apps/locket-love/src/components/sheets/profile-sheet.jsx`
  - Replace local `useState(name)` etc. with `useProfile()`
  - `EditTextSheet onSave` → call `profile.saveName(value)` etc. (returns promise; show loading)
- `apps/locket-love/src/components/sheets/friends-sheet.jsx`
  - Replace `friends` import from mock-data with `useFriends()`
  - "Search" still uses mock `searchableUsers` (real friend-search API in Phase 7)
- `apps/locket-love/src/data/mock-data.js`
  - Mark `currentUser`, `friends`, `feedMoments` as `@deprecated — use stores`
  - Keep `captionStickersGeneral`, `captionStickersDecorative`, `searchableUsers` (still mock for now)

## Implementation Steps
1. Copy services + helpers from `apps/main/src/services/LocketDioServices/` and `apps/main/src/stores/FriendStores/`
2. Adapt imports: `@/libs/axios`, `@/utils/auth` etc. (paths now resolve via Phase 1 alias)
3. Create Dexie schema in `cache/dexie-db.js` — tables: `friends`, `moments`, `profile`, `notifications`
4. Build `friend-store.js`:
   - State: `friends`, `loading`, `error`, `lastSyncedAt`
   - `init()` → load from Dexie → if stale (>5min) → `sync()`
   - `sync()` → call FriendsServices → `buildFriendData` → `diff` against current → patch + persist to Dexie
   - Export `useFriends` hook
5. Build `profile-store.js` similarly. Mutators (`saveName` etc.) call AuthServices update endpoints + optimistic update
6. Build `moment-store.js` — see Phase 4 for fetch wiring (this phase: scaffold + hook)
7. Build `notification-store.js` — wraps `getNotificationSettings` / `updateNotificationSettings`
8. Wire `profile-sheet.jsx`:
   - `const profile = useProfile()`
   - Replace state with `profile.name`, `profile.email`, etc.
   - `EditTextSheet onSave={async (v) => { await profile.saveName(v); closeEdit(); }}`
   - Show inline spinner in EditTextSheet while saving
9. Wire `friends-sheet.jsx`: `const { friends } = useFriends()`
10. Init stores in `App.jsx` after auth bootstrap completes (call `friendStore.init()`, etc.)
11. Smoke-test: login → friends list populated from API → edit profile name → reload page → name persists

## Success Criteria
- [ ] `useFriends()` returns real friends after login (verify via Network tab)
- [ ] Profile edits hit the backend and persist across reload
- [ ] Notification toggles persist server-side (verify by toggling, reloading, re-opening sheet)
- [ ] Cold reload shows cached data instantly (Dexie hydration), then sync overlay
- [ ] Network failure during sync keeps cached data + shows toast
- [ ] No raw `import { friends } from "../../data/mock-data"` remains in screen/sheet files (only types/captions left)

## Risk Assessment
- **Risk:** Backend may not have a single-call profile-update endpoint; may require separate calls per field.
  **Mitigation:** scout `AuthServices` in `apps/main` first; if separate, expose `saveName`/`saveBirthday`/etc. as separate functions (already planned).
- **Risk:** Dexie quota exceeded on large friend lists or moment caches.
  **Mitigation:** cap moments cache at last 30 days; evict oldest on sync.
- **Risk:** Diff logic from `apps/main` assumes specific field names that the new UI renamed.
  **Mitigation:** keep store internals 1:1 with `apps/main` schema; map to UI shape only at hook boundary.
