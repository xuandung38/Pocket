---
phase: 2
title: "Auth integration (login/logout/refresh)"
status: pending
priority: P1
effort: "5h"
dependencies: [1]
---

# Phase 2: Auth integration (login/logout/refresh)

## Overview
Replace the localStorage-flag mock auth with real `loginWithEmail` / `loginWithPhone` calls, JWT-based session, automatic id-token refresh, and a centralized AuthStore. Drive the existing `LoginScreen` and `RequireAuth` gate from real state.

## Requirements
**Functional:**
- Login screen accepts email **or** phone — auto-detects by presence of `@` and routes to the correct endpoint
- On success: persist `idToken`, `refreshToken`, `localId`, user profile → navigate `/`
- On failure: show inline error (`SonnerError` toast for transient, inline text for `601 unknown account` / `400 wrong password`)
- Token auto-refreshes when remaining lifetime <5min (use existing `axios.js` interceptor)
- Logout clears tokens + local data + navigates to `/login`
- Cold-load with valid refresh token → silent refresh + go straight to `/` (no flash of login screen)

**Non-functional:**
- Network errors don't crash UI — caught and surfaced via toast
- Token storage matches `apps/main` keys (`idToken`, `localId`) so the user can switch between apps without re-auth

## Architecture
```
LoginScreen (UI)
    ↓ submit
authActions.login(identifier, password)
    ↓ ValidateEmailAddress + loginV2/loginWithPhoneV2
LocketDio backend
    ↓ tokens
AuthStore (zustand) ← single source of truth
    ↓ subscribe
RequireAuth, Profile, Friend stores

Token refresh: axios interceptor (libs/axios.js)
    - on every request: check exp, if <5min → refreshIdToken()
    - 401 from refresh → handleLogout()
```

## Related Code Files
**Create:**
- `apps/locket-love/src/services/AuthServices.js` (copy from `apps/main`, trim what we don't need: skip captcha turnstile if backend allows)
- `apps/locket-love/src/services/index.js`
- `apps/locket-love/src/stores/auth-store.js` — zustand store with `idToken`, `user`, `status` ("idle" | "loading" | "authed" | "error")
- `apps/locket-love/src/components/ui/sonner-toast.jsx` — wrapper around `sonner` for SonnerError/SonnerInfo
- `apps/locket-love/src/main.jsx` — mount `<Toaster />` at app root

**Modify:**
- `apps/locket-love/src/screens/login-screen.jsx`
  - Replace mock submit with `authActions.login({ identifier, password })`
  - Detect email vs phone (`identifier.includes('@')`)
  - Show loading state on button (spinner + disabled)
  - Show inline error message
- `apps/locket-love/src/App.jsx`
  - `RequireAuth` reads from AuthStore (not localStorage directly)
  - Add bootstrap check on first mount: if `refreshToken` present → silent refresh → re-evaluate auth
- `apps/locket-love/src/components/sheets/profile-sheet.jsx`
  - `handleLogout` → `authActions.logout()` (clears store + tokens + nav)

## Implementation Steps
1. Add deps: `npm i jwt-decode sonner` (skipped in Phase 1)
2. Copy `apps/main/src/services/LocketDioServices/AuthServices.js` → `apps/locket-love/src/services/AuthServices.js`; remove unused imports (BETA_SERVER_HOST if not needed)
3. Create `auth-store.js`:
   ```js
   export const useAuthStore = create((set) => ({
     idToken: localStorage.getItem("idToken") || null,
     user: JSON.parse(localStorage.getItem("user") || "null"),
     status: "idle",
     setSession: ({ idToken, user, refreshToken, localId }) => { ... persist + set ... },
     clear: () => { ... remove + set null ... },
   }));
   ```
4. Build `authActions` (plain functions outside store): `login()`, `logout()`, `bootstrap()`
5. Create `sonner-toast.jsx` — exports `SonnerError`, `SonnerInfo`, `SonnerSuccess`. Mount `<Toaster richColors />` in `main.jsx`
6. Wire `LoginScreen.handleSubmit`:
   - `setLoading(true)` → `authActions.login(...)` → on success `navigate('/')`, on fail `setError(err.message)` + `SonnerError`
   - Disable button + show spinner while loading
7. Wire `App.jsx` bootstrap:
   - On mount, if `refreshToken` exists, call `bootstrap()` → silent refresh → set status. Show `<LoadingFallback />` until status != "loading"
   - `RequireAuth` reads `useAuthStore((s) => s.status === "authed")`
8. Wire `profile-sheet.jsx` `handleLogout` → `authActions.logout()`
9. Smoke-test: cold-load with no token → login screen; login with real creds → /; refresh page → stay on /; logout → /login

## Success Criteria
- [ ] Real login succeeds with valid credentials, fails gracefully with bad
- [ ] Cold reload with valid session keeps user on `/` (no flash of login)
- [ ] Logout clears `idToken`, `refreshToken`, `localId`, `user` from localStorage
- [ ] Token refresh fires automatically when token nears expiry (verify via console.log in interceptor)
- [ ] Network failure shows toast, doesn't crash
- [ ] `apps/main` and `apps/locket-love` share the same logged-in session (both read same localStorage keys)

## Risk Assessment
- **Risk:** Email-vs-phone detection too naive (e.g. user types `+84` and gets sent to email endpoint).
  **Mitigation:** add `/^\+?\d/` phone regex check before falling back to email path.
- **Risk:** Captcha (`captchaToken`) required by backend in prod — `apps/main` uses Turnstile.
  **Mitigation:** Phase 2 ships without captcha; if backend rejects, add Turnstile in Phase 8 polish.
- **Risk:** Race condition on bootstrap: RequireAuth renders before refresh completes → false redirect to `/login`.
  **Mitigation:** show `<LoadingFallback />` while `status === "loading"` so RequireAuth waits.
- **Risk:** Forgetting to migrate the localStorage `locket-auth` key → users get auto-logged-out on first deploy.
  **Mitigation:** delete that key in `bootstrap()` once if present (one-time migration).
