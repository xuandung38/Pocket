---
title: "Locket Love — API & service integration on dedicated port"
description: ""
status: pending
priority: P2
branch: "feat/happy-kapitsa-b4e6f3"
tags: []
blockedBy: []
blocks: []
created: "2026-05-12T06:50:31.457Z"
createdBy: "ck:plan"
source: skill
---

# Locket Love — API & service integration on dedicated port

## Overview

Rename `apps/locket-dark` to `apps/locket-love` and replace mock data with real Locket Dio backend integration, reusing the proven service/store architecture from `apps/main`. Run on dedicated port `5175` so it can co-exist with `apps/main` (5173) during development.

**Goal:** ship a fully wired dark-OLED Locket client with auth, friends, moments, chat, photo upload — end-to-end real APIs — without disturbing `apps/main`.

**Strategy:** copy & adapt (not workspace-share) — `apps/main` and `apps/locket-love` evolve independently. Service layer is identical so future divergence is intentional, not accidental.

**Reused from `apps/main`:**
- `src/libs/` — axios instances (auth, main, locket, data, storage, extens) + token refresh interceptor
- `src/config/apiConfig.js` + `webConfig.js` — env wiring
- `src/services/LocketDioServices/` — Auth, Friends, Chat, Payment, Moments services
- `src/socket/socketClient.js` — socket.io client
- Selected `src/stores/` — AuthStore, FriendStores, MessageStores, MomentStores
- `src/utils/` — token helpers, JWT parsing, local storage utilities

**New deps:** `axios`, `jwt-decode`, `socket.io-client`, `zustand`, `dexie` (offline cache), `sonner` (toasts).

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Rename app + infra setup](./phase-01-rename-app-infra-setup.md) | Pending |
| 2 | [Auth integration (login/logout/refresh)](./phase-02-auth-integration-login-logout-refresh.md) | Pending |
| 3 | [Core data services + stores](./phase-03-core-data-services-stores.md) | Pending |
| 4 | [Feed + memories integration](./phase-04-feed-memories-integration.md) | Pending |
| 5 | [Send moment + photo upload](./phase-05-send-moment-photo-upload.md) | Pending |
| 6 | [Chat + socket realtime](./phase-06-chat-socket-realtime.md) | Pending |
| 7 | [Reactions + activity](./phase-07-reactions-activity.md) | Pending |
| 8 | [E2E test + polish + cleanup](./phase-08-e2e-test-polish-cleanup.md) | Pending |

## Dependencies

<!-- Cross-plan dependencies -->
