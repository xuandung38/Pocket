# Tester Report — Lovekit Build Validation

**Date:** 2026-05-11
**Branch:** feat/fix-selfhost
**Tag:** lovekit-v1.0
**Tester:** dev-8
**Scope:** Read-only validation of `apps/self-hosted/lovekit/` build + structure

---

## Verdict: **PASS**

All 8 phases produce a green build. Sacred constraint upheld (zero `apps/self-hosted/web/src/` modifications by any lovekit commit). Structure matches plan. No `process.env` leaks. PWA assets + Docker service present.

---

## 1. `npm install`

**Result:** PASS
**Output:** `up to date, audited 393 packages in 896ms — found 0 vulnerabilities`
- 105 packages funding-eligible (informational).
- No install errors, no peer-dep warnings.

## 2. `npm run build`

**Result:** PASS — `vite v6.4.2`, built in 2.35s, 1975 modules transformed.

### Bundle Sizes (gzipped)

| Asset | Raw | Gzip |
|---|---:|---:|
| `index.html` | 1.25 kB | 0.51 kB |
| `index-*.css` | 66.39 kB | 12.24 kB |
| `icons-*.js` (lucide-react) | 18.68 kB | 5.47 kB |
| `socket-*.js` (socket.io-client) | 41.58 kB | 13.01 kB |
| `swiper-*.js` | 87.49 kB | 27.04 kB |
| `react-*.js` (react+dom) | 134.66 kB | 43.22 kB |
| `index-*.js` (app) | 267.88 kB | 87.37 kB |
| `manifest.webmanifest` | 0.42 kB | — |
| `registerSW.js` | 0.13 kB | — |
| **Total JS gzip** | — | **~176 kB** |
| **Total (CSS+JS) gzip** | — | **~188 kB** |

Matches plan target (~189 KB gz). Zero build warnings. manualChunks splitting confirmed (react / swiper / socket / icons).

### PWA Output
`PWA v1.3.0 mode=generateSW precache=11 entries (603.57 KiB)` — `dist/sw.js` + `dist/workbox-*.js` emitted.

## 3. Sacred Constraint — `web/` Untouched

**Result:** PASS

Files modified under `apps/self-hosted/web/` by lovekit commits (945d82e..HEAD):
- **Only** under `apps/self-hosted/web/plans/260510-2342-lovekit-ui-redesign/` (planning markdown — not code).
- Zero touches to `apps/self-hosted/web/src/`.

Uncommitted working-tree change `apps/self-hosted/web/src/services/LocketDioServices/PayloadServices.js` is **pre-existing** user work (present at session start, predates Phase 01 commit `945d82e`). Not introduced by lovekit team.

## 4. Created Files — Structure Check vs plan.md §Directory Structure

**Result:** PASS — all expected directories present, no missing files.

```
apps/self-hosted/lovekit/src/
├── main.jsx, App.jsx, app.css
├── cache/           (8 Dexie DBs incl. momentDB)
├── components/      (Camera*, Chat*, Friend*, Moment*, Streak*, Upload*, etc.)
│   └── ui/          (BottomTabBar, WarmCard, EmptyState, LoadingSkeleton, ConfirmDialog, SonnerToast)
├── config/          (apiConfig, configAlias, webConfig, index)
├── constants/       (constrain, emojis, phoneCodeMap, socketEvents, index)
├── context/         (AppContext, SocketContext, ThemeContext)
├── helpers/         (chunkArray, getInfoLocation, GetInfoUser, Media, tokenHelper, index)
├── hooks/           (useChatSocket, useFeature, useTheme)
├── lib/             (axios, axios.auth, axios.data, axios.exten, axios.locket, axios.main)
├── screens/         (Camera, Feed, Login, Messages, Profile)
├── services/        (ExtensionsServices, LocketDioServices, LocketServices)
├── socket/          (socketClient, socketHandlers, socketHandlersV2)
├── stores/          (auth, camera, friend, loading, messages, momentsV2, navigation, overlay, post, streak, ui, uploadPost, friendStore/, postStore/, index)
└── utils/           (API, auth, device, dowload, enviroment, Formats, generate, logging, logic, process, replace, sort, standardize, storage, SyncData, theme)
```

**Extras vs minimal plan (not regressions):** richer cache/, hooks/, helpers/, expanded utils/ tree — all reasonable copies/adapts per Reuse Map.

**Missing vs plan:** none.

## 5. `process.env` Audit

**Result:** PASS — zero hits in `src/`. All env access uses `import.meta.env`.

## 6. Hardcoded `localhost:5001` Audit

**Result:** PASS (acceptable).

| File | Line | Context |
|---|---|---|
| `src/config/webConfig.js` | 5 | `const API = import.meta.env.VITE_API_URL || "http://localhost:5001";` — fallback only |
| `.env.example`, `.env.production` | — | Env files (allowed, configurable) |

No raw hardcoded `localhost:5001` outside fallback + env files.

## 7. PWA Manifest + Icons

**Result:** PASS
- `public/manifest.json` (540B) — name `Lovekit`, theme `#F97316`, `display: standalone`, `orientation: portrait`.
- `public/icons/icon-192.png` (329B) + `icon-512.png` (355B) — both maskable.
- Build emits `dist/manifest.webmanifest` + `dist/sw.js` via vite-plugin-pwa.

## 8. Dockerfile + docker-compose

**Result:** PASS
- `apps/self-hosted/lovekit/Dockerfile` — 2-stage (node:20-slim builder → preview runner), exposes 5175, `npm run preview --host 0.0.0.0 --port 5175`.
- `apps/self-hosted/docker-compose.yml` lines 45–58: service `lovekit`, container `lovekit-pwa`, build context `./lovekit`, env_file `./lovekit/.env.production`, port mapping `5175:5175`, `depends_on: api`, `restart: unless-stopped`.

---

## Issues Found

**None blocking.** Minor observations:

1. `.env.production` contains `localhost:5001` literals for all VITE_*_API_URL keys — fine for local Docker but operators must override in prod. Documentation hint advisable but not required.
2. Working tree has uncommitted modifications (`web/src/.../PayloadServices.js`, `lovekit/src/screens/FeedScreen.jsx`) + untracked (`lovekit/src/components/ui/ConfirmDialog.jsx`). The lovekit-side changes appear to be post-tag polish; `ConfirmDialog.jsx` is present and used per phase plan. Lead should decide whether to amend into tag or release as v1.0.1.

## Recommendations

- Proceed to reviewer audits (#9 #10 #11).
- Consider committing the 2 uncommitted lovekit files if intended for v1.0.
- No build/structure fixes required.

## Unresolved Questions

- Are the uncommitted `lovekit/src/screens/FeedScreen.jsx` mods + untracked `ConfirmDialog.jsx` intentional post-tag work, or should they be folded into `lovekit-v1.0`?
- `.env.production` ships with `localhost:5001` defaults — is this expected for the Docker-compose internal network (where `api:5001` resolves) or should it be `http://api:5001` like `.env.production.example`?
