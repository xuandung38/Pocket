# dev-9 — Friend Request Flow UI

**Task:** #10 (Friend request flow — UI components)
**Branch:** feat/fix-selfhost
**Commit:** 1b3b118
**Status:** DONE

## Files added
- `apps/locket-love/src/services/request-services.js`
- `apps/locket-love/src/components/friends/find-friend.jsx`
- `apps/locket-love/src/components/friends/normal-item-friend.jsx`
- `apps/locket-love/src/components/friends/incoming-requests.jsx`
- `apps/locket-love/src/components/friends/outgoing-request.jsx`
- `apps/locket-love/src/components/friends/index.js` (barrel)

## What ships
- Lovekit-aligned aliases on top of `friend-services.js`:
  `SendRequestToFriend`, `SendRequestToCelebrity`, `AcceptRequestToFriend`,
  `DenyRequestToFriend`, `CancelRequestToFriend`
- New endpoint: `findFriendByUserName(username)` → `POST /locket/getUserByData`
- 4 UI components driven entirely by `useFriendStoreV2` (no local re-fetch
  for pendingIn/Out — store is source of truth)
- uid → user detail hydration with per-component cache to avoid refetching
- Per-row busy guard (`busyUid`) prevents double-submits across the surface
- Search panel branches on `celebrity` flag and re-runs search after a
  successful send so `friendship_status` flips to `outgoing-request`

## Build
`npm run build --prefix apps/locket-love` — clean, 1830 modules in 1.31s.

## Deviations from task spec
1. **Path:** spec said `services/LocketDioServices/RequestServices.js` but
   dev-3's commit 0fd923f flattened services to kebab-case. Shipped as
   `services/request-services.js` to match the now-canonical layout.
2. **Naming:** spec said dot-case (`request.services.js`); actual repo
   pattern (post-0fd923f) is kebab-case (`friend-services.js`,
   `auth-services.js`). Followed actual convention.
3. **ConfirmDialog:** lovekit OutgoingRequest uses a styled `ConfirmDialog`
   component that doesn't exist in locket-love. Used `window.confirm` as a
   v1 placeholder — clearly noted in source comment.

## Not wired (out of scope)
- `friends-sheet.jsx` does not yet render any of these components. Lead/
  Phase 7 owner needs to slot them in (Find at top, Incoming + Outgoing
  in the body). My files don't touch shared screens/sheets.

## Unresolved questions
- Should `services/index.js` barrel `request-services` so consumers can
  `import { findFriendByUserName } from "@/services"`? Left untouched to
  respect the file-ownership boundary; lead's call.
- `findFriendByUserName` returns the raw `{ success, data }` envelope.
  Phase 7 may want this normalized through the same `normalizeFriend`
  helper used in `friend-services.js`. Not done now — UI works with the
  raw envelope's snake_case fields (`first_name`, `profile_picture_url`,
  `friendship_status`) since that matches the search-result shape used in
  lovekit.
