---
title: "Locket ↔ Lovekit API Integration"
description: "Wire all lovekit features to self-hosted API end-to-end and close integration gaps."
status: pending
priority: P1
effort: 16h
branch: feat/fix-selfhost
tags: [integration, lovekit, self-hosted, api, frontend, backend]
created: 2026-05-12
---

# Plan: Locket ↔ Lovekit API Integration

## Goal
Make every lovekit feature work end-to-end against the self-hosted API with no broken
endpoints, no dual-source state, and no silent failures.

## Scoping Principles
- File ownership exclusive per phase (10 devs, no overlap)
- Each phase ≤ 2h, independently shippable
- Use `instanceAuth` / `api` (`/lib/axios.js`) only — no direct Locket calls from features
- All new backend endpoints go through `verifyIdToken` and (for Locket pass-through) the
  proxy whitelist or a dedicated controller

## Critical Findings (verified from codebase scout)

### Backend missing endpoints (frontend calls them, server returns 404)
1. `POST /locket/sendFriendRequestV2` — used by `RequestServices.SendRequestToFriend` (`services/LocketDioServices/RequestServices.js:144`)
2. `POST /locket/getAllRequestsV2` — used by `RequestServices.getAllRequestFriend` (`RequestServices.js:8`); duplicates V2 split, scope: remove from FE or alias on BE
3. Proxy whitelist gaps: `markAsRead`, `sendChatMessageReaction`, `deleteChatMessage`, `sendFriendRequestV2` not in `LOCKET_PROXY_WHITELIST` (`controllers/locket.controller.js:23`)
4. `/api/presignedV3` — used by `StorageServices.uploadFileAndGetInfoR2` (`StorageServices.js:18`); R2 path is the **only** upload path used by `createRequestPayloadV5` → blocks ALL posting

### Frontend issues
5. **Dual friend store** — `useFriendStore` (`useFriendStore.js`) vs `useFriendStoreV2` (`stores/friendStore/index.js`) — different shapes. `FeedScreen` uses V1, `MessagesScreen`/`CameraScreen`/`FriendsSheet`/`FriendMomentRow` use V2 → friend lookups fail per screen.
6. **chat.services.js** still uses direct `instanceLocket` (`axios.locket.js`) → bypasses self-hosted backend (Locket API blocks AppCheck)
7. Stale orphan modules `axios.data.js`, `axios.locket.js`, V1 `useFriendStore` → confusion + dead code paths
8. Storage flow: backend already supports `/locket/initUpload`+`/locket/finalizeUpload` (Firebase resumable upload) — plumb FE to use this instead of R2 path (or add R2 endpoint)
9. `OptionMoment` calls hooks **after** early-return (`OptionMoment.jsx:36-39`) — React rules-of-hooks violation; will crash when re-opened with different selection state

## Phases (10 phases, file-ownership disjoint)

| # | Phase | Owner | Effort | Status | Files (exclusive) |
|---|-------|-------|--------|--------|-------------------|
| 01 | Backend: add missing routes + expand proxy whitelist | dev-1 | 1.5h | pending | `api/src/routes/locket.route.js`, `api/src/controllers/locket.controller.js` |
| 02 | Backend: implement Firebase upload session passthrough fixes + R2 fallback shim | dev-2 | 2h | pending | `api/src/routes/api.route.js`, `api/src/controllers/storage.controller.js` (NEW), `api/src/services/FirestorageService/uploadImage.js` |
| 03 | Frontend: unify on `useFriendStoreV2` — delete V1 store + update consumers | dev-3 | 1.5h | pending | `lovekit/src/stores/useFriendStore.js`, `lovekit/src/stores/index.js`, `lovekit/src/screens/FeedScreen.jsx`, `lovekit/src/screens/ProfileScreen.jsx` |
| 04 | Frontend: refactor `chat.services.js` to use `/locket/proxy/*` and remove `instanceLocket` | dev-4 | 1h | pending | `lovekit/src/services/LocketServices/chat.services.js`, `lovekit/src/lib/axios.locket.js`, `lovekit/src/lib/axios.data.js` |
| 05 | Frontend: rewire upload flow — `createRequestPayloadV5` → `initUpload`/`finalizeUpload` | dev-5 | 2h | pending | `lovekit/src/services/LocketDioServices/StorageServices.js`, `lovekit/src/services/LocketDioServices/PayloadServices.js` |
| 06 | Frontend: fix `OptionMoment` hooks-order bug + integrate `removeMoment` for V2 store keys | dev-6 | 1h | pending | `lovekit/src/components/OptionMoment.jsx` |
| 07 | Frontend: friend-request flow consolidation (incoming/outgoing/celebrity/normal add) | dev-7 | 2h | pending | `lovekit/src/services/LocketDioServices/RequestServices.js`, `lovekit/src/components/friends/FindFriend.jsx`, `lovekit/src/components/friends/NormalItemFriend.jsx` |
| 08 | Frontend: harden auth (token refresh, logout cleanup, login token shape) + axios 401 retry | dev-8 | 1.5h | pending | `lovekit/src/lib/axios.js`, `lovekit/src/lib/axios.auth.js`, `lovekit/src/screens/LoginScreen.jsx` |
| 09 | Frontend: feed/moments wiring — pagination via `syncToken`, fix `GetAllMoments` parameters, repair real-time delete | dev-9 | 1.5h | pending | `lovekit/src/services/LocketDioServices/ActionMoments.js`, `lovekit/src/stores/useMomentsStoreV2.js`, `lovekit/src/screens/FeedScreen.jsx` (intersection-only edits gated by phase 03) |
| 10 | Frontend: env + smoke-test wiring + minor surface fixes (CameraPreview visibility, swipe nav, no-op `/api/me`) | dev-10 | 1.5h | pending | `lovekit/.env.example`, `lovekit/.env.production.example`, `lovekit/src/components/CameraPreview.jsx`, `lovekit/src/services/LocketDioServices/AuthServices.js` (only `GetUserData`/`GetUserDataV2`), `lovekit/src/services/ExtensionsServices/MusicServices.js`, `lovekit/src/services/ExtensionsServices/CollabServices.js` |

## File-ownership conflict resolution

`FeedScreen.jsx` is touched by Phase 03 (store rename) AND Phase 09 (pagination). Phase 09
**MUST run after** Phase 03 lands. We split: Phase 03 owns the friend-store import lines
only; Phase 09 must rebase on Phase 03's main commit before adding pagination/intersection
changes. Recorded as `addBlockedBy` between tasks.

## Dependency graph

```
01 ──┐
02 ──┼─► 05 ─┐
     │       ├─► 09 ─┐
03 ──┼──────►├─► 06  ├─► (smoke)
04 ──┘       │       │
07 ──────────┤       │
08 ──────────┘       │
10 ──────────────────┘
```

## Test Matrix

| Surface | Phase | Verification |
|---------|-------|--------------|
| Login + token refresh | 08 | Manual: login, force expire, watch refresh; lint passes |
| Friends list display | 03 | All 4 screens (Camera, Feed, Profile, Messages) show same friend set |
| Friend requests | 01,07 | Accept/reject/cancel hits backend, list updates |
| Send friend request (normal) | 01,07 | New backend route returns 200, request appears in outgoing |
| Post moment (image+video) | 02,05 | E2E: capture → upload → moment in feed |
| Delete moment | 06 | Remove from feed, IndexedDB, server |
| React to moment | (already wired) | Smoke after 04 (axios consolidation) |
| Send chat message | 04 | Optimistic insert + server sync |
| Stream restart | 10 | Background tab → return → preview live |
| 401/429 handling | 08 | Force 401 in DevTools → logout flow |

## Rollback Plan

Each phase = independent commit on `feat/fix-selfhost`. Roll back via `git revert <sha>`.
No phase introduces destructive migration (no DB schema, no data loss).

## Out of Scope
- Payment endpoints (`/api/orders`, `/api/od`) — feature deprecated
- Music endpoint (`/api/getInfoMusic`), Collab caption (`/api/collab/getCaption`) — Phase 10 stubs return 501
- `/api/me`, `/api/po`, `/api/u` — unused by current screens; Phase 10 removes calls
- Push notifications (`/api/push/register`)
- Beta server proxy (`getUserByData`, `sendCelebrityRequestV2`) — already wired

## Unresolved Questions
1. Should we keep `axios.locket.js` for advanced features that may proxy in future, or delete entirely? (Phase 04 deletes; revisit if needed.)
2. Is direct Firebase upload (`/locket/initUpload`) acceptable from browser CORS-wise? Backend code path implies yes (returns Firebase URL). Phase 05 verifies in browser.
3. R2 storage server (`storage.locket-dio.com`) — is it run separately? Backend config has `services.storageUrl` but no controller. Phase 02 adds **fallback shim only** (passthrough), full R2 wiring is a future phase.
