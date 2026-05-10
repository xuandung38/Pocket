---
phase: 3
title: "Hardening: cachedExp reset + logout key audit"
status: pending
priority: P2
effort: "2h"
dependencies: [2]
---

# Phase 03: Hardening — cachedExp Reset + Logout Key Audit

## Overview

Clean-up pass: (1) ensure module-level `cachedExp` in `axios.js` resets on logout, (2) audit all localStorage keys cleared on logout to ensure completeness without over-clearing, (3) verify no remaining `refreshToken` references anywhere in the codebase.

## Requirements

**Functional**
- After logout + re-login as different user, token cache is fresh (no stale exp from previous session)
- Logout clears exactly: `idToken`, `localId`, `lk:nav` (sessionStorage), and the HttpOnly cookie (Phase 02)
- Logout does NOT clear: theme, deviceId, IndexedDB caches (friendsDB, momentDB)

**Non-functional**
- No `refreshToken` string left in any source file except historical comments
- `resetTokenCache()` exported from `axios.js` and called from `useAuthStore.logout`

## Implementation Steps

1. **Audit `refreshToken` references**:
   ```bash
   grep -r "refreshToken" apps/self-hosted/lovekit/src/ --include="*.js" --include="*.jsx"
   ```
   Any remaining hits (other than comments) must be removed.

2. **`axios.js` — `resetTokenCache`** (may already be done in Phase 04 of the layout plan):
   - Confirm `export function resetTokenCache() { cachedExp = 0; }` is present
   - If already done in Phase 04, verify and mark complete

3. **`useAuthStore.logout` — call `resetTokenCache`**:
   ```js
   import { resetTokenCache } from '@/lib/axios';
   // inside logout action:
   resetTokenCache();
   ```

4. **Logout key audit** — enumerate all keys cleared on logout and cross-check:
   | Key | Cleared? | Should clear? |
   |-----|---------|---------------|
   | `idToken` | ✓ | Yes |
   | `localId` | ✓ | Yes |
   | `refreshToken` | was ✓, now N/A (cookie) | Remove the call |
   | `lk:nav` (sessionStorage) | check | Yes |
   | `lk:swipe-hint-seen` | check | No — user preference |
   | `theme` | check | No |
   | `deviceId` | check | No |

5. **Smoke test** — login as user A → logout → login as user B:
   - Verify no moments/friends from user A visible after B logs in (IndexedDB scoped by uid? confirm)
   - Verify no stale token decisions (check network tab — no 401s on first authenticated request)

## Todo

- [ ] `grep -r refreshToken` → zero hits in src/ (excluding comments)
- [ ] Confirm `resetTokenCache` exported from `axios.js` and called in `useAuthStore.logout`
- [ ] Logout key audit table — confirm correct set of cleared keys
- [ ] Remove `localStorage.removeItem('refreshToken')` leftover calls (cleanup, not functional)
- [ ] Smoke test: A → logout → B flow, no cross-session data leakage

## Success Criteria

- [ ] Zero `refreshToken` localStorage references in source
- [ ] `cachedExp` resets on every logout
- [ ] Logout clears auth keys only, not device/theme/cache keys
- [ ] A→B session switch shows no stale data from A

## Risk Assessment

- **IndexedDB cross-user contamination**: moments and friends may be cached without uid scoping. If user B sees user A's cached friends, this is a separate data-isolation bug. Out of scope for this security plan but worth noting.
- **`lk:swipe-hint-seen` on logout**: intentionally NOT cleared (user UX preference). If cleared, the hint reappears after every login — bad UX.

## Completion Protocol

1. Update frontmatter `status: pending` → `status: completed`
2. Check off all Todo items
3. Update `plan.md` Phase 03 row + top-level `status: completed`
4. Commit: `fix(lovekit): phase 03 — cachedExp reset, logout key audit`
