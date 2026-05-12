# Lovekit Locket Layout — Build Verification Report

- **Date:** 2026-05-11
- **Branch:** `feat/fix-selfhost`
- **Team:** lovekit-locket-layout
- **Tester:** tester (Task #11)
- **Scope:** Post-merge integration verification of all Phase 01–05 changes

---

## Build

- **Status:** PASS
- **Tool:** `vite v6.4.2` (`npm run build`)
- **Modules:** 1975 transformed
- **Time:** 1.76s
- **Bundle (uncompressed / gzip):**
  - `dist/index.html` — 1.25 kB / 0.51 kB
  - `dist/assets/index-*.css` — 69.04 kB / 12.43 kB
  - `dist/assets/icons-*.js` — 18.30 kB / 5.44 kB
  - `dist/assets/socket-*.js` — 41.58 kB / 13.01 kB
  - `dist/assets/swiper-*.js` — 87.49 kB / 27.04 kB
  - `dist/assets/react-*.js` — 134.66 kB / 43.22 kB
  - `dist/assets/index-*.js` — 273.43 kB / 88.98 kB
- **PWA:** generateSW mode, 11 precache entries (611.20 KiB), `sw.js` + `workbox-*.js` emitted
- **Exit code:** 0

## Verifications

- [PASS] **BottomTabBar removed** — `grep -r "BottomTabBar" src/` returned no matches
- [PASS] **JWT escape() removed** — `grep -r "escape("` returned no matches in `src/`; `App.jsx::decodeJwtPayload` uses safe `atob` + `Uint8Array` + `TextDecoder` path
- [PASS] **resetTokenCache wired** —
  - `src/lib/axios.js:19` exports `resetTokenCache()`
  - `src/stores/useAuthStore.js:2` imports it
  - `src/stores/useAuthStore.js:119` calls it inside logout flow
- [PASS] **`src/hooks/useSwipeNav.js` exists** — 1.0 KB, non-empty, exports `useSwipeNav(navState, setNavState)` returning `{ onTouchStart, onTouchEnd }`
- [PASS] **`src/components/FriendMomentRow.jsx` exists** — 3.1 KB, non-empty
- [PASS] **`src/components/ui/BottomTabBar.jsx` deleted** — `ls` returns "No such file or directory"

## Test Suite

- **Status:** N/A — no `test` script defined in `package.json`
- Available scripts: `dev`, `build`, `preview`
- No unit / integration test framework configured for this app

## Warnings

- **None from build.** Vite output emitted no deprecation, dependency, or chunking warnings.
- daisyUI 5.5.19 banner only (informational).
- Bundle sizes within reason; main `index-*.js` chunk at 273 kB / 89 kB gzip is acceptable for a feature-rich PWA but worth monitoring as feature surface grows.

## Code Scan (key files)

### `src/App.jsx` (124 lines)
- Imports clean, all referenced modules exist (`@/hooks/useSwipeNav`, screen modules, `SocketProvider`, `Toaster`).
- JWT decode hardened — uses `atob` + base64url normalization + `TextDecoder`; no legacy `escape()`/`decodeURIComponent` chain. Catches throw, returns `null` safely.
- `isTokenValid` returns `true` when payload lacks `exp` (treated as non-expiring) — intentional fallback.
- Nav state persisted via `sessionStorage` (`lk:nav`) with allowlist guard (`NAV_KEYS.includes(saved)`) — XSS-safe.
- `screenStyle` uses `visibility: hidden` on inactive screens — prevents flash without breaking transform-based slide animations (per Phase 05 polish).
- Touch handlers wired through `useSwipeNav`; main element `touchAction: pan-y` allows vertical scroll inside children.
- Logout clears both `localStorage` and `sessionStorage` for `idToken`, `localId`, `refreshToken`.
- Note: `handleLogout` does **not** call `resetTokenCache` directly — but `useAuthStore.clearAndlogout` does (Dev-6 wiring), and any non-store-driven logout path here would skip the axios cache reset. Acceptable since SettingsSheet logout flows through the store.

### `src/hooks/useSwipeNav.js` (39 lines)
- Pure custom hook, `useCallback` + `useRef` only — no side effects.
- 50 px threshold; ignores micro-gestures.
- Camera screen routes 4 directions (up→feed, left→messages, right→profile, swipe-back).
- All non-camera screens collapse any swipe back to camera (matches Locket UX).
- No external imports beyond React.
- No undefined refs, no missing imports.

### `src/screens/FeedScreen.jsx` (240 lines)
- Imports valid (`clsx`, lucide `Sparkles`, EmptyState, LoadingSkeleton, FriendAvatar, EmojiReactionBar, utils, store hooks).
- Zustand selectors are atomic per slice (`s.user`, `s.fetchMoments`, etc.) — Phase 04C fix applied; no full-store subscriptions detected.
- Field-normalization helpers (`thumbnailUrl || thumbnail_url || image_url`, etc.) accommodate camelCase/snake_case backend variance.
- IntersectionObserver-driven infinite scroll with proper cleanup (`observer.disconnect()` in effect cleanup).
- Pull-down-to-camera gesture only triggers when `scrollTop <= 0` — correct guard.
- Scroll-snap container uses `scrollSnapType: "y mandatory"` + per-slide `scrollSnapAlign: "start"` + `100dvh` height — Locket-style fullscreen swiper confirmed.
- Safe-area insets respected for caption + reaction bar.
- Caption fallback "Bạn"/"Người dùng" provides UX safety when friend data missing.
- No undefined references; all destructured optional chains guarded.

## Critical Issues

- **None.** Build is green, all 6 structural verifications pass, no compilation/syntax errors detected, no obvious runtime hazards in audited files.

## Recommendations

1. Add a smoke test script (vitest or playwright) covering: login gate, swipe nav state machine, JWT decode edge cases (expired, malformed, no-exp). Currently zero automated coverage.
2. Consider extracting `decodeJwtPayload` / `isTokenValid` from `App.jsx` into `src/lib/jwt.js` to ease unit testing and reuse in `axios.js`.
3. Track `index-*.js` chunk growth; near 300 kB raw, splitting heavy screens (CameraScreen, FeedScreen) via `React.lazy` may be worthwhile post-launch.

## Next Steps

- Unblock Reviewers #12 (security), #13 (performance), #14 (code quality).
- Consider follow-up ticket: introduce vitest scaffolding for `useSwipeNav` and JWT helpers.

## Unresolved Questions

- None. All task acceptance criteria met.

---

**Status:** DONE
**Summary:** Build PASS in 1.76s (1975 modules, 273 kB main chunk); all 6 structural verifications PASS; no test script available; key files scanned clean.
