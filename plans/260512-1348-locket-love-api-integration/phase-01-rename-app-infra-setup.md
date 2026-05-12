---
phase: 1
title: "Rename app + infra setup"
status: pending
priority: P1
effort: "3h"
dependencies: []
---

# Phase 1: Rename app + infra setup

## Overview
Rename `apps/locket-dark` → `apps/locket-love`, lock dev port to 5175, add the runtime deps from `apps/main`, copy the axios instances + config + utility helpers, and stub `.env` from `apps/main/.env.example`.

## Requirements
**Functional:**
- App name = `locket-love` everywhere (package.json, README badge, vite logs, browser tab title)
- Vite dev runs on port 5175 by default; falls back to next free port if taken
- All env vars used by `apps/main` exist in `apps/locket-love/.env.example`

**Non-functional:**
- `apps/main` continues to work on its current port — no shared state
- Build remains <2s; bundle stays under 250kB pre-gzip for the auth-required entry

## Architecture
Mono-repo siblings: `apps/main` (legacy UI) and `apps/locket-love` (new dark UI). Both share the same backend, same `.env` shape. No code is symlinked or workspace-shared — everything is copied so changes in one don't ripple to the other.

```
apps/
├── main/             # legacy — port 5173
├── self-hosted/
└── locket-love/      # new dark UI — port 5175
    ├── src/
    │   ├── config/   # ← copied from apps/main/src/config
    │   ├── libs/     # ← copied (axios instances, token refresh)
    │   ├── utils/    # ← copied (token, JWT, local storage)
    │   └── ...existing dark UI...
    └── .env.example  # ← copied from apps/main/.env.example
```

## Related Code Files
**Rename:**
- `apps/locket-dark/` → `apps/locket-love/`

**Modify:**
- `apps/locket-love/package.json` — name → `locket-love`, add deps (axios, jwt-decode, socket.io-client, zustand, dexie, sonner)
- `apps/locket-love/vite.config.js` — `server.port = 5175`, set up `@/` alias to `src/`
- `apps/locket-love/index.html` — `<title>Locket Love</title>`
- `apps/locket-love/src/main.jsx` — confirm root mount unchanged
- `apps/locket-love/jsconfig.json` (create) — `paths: { "@/*": ["src/*"] }`
- `.claude/launch.json` — update `name: locket-love`, port 5175

**Create (copied from `apps/main`):**
- `apps/locket-love/src/config/apiConfig.js`
- `apps/locket-love/src/config/webConfig.js`
- `apps/locket-love/src/config/index.js`
- `apps/locket-love/src/libs/axios.js`
- `apps/locket-love/src/libs/createBase.js`
- `apps/locket-love/src/libs/instanceAuth.js`
- `apps/locket-love/src/libs/instanceMain.js`
- `apps/locket-love/src/libs/instanceLocket.js`
- `apps/locket-love/src/libs/instanceData.js`
- `apps/locket-love/src/libs/instanceStorage.js`
- `apps/locket-love/src/libs/instanceExtens.js`
- `apps/locket-love/src/libs/index.js`
- `apps/locket-love/src/utils/auth.js`
- `apps/locket-love/src/utils/index.js`
- `apps/locket-love/.env.example` (mirror of apps/main)
- `apps/locket-love/.env.local` (developer-local; gitignored)

## Implementation Steps
1. `git mv apps/locket-dark apps/locket-love` (preserves history)
2. Update `package.json` `name`, `version`, dependencies (mirror axios/jwt-decode/socket.io-client/zustand/dexie/sonner from `apps/main`)
3. `npm install` in `apps/locket-love`
4. Update `vite.config.js`: `server.port = 5175`, add `resolve.alias = { "@": fileURLToPath("./src") }`
5. Add `jsconfig.json` so `@/...` imports resolve in editor
6. Update `index.html` `<title>` and any branding strings
7. Copy `apps/main/src/config/`, `src/libs/`, relevant `src/utils/` files (skip toast deps that aren't installed yet — comment imports until phase 2)
8. Copy `.env.example`, create `.env.local`, set `VITE_BASE_API_URL` etc. to dev backend
9. Update `.claude/launch.json` to `name: locket-love`, `port: 5175`
10. Run `npm run dev` — verify boots on 5175 and existing UI still renders (login screen + protected redirects)
11. Run `npm run build` — verify clean build

## Success Criteria
- [ ] `apps/locket-love` directory exists; `apps/locket-dark` no longer present
- [ ] `npm run dev --prefix apps/locket-love` listens on `:5175`
- [ ] `npm run build` passes with no warnings about missing config
- [ ] `apps/main` still boots independently on its port
- [ ] All `@/config`, `@/libs`, `@/utils` imports resolve in editor + at runtime
- [ ] Login screen still renders (auth wiring is Phase 2 — UI just needs to compile)

## Risk Assessment
- **Risk:** path alias mismatch between vite + jsconfig → broken imports at runtime.
  **Mitigation:** smoke-test by importing `@/config` from `App.jsx` and running `npm run dev`.
- **Risk:** copied utils import toast helpers (`SonnerToast`) not yet present → build fails.
  **Mitigation:** stub or comment those imports in Phase 1; replace in Phase 2 when sonner is added.
- **Risk:** port 5175 collides with another dev server.
  **Mitigation:** `strictPort: false` lets Vite pick the next free port; document the fallback in README.
