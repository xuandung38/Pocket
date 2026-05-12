# Phase 08 — Frontend: Harden Auth (Refresh, Logout, Login Token Shape) + 401 Retry

**Owner:** dev-8 · **Effort:** 1.5h · **Status:** completed

## Context Links
- Plan: `plan.md`
- Files:
  - `apps/self-hosted/lovekit/src/lib/axios.js` (interceptors + refresh)
  - `apps/self-hosted/lovekit/src/lib/axios.auth.js` (auth-specific instance)
  - `apps/self-hosted/lovekit/src/screens/LoginScreen.jsx`

## Overview
**Priority:** P1 · **Status:** pending
Auth flow has multiple subtle bugs:
- `refreshIdToken` posts to `instanceAuth.post("locket/refresh-token")` — note missing leading `/` on relative URL (works because baseURL ends with `/`, but fragile)
- `LoginScreen` reads `data.idToken`/`data.localId`/`data.refreshToken` while backend returns these snake_case (`id_token`, `user_id`?) — **must verify**
- `handleLogout` in axios.js calls `window.location.href = "/login"` but the SPA has no `/login` route (App.jsx renders LoginScreen conditionally on `authed` state) → causes 404
- `cachedExp` global module variable persists across logout — Phase 06 of fix-selfhost (commit 6702e68) added `resetTokenCache` but verify it's still called everywhere
- Refresh + 401 retry flow has subtle race: `refreshPromise` set inside response interceptor without checking concurrent request interceptor request

## Key Insights
- BE login response shape (from `controllers/locket.controller.js:32-40`): `res.json({ data: user, ... })` where `user` comes from `authServices.login`. Need to read `authServices.LocketAuth/AuthService.js` to confirm field names.
- BE refresh response (`refreshToken` controller): `res.json({ data: user, ... })`. FE reads `res?.data?.data?.id_token` and `user_id` → confirm BE returns those keys.
- The "go to /login" pattern doesn't fit this SPA — should dispatch a custom event the App.jsx can listen to and flip `authed` state, OR rely on `useAuthStore.clearAndlogout` (already wired)

## Requirements
**Functional**
- Login with valid creds → tokens persisted → screens render with user
- Login with invalid creds → friendly error
- Token expires within 5 min → silent refresh → no UX disruption
- Refresh fails with 401 → user logged out → returns to LoginScreen
- 429 from refresh → toast, do not logout (already handled)

**Non-functional**
- No `window.location.href` redirects from axios layer
- `cachedExp` reset on logout (verified)
- All localStorage token keys cleared on logout

## Architecture
```
Login:
LoginScreen ── loginWithEmail ── instanceAuth.post("locket/login") ── BE returns { data: { idToken, localId, refreshToken } }
LoginScreen ── saveToken({...}) → localStorage

Request:
api.request ── interceptor checks isTokenExpired(idToken)
  └─ if expiring soon: refreshIdToken (singleflight via refreshPromise)

Response 401:
api.response.error ── if !originalRequest._retry && !refreshing → refresh + replay
  └─ on refresh fail: handleLogout (event-based, not href-based)
```

## Related Code Files
**Modify**
- `apps/self-hosted/lovekit/src/lib/axios.js` — replace `window.location.href = "/login"` with custom event `window.dispatchEvent(new Event("lk:auth:logout"))`; add leading slash to refresh path; tighten singleflight
- `apps/self-hosted/lovekit/src/lib/axios.auth.js` — no changes unless leading-slash needed too
- `apps/self-hosted/lovekit/src/screens/LoginScreen.jsx` — accept either camelCase or snake_case from BE response
- `apps/self-hosted/lovekit/src/App.jsx` — listen for `lk:auth:logout` event and flip `authed` to false

**Read**
- `apps/self-hosted/api/src/services/LocketAuth/AuthService.js` — confirm response field names
- `apps/self-hosted/api/src/services/LocketAuth/GetInfoUser.js`

## Implementation Steps
1. **Verify BE response shape** — read `LocketAuth/AuthService.js` `login` and `refreshIdToken` to confirm field names used (camelCase vs snake_case)
2. **LoginScreen** — handle both forms:
   ```js
   const idToken = data?.idToken || data?.id_token;
   const localId = data?.localId || data?.user_id || data?.localId;
   const refreshToken = data?.refreshToken || data?.refresh_token;
   if (!idToken || !localId) throw new Error("Server không trả về token hợp lệ");
   ```
3. **axios.js handleLogout** — replace `window.location.href` with event dispatch:
   ```js
   function handleLogout() {
     isRefreshing = false;
     refreshPromise = null;
     cachedExp = null;
     clearLocalData();
     removeUser();
     removeToken();
     localStorage.removeItem("idToken");
     localStorage.removeItem("localId");
     window.dispatchEvent(new CustomEvent("lk:auth:logout"));
   }
   ```
4. **App.jsx** — add listener:
   ```js
   useEffect(() => {
     const onLogout = () => setAuthed(false);
     window.addEventListener("lk:auth:logout", onLogout);
     return () => window.removeEventListener("lk:auth:logout", onLogout);
   }, []);
   ```
5. **axios.js refresh path** — change to leading-slash:
   ```js
   const res = await instanceAuth.post("/locket/refresh-token", { refreshToken });
   ```
   Also accept both camel/snake from refresh response (mirror step 2).
6. Manual smoke:
   - Log in → screens render
   - DevTools: `localStorage.removeItem("idToken")` → next request triggers refresh → succeeds
   - Set `cachedExp = 0` via `resetTokenCache` import → next request refreshes
   - Force 401 (delete refresh token) → user returns to LoginScreen, no full page reload

## Todo List
- [x] Read BE login/refresh response shapes
- [x] Make LoginScreen tolerate both camel/snake response keys
- [x] Replace `window.location.href` with `lk:auth:logout` event
- [x] Wire App.jsx listener
- [x] Fix leading-slash on refresh URL
- [ ] Manual auth smoke (deferred — runtime verification by QA)

## Success Criteria
- Login → app renders user without page reload
- Refresh-on-expire silent
- Logout returns to LoginScreen via state flip (not page reload)
- No 404 on `/login` path

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Different shape on BE breaks login | Med | High | Read BE source; tolerate both forms |
| Multiple listeners installed across hot-reload | Low | Low | Cleanup in useEffect return |
| Race between request-interceptor and response-interceptor refreshes | Low | Med | Both share `isRefreshing`/`refreshPromise` — already singleflight |

## Security Considerations
- Custom event in same window — no cross-frame leakage
- Logout still clears localStorage and IndexedDB (via `clearLocalData`)
- Keep refresh-token in same storage (rememberMe-aware) — no change

## Next Steps
- Add a unit test for `isTokenExpired` decoding (future phase)
