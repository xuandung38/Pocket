---
phase: 1
title: "Project Scaffold + Reuse Copy + Design Tokens"
status: completed
priority: P1
effort: "4h"
dependencies: []
---

# Phase 01: Project Scaffold + Reuse Copy + Design Tokens

## Overview

Bootstrap `apps/self-hosted/lovekit/` as a self-contained Vite + React + Tailwind + DaisyUI app. Copy all reusable code from the old web app. Register the `lovekit` warm-amber design theme. Ship 3 base UI primitives. After this phase `npm run dev` renders a blank shell with correct colors.

## Requirements

**Functional**
- `npm install && npm run dev` starts successfully
- `lovekit` DaisyUI theme active with correct orange/cream tokens
- WarmCard, EmptyState, LoadingSkeleton render in isolation
- All copied stores/services/utils importable without errors

**Non-functional**
- Zero files modified in `apps/self-hosted/web/`

## Architecture

```
apps/self-hosted/lovekit/
├── package.json               # dependencies mirrored from web app
├── vite.config.js             # @/ alias, PWA plugin
├── .env.example               # VITE_API_URL=http://localhost:5001
├── index.html                 # <div id="root"> + viewport meta
└── src/
    ├── main.jsx               # ReactDOM.createRoot + StrictMode
    ├── app.css                # @import font + lovekit theme tokens
    ├── stores/                # copied from web/src/stores
    ├── services/              # copied from web/src/services
    ├── lib/axios.js           # baseURL = import.meta.env.VITE_API_URL
    ├── lib/axios.locket.js    # copied
    ├── context/SocketContext.jsx
    ├── socket/socketClient.js
    ├── cache/momentDB.js
    ├── hooks/useChatSocket.js
    ├── utils/                 # copied from web/src/utils
    ├── constants/             # copied relevant
    └── components/ui/
        ├── WarmCard.jsx
        ├── EmptyState.jsx
        └── LoadingSkeleton.jsx
```

## Color Tokens

```css
@plugin "daisyui/theme" {
  name: "lovekit";
  --color-primary: #F97316;
  --color-primary-content: #FFFBF0;
  --color-secondary: #FBBF24;
  --color-secondary-content: #431407;
  --color-accent: #FB923C;
  --color-base-100: #FFFBF0;
  --color-base-200: #FEF3C7;
  --color-base-300: #FDE68A;
  --color-base-content: #431407;
  --radius-box: 1.5rem;
  --radius-btn: 9999px;
}
```

## Related Code Files

**Create (new)**
- `apps/self-hosted/lovekit/package.json`
- `apps/self-hosted/lovekit/vite.config.js`
- `apps/self-hosted/lovekit/index.html`
- `apps/self-hosted/lovekit/.env.example`
- `apps/self-hosted/lovekit/src/main.jsx`
- `apps/self-hosted/lovekit/src/app.css`
- `apps/self-hosted/lovekit/src/components/ui/WarmCard.jsx`
- `apps/self-hosted/lovekit/src/components/ui/EmptyState.jsx`
- `apps/self-hosted/lovekit/src/components/ui/LoadingSkeleton.jsx`

**Copy + adapt (from web/src/)**
- `stores/useAuthStore.js` → fix any `@/` imports to relative
- `stores/useMomentsStoreV2.js`
- `stores/useMessagesStore.js`
- `stores/useFriendStore.js` + `useFriendStoreV2.js`
- `stores/useStreakStore.js`
- `stores/useUploadQueueStore.js`
- `stores/useUIStore.js`
- `services/LocketDioServices/**`
- `services/LocketServices/**`
- `services/index.js`
- `lib/axios.js` — replace `process.env` / hardcoded baseURL with `import.meta.env.VITE_API_URL`
- `lib/axios.locket.js`
- `context/SocketContext.jsx`
- `socket/socketClient.js`
- `cache/momentDB.js` — rename DB to `lovekit-moments-db`
- `hooks/useChatSocket.js`
- `utils/formatTimeAgo.js` (or `formatTimeAgoV2`)
- `utils/dowload/downloadByLink.js`
- `constants/` — relevant socket event names, API endpoints

## Implementation Steps

1. **Create `package.json`** with same key deps as web app:
   `react`, `react-dom`, `zustand`, `axios`, `socket.io-client`, `dexie`, `lucide-react`, `clsx`, `tailwindcss`, `@tailwindcss/vite`, `daisyui`, `vite`, `@vitejs/plugin-react`, `vite-plugin-pwa`, `sonner`

2. **Create `vite.config.js`**:
   ```js
   import { defineConfig } from "vite";
   import react from "@vitejs/plugin-react";
   import { VitePWA } from "vite-plugin-pwa";
   import path from "path";
   export default defineConfig({
     plugins: [react(), VitePWA({ registerType: "autoUpdate" })],
     resolve: { alias: { "@": path.resolve(__dirname, "src") } },
   });
   ```

3. **Create `index.html`** — standard Vite template with viewport `width=device-width, initial-scale=1, maximum-scale=1` (prevents zoom on input focus on iOS).

4. **Create `src/app.css`**:
   - `@import "tailwindcss"`
   - `@plugin "daisyui"`
   - Google Fonts import for Plus Jakarta Sans
   - `lovekit` theme block (tokens above)
   - Scoped: `[data-theme="lovekit"] { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }`

5. **Create `src/main.jsx`**: minimal `ReactDOM.createRoot(...).render(<StrictMode><App /></StrictMode>)`.

6. **Copy stores**: copy each store file, grep for `@/` imports and rewrite to relative paths. Run a quick sanity: all imports resolve.

7. **Copy services**: copy entire `LocketDioServices/` and `LocketServices/` dirs. Fix import paths.

8. **Adapt `lib/axios.js`**: set `baseURL: import.meta.env.VITE_API_URL || "http://localhost:5001"`.

9. **Copy context + socket + cache + hooks + utils + constants**.

10. **Create `.env.example`**: `VITE_API_URL=http://localhost:5001`

11. **Create `WarmCard.jsx`** (≤80 lines):
    - Props: `children`, `className`, `padded` (default true)
    - Classes: `rounded-3xl bg-base-100 shadow-[0_4px_24px_-8px_rgba(249,115,22,0.18)] border border-base-200`

12. **Create `EmptyState.jsx`** (≤80 lines):
    - Props: `icon` (Lucide), `title`, `subtitle`, `action`
    - Centered column, warm amber gradient blob behind icon

13. **Create `LoadingSkeleton.jsx`** (≤100 lines):
    - `variant`: `card` | `line` | `avatar` | `feed`
    - `animate-pulse bg-base-200`

14. **Run `npm install && npm run build`** — must succeed with no errors.

## Todo

- [x] Create `package.json`
- [x] Create `vite.config.js`
- [x] Create `index.html`
- [x] Create `.env.example`
- [x] Create `src/main.jsx`
- [x] Create `src/app.css` with lovekit theme
- [x] Copy + fix stores (6 stores)
- [x] Copy + fix services (LocketDioServices + LocketServices)
- [x] Adapt `lib/axios.js` — env var baseURL
- [x] Copy context/socket/cache/hooks/utils/constants
- [x] Create `WarmCard.jsx`
- [x] Create `EmptyState.jsx`
- [x] Create `LoadingSkeleton.jsx`
- [x] `npm install && npm run build` — green

## Success Criteria

- [x] `npm run dev` starts on port 5173 (or 5174) without errors
- [x] `npm run build` succeeds
- [x] No files modified in `apps/self-hosted/web/`
- [x] All store imports resolve (check with `npm run build` — rollup will catch missing deps)

## Risk Assessment

- **`@/` path aliases in copied code** (H/H): Must grep every copied file for `@/` and rewrite to relative or ensure vite alias configured identically. Fix before moving on.
- **Missing deps** (M/M): Some imports in copied stores may reference packages not listed in old `package.json` explicitly — `npm run build` will surface them.
- **Dexie DB name collision** (L/L): rename to `lovekit-moments-db` in `momentDB.js` copy.

## Chrome MCP Testing Checklist

Activate `ck:chrome-devtools` after `npm run dev` starts:

```
navigate http://localhost:5173
viewport 390x844
screenshot → verify: cream background (#FFFBF0), orange primary color visible
console_errors → must be zero errors
```

- [ ] App loads without JS errors
- [ ] Background color is `#FFFBF0` (cream) — not white
- [ ] `npm run build` output logged: zero rollup errors
- [ ] No files under `apps/self-hosted/web/` show as modified in `git diff`

## Completion Protocol

**When this phase is done:**
1. Update frontmatter `status: pending` → `status: completed`
2. Check off all items in `## Todo` above
3. Open `plan.md` → update Phase 01 row Status column: `pending` → `completed`
4. Commit with message: `feat(lovekit): phase 01 — scaffold + design tokens`
