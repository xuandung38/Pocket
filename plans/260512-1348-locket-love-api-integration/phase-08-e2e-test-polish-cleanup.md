---
phase: 8
title: "E2E test + polish + cleanup"
status: pending
priority: P2
effort: "5h"
dependencies: [1, 2, 3, 4, 5, 6, 7]
---

# Phase 8: E2E test + polish + cleanup

## Overview
Lock in quality: end-to-end smoke tests of the critical flows, polish loading/error/empty states, remove all remaining mock-data, document the new app, and ensure `apps/main` is unaffected. Add captcha (Turnstile) if backend rejects auth without it.

## Requirements
**Functional:**
- All flows verified end-to-end against real backend with two test accounts:
  - Login (email + phone)
  - Send a moment with a friend's account → receiver sees it in feed
  - Reply to friend's moment → message lands in chat
  - React to friend's moment → reactor visible in author's Activity panel
  - Edit profile name/email/avatar → persists across reload
  - Memories calendar → date click → filtered feed
  - Logout → returns to login screen
- All loading states render skeletons, not blank screens
- All error states surface as toasts with retry where applicable
- All empty states have friendly messages

**Non-functional:**
- No mock-data imports remain in screen/sheet files (only `caption-stickers` allowed)
- No `console.log` left in production paths
- README updated with the new app, dev setup, env vars
- `apps/main` boots and works unchanged
- Build size for `apps/locket-love` <500kB gzipped initial JS

## Architecture
N/A — quality + cleanup phase.

## Related Code Files
**Modify:**
- `apps/locket-love/README.md` (create) — quick start, env vars, port, link to plan doc
- `apps/locket-love/src/data/mock-data.js` — final cleanup (delete file if everything migrated; keep `caption-stickers.js` if still used)
- `apps/locket-love/src/components/ui/skeleton.jsx` — generic skeleton primitive (rounded gray box w/ shimmer)
- `apps/locket-love/src/components/ui/error-state.jsx` — empty/error display with retry
- All screens — replace `null` / blank during loading with `<Skeleton variant="..."/>`
- `apps/locket-love/src/screens/login-screen.jsx` — add Turnstile if backend requires captcha (use existing `react-turnstile` from `apps/main`)

**Create:**
- `apps/locket-love/README.md`

**Delete:**
- `apps/locket-love/src/data/mock-data.js` (if fully migrated; otherwise document what remains)

## Implementation Steps
1. Manual E2E with 2 accounts:
   - Account A logs in, captures + sends moment to Account B
   - Account B sees it in feed within 5s, reacts 🔥
   - Account A sees the reaction in "Hoạt động" within 5s
   - Account B replies → message in chat
   - Both reload → state persists
2. Build `Skeleton` primitive (CSS shimmer animation)
3. Apply skeletons:
   - FeedScreen: 3 placeholder cards while initial fetch
   - MemoriesScreen: gray month grid while initial fetch
   - ChatListScreen: 5 placeholder rows
   - ProfileSheet: gray avatar + name lines while loading
4. Build `ErrorState` component: icon + message + retry button
5. Apply to: failed feed fetch, failed friends fetch, failed memories fetch
6. Replace any console.log with optional debug-only logger
7. Cleanup `mock-data.js`:
   - Delete `feedMoments`, `memoriesCalendar`, `memoriesMonths`, `memoriesStats` (Phase 4)
   - Delete `friends`, `currentUser` (Phase 3 — already replaced in stores)
   - Move `captionStickersGeneral`, `captionStickersDecorative` to `data/caption-stickers.js` (kept)
   - Move/delete `searchableUsers` (was used in FriendsSheet — replaced by API in Phase 7)
   - Move `chatMessages`, `conversations` to `apps/main` only (Phase 6 replaced them)
   - If file is empty → `git rm`
8. Add Turnstile to login if needed:
   - Install `react-turnstile` (already in `apps/main` deps)
   - Add `<Turnstile siteKey={...} onVerify={setCaptchaToken}/>` above the submit button
   - Pass `captchaToken` to login services
9. Write `README.md`:
   - What it is, how to run, env setup, port
   - Link to `plans/260512-1348-locket-love-api-integration/`
   - Link to `docs/design-patterns.md`
10. Run `npm run build` — confirm bundle size acceptable
11. Verify `apps/main` boots & works unchanged
12. Verify `npm run dev --prefix apps/locket-love` runs side-by-side with `apps/main` on different ports

## Success Criteria
- [ ] All E2E flows pass with two real accounts
- [ ] No `mock-data` references in `screens/` or `components/`
- [ ] All loading states show skeletons (no blank flashes)
- [ ] All error paths show toasts/retry (no silent failures)
- [ ] Bundle size for initial route <500kB gzipped
- [ ] `apps/main` builds + boots unchanged
- [ ] README documents setup, ports, env, links to plan
- [ ] No `console.log` in non-debug paths

## Risk Assessment
- **Risk:** Backend requires Turnstile captcha — login fails after Phase 2 push.
  **Mitigation:** Phase 8 adds Turnstile as the polish step; if needed earlier, hot-fix Phase 2.
- **Risk:** Bundle size blows up due to copied utilities pulling unused deps (e.g. confetti).
  **Mitigation:** import only what's used; tree-shake; verify with `npm run build` size report.
- **Risk:** E2E reveals broken backend contract (e.g. moment creation field renamed).
  **Mitigation:** budget half a day for hot-fixes during E2E phase; escalate spec issues if found.
- **Risk:** Two accounts on same backend in dev hit rate-limits.
  **Mitigation:** use staging tokens with elevated quota or stagger test runs.

## Open Questions
- Does production backend require Turnstile for `loginWithEmail` / `loginWithPhone`? (determines if Phase 2 ships with captcha or skips until Phase 8)
- Is there a `getMomentMetadata` calendar endpoint, or do we derive from feed pagination? (impacts Phase 4 architecture)
- What's the correct socket event name for reactions (`reaction:new`? `moment:reaction`?) — confirm against backend.
