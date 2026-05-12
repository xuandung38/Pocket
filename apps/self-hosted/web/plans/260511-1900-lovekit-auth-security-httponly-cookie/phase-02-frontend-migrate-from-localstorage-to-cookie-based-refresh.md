---
phase: 2
title: "Frontend: migrate from localStorage to cookie-based refresh"
status: pending
priority: P1
effort: "2h"
dependencies: [1]
---

# Phase 02: Frontend — Migrate from localStorage to Cookie-Based Refresh

## Overview

Update lovekit frontend to stop storing `refreshToken` in `localStorage`. Route token refresh through the new `/auth/refresh` API endpoint. Update `useAuthStore.logout` to call `/auth/logout`.

## Requirements

**Functional**
- `refreshToken` never written to `localStorage` on any code path
- Token refresh calls `POST /api/auth/refresh` with `credentials: 'include'` (cookie sent automatically)
- Logout calls `POST /api/auth/logout` to clear cookie server-side

**Non-functional**
- `idToken` may stay in `localStorage` (it's short-lived ~1h, not a takeover vector by itself)
- `localId` (uid) stays in `localStorage` — not sensitive

## Architecture

**Current flow (broken):**
```
Login → Firebase → { idToken, refreshToken, localId } → store all in localStorage
axios interceptor → idToken expired? → read refreshToken from localStorage → call Firebase directly
```

**New flow:**
```
Login → Firebase → { idToken, localId } → store in localStorage; API sets lk_refresh cookie
axios interceptor → idToken expired? → POST /api/auth/refresh → cookie sent auto → receive new idToken
Logout → POST /api/auth/logout → cookie cleared; clear localStorage auth keys
```

## Related Code Files

- **Modify**: `apps/self-hosted/lovekit/src/stores/storage.js` (lines 47-61) — remove refreshToken writes
- **Modify**: `apps/self-hosted/lovekit/src/lib/axios.js` — change refresh call from Firebase direct → `/api/auth/refresh`
- **Modify**: `apps/self-hosted/lovekit/src/stores/useAuthStore.js` — update logout to call `/api/auth/logout`
- **Modify**: `apps/self-hosted/lovekit/src/screens/LoginScreen.jsx` (lines 41-48) — remove refreshToken localStorage write

## Implementation Steps

1. **`storage.js`**: Remove all `localStorage.setItem('refreshToken', ...)` and `localStorage.getItem('refreshToken')` calls. Keep idToken + localId.

2. **`axios.js`**: Update token refresh interceptor:
   ```js
   // BEFORE: called Firebase directly with localStorage refreshToken
   // AFTER:
   async function refreshIdToken() {
     const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
       method: 'POST',
       credentials: 'include',  // sends lk_refresh cookie
     });
     if (!res.ok) throw new Error('refresh_failed');
     const { idToken } = await res.json();
     localStorage.setItem('idToken', idToken);
     return idToken;
   }
   ```
   Update `cachedExp = 0` reset call after successful refresh.

3. **`LoginScreen.jsx`**: After Firebase login success, do NOT write `refreshToken` to localStorage. The API login proxy (Phase 01) already set the cookie. If login goes directly to Firebase (not via API proxy), add a call to `POST /api/auth/set-cookie` passing the refreshToken once, so API can set the cookie and client discards it.

4. **`useAuthStore.logout`**: Add `fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })` call before clearing localStorage keys.

5. Remove `refreshToken` from `sessionStorage` clear in `App.jsx` (logout handler) — it was never in sessionStorage but may be in the clear list.

## Todo

- [ ] `storage.js`: remove all refreshToken localStorage reads/writes
- [ ] `axios.js`: redirect refresh call to `/api/auth/refresh` with `credentials: 'include'`
- [ ] `LoginScreen.jsx`: do not write refreshToken to localStorage
- [ ] `useAuthStore.logout`: call `/api/auth/logout` before clearing keys
- [ ] `App.jsx` logout handler: remove `localStorage.removeItem('refreshToken')` (still call it for cleanup of any old stored value, but don't rely on it)
- [ ] Verify: after login, `localStorage` has no `refreshToken` key
- [ ] Verify: after idToken expires (~1h), refresh works via cookie automatically

## Success Criteria

- [ ] `localStorage.getItem('refreshToken')` returns null after fresh login
- [ ] idToken refresh works transparently (session stays alive past 1h)
- [ ] Logout clears cookie (verify in DevTools → Application → Cookies: no `lk_refresh`)
- [ ] No new console errors in auth flow

## Risk Assessment

- **Login path**: if Lovekit logs in via Firebase SDK directly (not API proxy), there's no server-side hook to set the cookie. Must add a `/auth/set-cookie` call after login, OR proxy the login through the API. Inspect `LoginScreen.jsx` before implementing.
- **Fetch vs axios for refresh**: the refresh call must NOT use the same axios instance (would cause infinite interceptor loop). Use plain `fetch` or a separate axios instance.

## Completion Protocol

1. Update frontmatter `status: pending` → `status: completed`
2. Check off all Todo items
3. Update `plan.md` Phase 02 row
4. Commit: `fix(lovekit): remove refreshToken from localStorage, use HttpOnly cookie`
