---
phase: 1
title: "API: HttpOnly cookie endpoint for refresh token"
status: pending
priority: P1
effort: "2h"
dependencies: []
---

# Phase 01: API — HttpOnly Cookie Endpoint for Refresh Token

## Overview

Add a `/auth/refresh` endpoint to the self-hosted API that accepts `refreshToken` via HttpOnly cookie and returns a new `idToken`. Add a `/auth/logout` endpoint to clear the cookie.

## Requirements

**Functional**
- `POST /auth/refresh` — reads `refreshToken` from HttpOnly cookie, calls Firebase token refresh API, returns `{ idToken, expiresIn }`
- `POST /auth/logout` — clears the `refresh_token` HttpOnly cookie (set `maxAge: 0`)
- Login flow updated: after successful Firebase auth, API sets cookie rather than returning `refreshToken` in body

**Non-functional**
- Cookie flags: `HttpOnly; Secure; SameSite=Strict; Path=/auth`
- `Secure` flag omitted in dev (HTTP localhost) — use `process.env.NODE_ENV === 'production'`
- CORS: `credentials: true` on the API for lovekit origin

## Architecture

```
apps/self-hosted/api/src/
  routes/auth.routes.js        (new or existing)
  controllers/auth.controller.js  (modify or new)
  middleware/cookie-parser.middleware.js  (if not already present)
```

Cookie name: `lk_refresh` (short, not prefixed with `__Secure` until production TLS confirmed).

Refresh token exchange (Firebase REST API):
```
POST https://securetoken.googleapis.com/v1/token?key=API_KEY
Body: grant_type=refresh_token&refresh_token=<token>
→ Response: { id_token, refresh_token, expires_in }
```

## Related Code Files

**Modify/Create in `apps/self-hosted/api/src/`:**
- `routes/auth.routes.js` — add `POST /auth/refresh`, `POST /auth/logout`
- `controllers/auth.controller.js` — implement refresh + logout handlers

## Implementation Steps

1. Install `cookie-parser` in API if not present: `npm install cookie-parser`
2. Register `app.use(cookieParser())` in `server.js` / `app.js`
3. Add `POST /auth/refresh`:
   ```js
   async function refreshToken(req, res) {
     const token = req.cookies.lk_refresh;
     if (!token) return res.status(401).json({ error: 'no_refresh_token' });
     // call Firebase token endpoint
     const resp = await fetch(`https://securetoken.googleapis.com/v1/token?key=${process.env.FIREBASE_API_KEY}`, {
       method: 'POST',
       body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: token }),
     });
     const data = await resp.json();
     if (!resp.ok) return res.status(401).json({ error: data.error });
     // rotate cookie with new refresh token
     res.cookie('lk_refresh', data.refresh_token, {
       httpOnly: true,
       secure: process.env.NODE_ENV === 'production',
       sameSite: 'strict',
       path: '/auth',
       maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
     });
     res.json({ idToken: data.id_token, expiresIn: data.expires_in });
   }
   ```
4. Add `POST /auth/logout`:
   ```js
   function logout(req, res) {
     res.clearCookie('lk_refresh', { path: '/auth' });
     res.json({ ok: true });
   }
   ```
5. Update login endpoint (wherever Firebase login response is proxied) to set cookie from `refreshToken` in response, strip it from JSON body before sending to client
6. Update CORS config to allow `credentials: true` for lovekit origin (`http://localhost:5175`, production domain)

## Todo

- [ ] Install + register `cookie-parser`
- [ ] Add `POST /auth/refresh` handler
- [ ] Add `POST /auth/logout` handler
- [ ] Update login endpoint to set cookie + strip refreshToken from body
- [ ] Update CORS to allow credentials from lovekit origin
- [ ] Test: `curl -c cookies.txt POST /auth/login` → cookie set; `curl -b cookies.txt POST /auth/refresh` → new idToken

## Success Criteria

- [ ] `POST /auth/refresh` returns new `idToken` when cookie is valid
- [ ] `POST /auth/logout` clears the cookie
- [ ] Login no longer returns `refreshToken` in JSON body
- [ ] Cookie has `HttpOnly` flag (verify in browser DevTools → Application → Cookies)

## Risk Assessment

- **Offline use**: if device is offline, `/auth/refresh` will fail. Frontend must handle this gracefully — show "session expired" rather than crash. See open questions in plan.md.
- **CORS credentials**: `SameSite=Strict` + `credentials: include` requires exact origin match. In dev, lovekit is `:5175` and API is `:5001` — different ports = different origins. Set `Access-Control-Allow-Origin: http://localhost:5175` explicitly (not `*`).

## Completion Protocol

1. Update frontmatter `status: pending` → `status: completed`
2. Check off all Todo items
3. Update `plan.md` Phase 01 row
4. Commit: `feat(api): auth refresh endpoint with HttpOnly cookie`
