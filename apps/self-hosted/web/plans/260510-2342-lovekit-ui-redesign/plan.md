---
title: "Lovekit — Standalone Mobile PWA"
description: "Brand-new Vite + React app at apps/self-hosted/lovekit/. Bottom-tab navigation, warm orange-amber identity. Zero modifications to the existing web app."
status: in-progress
priority: P2
effort: 28h
branch: feat/fix-selfhost
tags: [ui, redesign, pwa, mobile, lovekit, standalone]
created: 2026-05-10
updated: 2026-05-11
---

# Lovekit — Standalone Mobile PWA

## Goal

Build a completely independent app at `apps/self-hosted/lovekit/` — its own `package.json`, Vite config, and source tree. Reusable code (stores, services, utils, socket, cache) is **copied** into the new app and adapted as needed. The existing `apps/self-hosted/web/` project is **not touched at all**.

## Architectural Decisions (locked)

- **Location**: `/Volumes/DATA/Develop/tools/Pocket/apps/self-hosted/lovekit/`
- **Stack**: Vite 6 + React 18 + Tailwind v4 + DaisyUI v5 + Zustand 5 + Socket.io-client 4 + Axios
- **Navigation**: Local `useState` tab switcher (Camera / Feed / Messages / Profile) — no React Router needed for 4 tabs. CSS `hidden` toggle keeps screens mounted.
- **Auth**: Login screen built into the app. Token stored in `localStorage` (same keys as old app so users stay logged in if using same domain).
- **API**: Points to same backend via `VITE_API_URL` env var.
- **Styling**: New `lovekit` DaisyUI theme (warm orange-amber) isolated to this project entirely.
- **Fonts**: Plus Jakarta Sans via Google Fonts CDN, scoped to `[data-theme="lovekit"]`.
- **Reuse strategy**: Copy files from old app, adapt imports. No shared module at runtime.

## Reuse Map (copy → adapt)

| Source (web/src/) | Destination (lovekit/src/) | Notes |
|---|---|---|
| `stores/useMomentsStoreV2.js` | `stores/` | Copy as-is |
| `stores/useAuthStore.js` | `stores/` | Copy as-is |
| `stores/useMessagesStore.js` | `stores/` | Copy as-is |
| `stores/useFriendStore.js` | `stores/` | Copy as-is |
| `stores/useStreakStore.js` | `stores/` | Copy as-is |
| `stores/useUploadQueueStore.js` | `stores/` | Copy as-is |
| `services/LocketDioServices/` | `services/LocketDioServices/` | Copy, update axios import path |
| `services/LocketServices/` | `services/LocketServices/` | Copy, update axios import path |
| `lib/axios.js` | `lib/axios.js` | Copy, update baseURL to `VITE_API_URL` |
| `lib/axios.locket.js` | `lib/axios.locket.js` | Copy as-is |
| `context/SocketContext.jsx` | `context/SocketContext.jsx` | Copy, update socket URL to env |
| `socket/socketClient.js` | `socket/socketClient.js` | Copy as-is |
| `cache/momentDB.js` | `cache/momentDB.js` | Copy as-is (Dexie) |
| `utils/formatTimeAgo.js` | `utils/` | Copy |
| `utils/dowload/` | `utils/download/` | Copy |
| `constants/` | `constants/` | Copy relevant constants |
| `hooks/useChatSocket.js` | `hooks/` | Copy |

## Directory Structure

```
apps/self-hosted/lovekit/
├── package.json
├── vite.config.js               # PWA (vite-plugin-pwa), path aliases (@/)
├── index.html
├── public/
│   └── icons/                   # PWA icons
└── src/
    ├── main.jsx
    ├── App.jsx                   # Auth gate + LovekitShell
    ├── app.css                   # lovekit DaisyUI theme + font import
    ├── stores/                   # Copied from web/src/stores
    ├── services/                 # Copied from web/src/services
    ├── lib/                      # axios.js, axios.locket.js
    ├── context/                  # SocketContext.jsx
    ├── socket/                   # socketClient.js
    ├── cache/                    # momentDB.js (Dexie)
    ├── hooks/                    # useChatSocket.js
    ├── utils/                    # formatTimeAgo, download, etc.
    ├── constants/
    ├── components/
    │   ├── ui/
    │   │   ├── BottomTabBar.jsx
    │   │   ├── WarmCard.jsx
    │   │   ├── EmptyState.jsx
    │   │   └── LoadingSkeleton.jsx
    │   ├── MomentCard.jsx
    │   ├── MomentViewer.jsx
    │   ├── EmojiReactionBar.jsx
    │   ├── FriendAvatar.jsx
    │   ├── ConversationItem.jsx
    │   └── StreakCalendar.jsx
    └── screens/
        ├── LoginScreen.jsx
        ├── CameraScreen.jsx
        ├── FeedScreen.jsx
        ├── MessagesScreen.jsx
        └── ProfileScreen.jsx
```

## Team Workflow

### Parallelism
- **Phase 01 → 02**: sequential (02 depends on scaffold)
- **Phase 03–06**: fully parallel after 02 merges (assign to different team members)
- **Phase 07**: sequential after all of 03–06 complete

### Agent Assignment (recommended)
Each phase runs as a `fullstack-developer` subagent with isolated file ownership:

| Phase | Assignee | File Scope |
|-------|----------|------------|
| 01 | Agent A | `apps/self-hosted/lovekit/package.json`, `vite.config.js`, `src/app.css`, `src/components/ui/` |
| 02 | Agent A | `src/App.jsx`, `src/screens/LoginScreen.jsx`, `src/components/ui/BottomTabBar.jsx` |
| 03 | Agent B | `src/screens/CameraScreen.jsx`, `src/components/CameraPreview.jsx`, `src/components/CaptureButton.jsx` etc. |
| 04 | Agent C | `src/screens/FeedScreen.jsx`, `src/components/MomentCard.jsx`, `src/components/MomentViewer.jsx` etc. |
| 05 | Agent D | `src/screens/MessagesScreen.jsx`, `src/components/ChatDetail.jsx`, `src/components/ConversationItem.jsx` etc. |
| 06 | Agent D | `src/screens/ProfileScreen.jsx`, `src/components/StreakCalendar.jsx` etc. |
| 07 | Agent A | All screens (polish pass — no new files) |

### Progress Tracking Protocol (MANDATORY)

**When a phase is complete, the implementing agent MUST:**

1. Update the phase file frontmatter: `status: pending` → `status: completed`
2. Check off all `- [ ]` items in the phase file's `## Todo` section
3. Update the **Phases table below** — change `pending` to `completed` in the Status column
4. Activate `ck:chrome-devtools` skill to run the Chrome MCP testing checklist in the phase file

**This is non-negotiable. A phase is NOT done until the plan files reflect it.**

---

## Chrome MCP Testing Requirements

Every phase MUST be tested using the `ck:chrome-devtools` skill (Chrome MCP) before marking complete.

**Standard test sequence per phase:**
1. `screenshot` — capture current state at 390×844 (iPhone 14 viewport)
2. `console_errors` — check for JS errors and warnings
3. `network_errors` — verify API calls succeed (no 4xx/5xx)
4. `accessibility` — check no critical a11y violations

Phases 03–06 additionally require:
- Test at 375×667 (iPhone SE — smallest supported)
- Verify bottom tab bar does not overlap content

**Tool invocation pattern:**
```
activate ck:chrome-devtools
→ navigate to http://localhost:5173
→ set viewport 390x844
→ screenshot each tab
→ check console for errors
→ report findings
```

---

## Phases

| #  | Phase | Effort | Status | Blocked By |
|----|-------|--------|--------|------------|
| 01 | [Project scaffold + reuse copy + design tokens](./phase-01-design-tokens-scaffold.md) | 4h | completed | — |
| 02 | [App shell + BottomTabBar + LoginScreen](./phase-02-navigation-shell.md) | 3h | completed | 01 |
| 03 | [CameraScreen](./phase-03-camera-screen.md) | 5h | pending | 02 |
| 04 | [FeedScreen + MomentCard + Viewer + Reactions](./phase-04-feed-screen.md) | 6h | pending | 02 |
| 05 | [MessagesScreen (list + chat detail)](./phase-05-messages-screen.md) | 5h | pending | 02 |
| 06 | [ProfileScreen (streak + friends + rollcall)](./phase-06-profile-screen.md) | 4h | completed | 02 |
| 07 | [Empty states + skeletons + polish](./phase-07-empty-states-polish.md) | 2h | pending | 03,04,05,06 |

Phases 03–06 parallelizable after 02 lands.

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Copied stores reference `@/` aliases not configured in new project | H | H | Configure vite path alias `@` → `src/` in Phase 01 before copying |
| axios baseURL hardcoded in copied files | M | M | Replace with `import.meta.env.VITE_API_URL` in Phase 01 copy step |
| Token storage keys conflict if old+new app on same domain | L | M | Use same localStorage keys intentionally — shared session is a feature |
| Dexie IndexedDB name collision with old app | L | L | Use db name `lovekit-moments-db` (distinct from old app) |
| Camera permission already granted in old app — no issue since standalone | — | — | N/A: new origin or path, browser issues fresh grant |
| Plus Jakarta Sans CDN blocked offline | L | L | system-ui fallback in font stack |

## Success Criteria

- [ ] `apps/self-hosted/lovekit/` is a self-contained runnable app (`npm install && npm run dev` works)
- [ ] Login with Locket credentials works
- [ ] All 4 tabs functional with real data from copied stores
- [ ] Zero files modified in `apps/self-hosted/web/`
- [ ] PWA installable on mobile
- [ ] Old app at `/locket-beta` completely unaffected

## Open Questions

- Should lovekit be served on a different port or same Docker compose as web app?
- Rollcall in Phase 06 MVP or defer to P3?
