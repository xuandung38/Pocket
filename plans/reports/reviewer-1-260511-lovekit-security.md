---
title: Lovekit Locket Layout — Security Review
reviewer: reviewer-1
date: 2026-05-11
branch: feat/fix-selfhost
team: lovekit-locket-layout
scope: JWT, auth flow, localStorage, socket lifecycle, touch handler XSS surface
---

# Lovekit Security Review (Reviewer-1)

## Scope

Files reviewed (all in full):
- `apps/self-hosted/lovekit/src/App.jsx`
- `apps/self-hosted/lovekit/src/lib/axios.js`
- `apps/self-hosted/lovekit/src/lib/axios.auth.js` (cross-ref)
- `apps/self-hosted/lovekit/src/stores/useAuthStore.js`
- `apps/self-hosted/lovekit/src/components/SettingsSheet.jsx`
- `apps/self-hosted/lovekit/src/context/SocketContext.jsx`
- `apps/self-hosted/lovekit/src/hooks/useSwipeNav.js`
- `apps/self-hosted/lovekit/src/socket/socketClient.js` (cross-ref)
- `apps/self-hosted/lovekit/src/utils/storage/storage.js` (cross-ref)
- `apps/self-hosted/lovekit/src/utils/storage/clearStorage.js` (cross-ref)
- `apps/self-hosted/lovekit/src/utils/auth/parseToken.js` (cross-ref)
- `apps/self-hosted/lovekit/src/cache/configDB.js` (cross-ref)
- `apps/self-hosted/lovekit/src/screens/ProfileScreen.jsx` (cross-ref)
- `apps/self-hosted/lovekit/src/screens/LoginScreen.jsx` (cross-ref)

Verification commands run: `grep` for `clearAndlogout`, `resetTokenCache`, `cachedExp`, `idToken`, `localStorage|sessionStorage`, XSS sinks (`innerHTML`, `dangerouslySetInnerHTML`, `eval`, `new Function`, `document.write`).

---

## Findings

### [CRITICAL] Active logout path bypasses `clearAndlogout` — `resetTokenCache`, `clearAllDB`, server logout, user-cache wipe NEVER fire on UI logout
**Evidence:**
- `apps/self-hosted/lovekit/src/components/SettingsSheet.jsx:21-32` — `handleLogout()` removes only `idToken / localId / refreshToken` from `localStorage` + `lk:nav` from `sessionStorage`, then calls `onLogout?.()`.
- `apps/self-hosted/lovekit/src/screens/ProfileScreen.jsx:167` — `<SettingsSheet ... onLogout={onLogout} />` forwards to App.
- `apps/self-hosted/lovekit/src/App.jsx:75-83` — `handleLogout` removes 3 keys from local + 3 from session, calls `setAuthed(false)`. That is all.
- `apps/self-hosted/lovekit/src/stores/useAuthStore.js:116-126` — `clearAndlogout()` (the real cleanup: server `logout()`, `removeToken()`, `resetTokenCache()`, `clearAllDB()`, `userData` cache, zustand reset) is **never imported or called from any UI path**. Verified via `grep -rn "clearAndlogout"` → only the definition site appears.
- Effect: after a "logout":
  - server-side `logout()` endpoint is **not called** → session/refresh-token may remain valid server-side.
  - `cachedExp` (axios.js:15) is **not reset** even though `resetTokenCache()` was added for exactly this purpose. The freshly-added export (axios.js:19-21) is dead code.
  - IndexedDB (`lovekit-moments-db`: moments, conversations, messages, viewedMoments) keeps the previous user's data on the device; only `ensureDBOwner` (configDB.js:46-54) clears it later, after a *different* user logs in — until then anyone with device access can read prior chats via DevTools or a local script.
  - `userData` cache key (`localStorage.userData`) keeps the prior user's PII (display name, email, profilePicture, uid) — `useAuthStore.hydrate()` would use it if `idToken` were re-introduced.
  - Other persisted PII keys (`STREAK_KEY`, `friendsList`, `friendDetails`, `lk:weather`, `selectedFrame`, zustand `locket-ui` persist) are not removed.

**Recommendation:** make a single canonical logout path. Either (a) `App.handleLogout` calls `useAuthStore.getState().clearAndlogout()` and only after it resolves does `setAuthed(false)`, or (b) `SettingsSheet.handleLogout` calls `clearAndlogout()` directly and `App` subscribes to `useAuthStore.isAuth` instead of holding its own `authed` state. Remove the duplicated key removal in App + SettingsSheet to avoid skew. Also clear cookies that hold the refresh token (see next finding).

---

### [CRITICAL] Refresh token stored in `localStorage` AND mirrored as cookie — XSS-stealable + persists past logout
**Evidence:**
- `apps/self-hosted/lovekit/src/utils/storage/storage.js:48-61` — `saveToken({ idToken, localId, refreshToken }, true)` writes `refreshToken` to `localStorage`.
- `apps/self-hosted/lovekit/src/lib/axios.js:50-56` — `refreshIdToken()` reads `refreshToken` from storage and sends it in body. Instance also has `withCredentials: true` (axios.js:104), so a refresh cookie is *also* forwarded server-side. Two parallel credentials.
- `apps/self-hosted/lovekit/src/utils/storage/clearStorage.js:14-16` — comment explicitly declines to clear cookies: *"Không nên xoá toàn bộ cookie nếu không thật cần"*. Cookie-borne `refreshToken` therefore survives every logout flow in the codebase.
- Combined with the previous finding, after the SettingsSheet "logout":
  - if cookie is present, an attacker reaching the device can hit `/locket/refresh-token` (instanceAuth still attaches `withCredentials`) and obtain a fresh `idToken` even though local storage was cleared.

**Recommendation:** prefer **one** transport. If using httpOnly cookie, stop also persisting `refreshToken` in `localStorage` (kill the body parameter). On logout, call a server endpoint that invalidates the refresh cookie (server should `Set-Cookie` with `Max-Age=0`). If you must keep both, make sure `clearAndlogout` actually deletes the cookie (`document.cookie = "refreshToken=; Max-Age=0; Path=/; SameSite=Lax; Secure"` for any client-readable variant) and is wired into the UI (see CRITICAL #1).

---

### [CRITICAL] Socket reconnects with stale `idToken` indefinitely, no auth refresh on transport
**Evidence:**
- `apps/self-hosted/lovekit/src/socket/socketClient.js:5-18` — `auth: { token: idToken }` is captured once at construction; `reconnection: true`, `reconnectionAttempts: Infinity`, `reconnectionDelay: 1000…5000`.
- `apps/self-hosted/lovekit/src/context/SocketContext.jsx:13-30` — effect depends only on `user?.uid`. Token rotation (axios.js:60-65 sets a new `idToken` every refresh) does **not** rebuild the socket. The socket therefore keeps reconnecting with the original token until expiry.
- After expiry the server should reject; but if the server validates the token only at handshake (common with `socket.io` middleware), a long-lived underlying connection that was opened with a still-valid token may continue to receive events even after the user logged out client-side, until the transport is torn down. The `disconnect()` only fires when `SocketProvider` unmounts (i.e. `authed` flips to false) — but `App.handleLogout` does flip `authed`, so this is mitigated for the UI logout path. NOT mitigated for: token refresh (token changes, socket keeps the old credential), token revocation (server invalidates token but socket keeps trying with the same one for `Infinity` retries), and server-side logout (since `logout()` is never called — see CRITICAL #1).
- No `socket.off(...)` / cleanup of any application-level event handlers registered later (search target — outside the reviewed files but the listener pattern in `socketClient.js:21-34` registers on `connect`, `disconnect`, `connect_error` only; downstream consumers must un-register themselves). Listener leak risk for any consumer that registers after the socket prop changes.

**Recommendation:** rebuild the socket whenever `idToken` rotates (subscribe to a token-version atom or pass `idToken` into the effect dep array). Cap `reconnectionAttempts` (e.g. 10) so an invalidated token does not retry forever. On logout, call `socket.disconnect()` *and* `socket.removeAllListeners()`. Server middleware should re-verify the token on every handshake **and** disconnect long-lived sockets when the user logs out (publish a logout event to the user's socket room).

---

### [IMPORTANT] `cachedExp` race: a stale value survives a logout-relogin cycle
**Evidence:**
- `apps/self-hosted/lovekit/src/lib/axios.js:15` — `let cachedExp = null;` is module-scoped (single JS thread, but persists for the page lifetime).
- `cachedExp` is reset in three sites: `resetTokenCache()` (axios.js:19-21, dead — see CRITICAL #1), `refreshIdToken()` success branch (axios.js:63), and `handleLogout()` inside axios.js (axios.js:88).
- Logout via UI (App.handleLogout) does **not** call axios.js's `handleLogout()` and does not call `resetTokenCache()`. So if user A logs out then user B logs in **within the same SPA load** (no full page reload because `App` just toggles `authed`), the next request through `api` runs `isTokenExpired()`:
  - `if (!cachedExp)` is *false* (still set to A's `exp`), so timeLeft is computed against A's exp.
  - If A's exp was earlier than B's exp + 300s → request is incorrectly treated as "near-expired" → unnecessary refresh on B's fresh token (using cookie, may succeed and overwrite). 
  - If A's exp was later → token is treated as fresh while it might already be near-expiry → silent loss of preventive refresh.
- Single-thread JS means there is no preemption race, but there is an event-loop ordering hazard: if `setAuthed(false)` and the new login happen back-to-back without `cachedExp` reset, behavior is wrong by construction.
- A second hazard: `isRefreshing/refreshPromise` are also module-globals. If a refresh is in flight when the user logs out + logs back in, the resolved `newToken` (axios.js:60-65) writes to `localStorage` after login completed — `axios.js:61` does `localStorage.setItem("idToken", newToken)` which would **overwrite the new user's freshly-saved token** with the previous user's refreshed token. Severity: high (cross-user token contamination), even though the new user's session would shortly fail with a 401 and trigger another refresh.

**Recommendation:** in `resetTokenCache()` also reset `isRefreshing = false` and `refreshPromise = null`. Wire it into the UI logout (CRITICAL #1). Ideally, abort the in-flight refresh on logout (give it an `AbortController`).

---

### [IMPORTANT] Two sources of truth for auth state — `App.authed` (local `useState`) vs `useAuthStore.isAuth`
**Evidence:**
- `apps/self-hosted/lovekit/src/App.jsx:62-64` — `authed = useState(() => isTokenValid(localStorage.getItem("idToken")))`.
- `apps/self-hosted/lovekit/src/stores/useAuthStore.js:15-49` — store has its own `isAuth` flag set by `hydrate()` and `init()`.
- They drift: axios.js's `handleLogout()` (axios.js:85-99) does not flip either; it relies on `window.location.href = "/login"` to reload. If pathname is already `/login` (App will then mount LoginScreen), the assignment is skipped — no notification, no re-render. Stuck UI.
- A 401 inside any non-`api` instance (axios.auth.js, axios.main.js, axios.exten.js, axios.data.js — all have *their own* request interceptors that only attach the bearer, no refresh logic) will not trigger any logout flow. The user appears authenticated in `App` while every request fails. No global error → silent broken state.

**Recommendation:** delete `App.authed` and subscribe directly to `useAuthStore((s) => s.isAuth)`. Centralize 401-handling: have all axios instances share the same response interceptor (or import `api` for everything). On 401 → call `useAuthStore.getState().clearAndlogout()` → store flip drives the unmount.

---

### [IMPORTANT] `isTokenValid` accepts a JWT with no `exp` claim
**Evidence:**
- `apps/self-hosted/lovekit/src/App.jsx:24-29` — `if (!payload?.exp) return true;`
- A malformed/forged token without `exp` (e.g. `header.eyJ1aWQiOiJ4In0=.sig`) decodes successfully, `payload.exp` is undefined, and the function returns `true` → user is treated as authenticated client-side.
- Defense in depth only — the server still validates the signature — but combined with the missing strict origin check on the `idToken` source (any code can `localStorage.setItem("idToken", "header.eyJ9.sig")`), this means any XSS-injected garbage payload trivially passes the gate and forces a network round-trip with a forged Bearer.

**Recommendation:** treat missing `exp` as invalid: `if (!payload?.exp) return false;`. Same fix in `isTokenExpired` (axios.js:23-43): if `payload?.exp` is missing after parse, return `true` (already does via `if (!payload) return true;` but only if `parseJwt` returns null; a payload object without `exp` falls through with `cachedExp = undefined` → `timeLeft = NaN` → `< 300` is false → token is treated as fresh). Verified: `parseJwt` returns the payload object whatever fields it has; `cachedExp = payload.exp` becomes `undefined`; `undefined - now` is `NaN`; `NaN < 300` is `false` → `isTokenExpired` returns `false`. **A token without `exp` is treated as never-expiring.**

---

### [IMPORTANT] `console.error("Không thể refresh idToken:", err)` may log token / user PII
**Evidence:**
- `apps/self-hosted/lovekit/src/lib/axios.js:79` — logs the entire error object. axios's `err` typically includes `err.config` (which carries `headers.Authorization: Bearer <idToken>`) and `err.response.data`. Production browser consoles (and any error-reporting hook that overrides `console.error`) will receive the full bearer.
- Same risk: `apps/self-hosted/lovekit/src/socket/socketClient.js:32` (`Connect error: ${err.message}` — message is usually safe, but `err` shape varies by transport).

**Recommendation:** strip headers/auth before logging (`{ status: err.response?.status, url: err.config?.url }`). Gate `console.*` behind `import.meta.env.DEV`.

---

### [MODERATE] Inconsistent JWT decoder duplication
**Evidence:**
- `apps/self-hosted/lovekit/src/App.jsx:11-22` (`decodeJwtPayload` — `TextDecoder` based) and `apps/self-hosted/lovekit/src/utils/auth/parseToken.js:2-15` (`parseJwt` — `decodeURIComponent` based).
- They have subtly different error tolerance: `decodeJwtPayload` returns null on any throw; `parseJwt` does same but its `decodeURIComponent` throws on bytes that aren't valid UTF-8 sequences while `TextDecoder` (default `fatal: false`) replaces them. Two app paths can disagree on whether the same forged token is valid.

**Recommendation:** delete `decodeJwtPayload` and import `parseJwt` from `@/utils/auth`. One parser. Apply hardening (CRITICAL #5 and IMPORTANT #6) in one place.

---

### [MODERATE] `userData` cache hydrated unconditionally — XSS sets `localStorage.userData` then triggers hydrate → app shows attacker-controlled identity
**Evidence:**
- `apps/self-hosted/lovekit/src/stores/useAuthStore.js:36-46` — `hydrate()` reads `JSON.parse(localStorage.getItem("userData")).data` and sets it as `user` if a token also exists. No schema check, no signature, no field validation.
- An XSS payload that writes a forged `userData` (e.g. `{"data":{"uid":"<victim>","displayName":"attacker"}, "timestamp":Date.now()}`) gets rendered by ProfileScreen (`displayName`, `email`, `avatar` URL inserted into `<img src>`). The `avatar` URL is the strongest sink: `<img src={avatar}>` (ProfileScreen.jsx:75-76) — an `onError` handler hides it but the request fires unconditionally → attacker can leak the victim's IP via beacon URL. Pure XSS amplification, but worth noting.

**Recommendation:** validate `userData` shape on read; treat it as cache only and confirm via `init()` before any rendering of mutable identity. Refuse to render `avatar` unless `URL.parse(avatar).protocol === "https:"`.

---

### [MODERATE] `removeUser()` not called by App / SettingsSheet logout
**Evidence:**
- Only `useAuthStore.clearAndlogout` and `axios.js:handleLogout` clear `userData`. App.handleLogout (App.jsx:75-83) and SettingsSheet.handleLogout (SettingsSheet.jsx:21-32) do not. After UI logout, `localStorage.userData` survives. Login screen is shown (because `authed=false`), but the next refresh + re-auth via `hydrate()` will resurrect the prior user's display name/avatar until `init()` resolves. PII leak across sessions on shared device.

**Recommendation:** addressed automatically by CRITICAL #1's fix.

---

### [MODERATE] No `Strict-Transport-Security`, `Content-Security-Policy`, frame-options at the SPA level
**Evidence:** out of scope for the listed files but flagged because client-side JWT in `localStorage` is acceptable only if XSS is fully prevented. CSP would break all `innerHTML`-based payloads. (Verified: no `innerHTML`, `dangerouslySetInnerHTML`, `eval`, `new Function`, or `document.write` in `apps/self-hosted/lovekit/src` — good. But third-party deps are unscanned here.)

**Recommendation:** add a strict CSP via `<meta http-equiv>` or server header (`default-src 'self'; img-src https: data:; connect-src https: wss:`).

---

### [INFO] Touch handler — no injection surface
**Evidence:** `apps/self-hosted/lovekit/src/hooks/useSwipeNav.js:1-39`. Reads numeric `clientX/clientY`; `setNavState` only ever receives one of four hard-coded string literals (`"camera" | "feed" | "messages" | "profile"`). No DOM sink, no string concat from touch data. **Pass.**

---

### [INFO] `redirect to /login` is hardcoded (axios.js:97)
**Evidence:** `window.location.href = "/login"` — destination string is a literal, not user-controllable. **Pass.**

---

### [INFO] `isTokenExpired` (legacy in `utils/storage/helpers.js:40-50`) uses raw `atob(...split('.')[1])` — fragile but unused on this path
**Evidence:** `apps/self-hosted/lovekit/src/utils/storage/helpers.js:40-50` — non-base64url decoder, will throw on tokens containing `-` or `_`. Co-exists with `parseJwt`. Not currently in the reviewed call paths but adds future foot-gun.

**Recommendation:** delete or replace with `parseJwt`.

---

## Summary

| Severity | Count |
|---------:|:------|
| CRITICAL | 3 |
| IMPORTANT | 4 |
| MODERATE | 4 |
| INFO | 3 |
| **Total** | **14** |

**Top blocker for ship:** CRITICAL #1 — the new `resetTokenCache()` export and `clearAndlogout` enhancements added in this branch are **not invoked** by the actual logout UI. The current logout leaks server-side session, IndexedDB, userData cache, axios state, and (next finding) refresh cookie. The fix is one line in `App.handleLogout`: `await useAuthStore.getState().clearAndlogout();` then `setAuthed(false);` — and remove the duplicated `localStorage.removeItem` calls.

## Unresolved Questions

1. Does the server's `/locket/refresh-token` endpoint set a refresh cookie, or is the body-borne `refreshToken` the only credential? Need to verify with backend to know whether killing the body parameter is safe (CRITICAL #2).
2. Does the socket.io server middleware re-verify `auth.token` on every reconnect, or only at the first handshake? Drives whether CRITICAL #3 is exploitable in production.
3. Is there a server-side session/refresh-token blacklist on `logout()`? If not, even fixing CRITICAL #1 leaves the refresh token usable until natural expiry.
4. Why are there four parallel axios instances (`axios.js`, `axios.auth.js`, `axios.main.js`, `axios.exten.js`, `axios.data.js`) each duplicating the bearer attach? Consolidating would close the silent-401 hole noted in IMPORTANT #5.
