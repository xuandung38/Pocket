---
title: "Lovekit Auth Security — Refresh Token HttpOnly Cookie"
description: "Move refresh token out of localStorage into an HttpOnly cookie served by the API. Eliminates full-account-takeover via XSS. Requires coordinated API + frontend changes."
status: pending
priority: P1
effort: "6h"
branch: "feat/fix-selfhost"
tags: [security, auth, lovekit, httponly]
blockedBy: []
blocks: []
created: "2026-05-11"
createdBy: "ck:plan"
source: skill
---

# Lovekit Auth Security — Refresh Token HttpOnly Cookie

## Overview

**CRITICAL SECURITY FINDING (reviewer-1):** `refreshToken` is stored indefinitely in `localStorage` at `storage.js:47-61`. Any XSS vulnerability (injected script, malicious dependency) can steal the refresh token and generate new `idToken`s → full account takeover with no expiry.

Fix: API issues the refresh token as an `HttpOnly; Secure; SameSite=Strict` cookie. Frontend stops reading/writing `refreshToken` from localStorage. Token refresh calls go through the API proxy endpoint which forwards the cookie automatically.

**Source:** `plans/reports/reviewer-1-260511-security-a11y-lovekit.md`

## Phases

| # | Phase | Effort | Status | Blocked By |
|---|-------|--------|--------|------------|
| 01 | [API: HttpOnly cookie endpoint for refresh token](./phase-01-api-httponly-cookie-endpoint-for-refresh-token.md) | 2h | pending | — |
| 02 | [Frontend: migrate from localStorage to cookie-based refresh](./phase-02-frontend-migrate-from-localstorage-to-cookie-based-refresh.md) | 2h | pending | 01 |
| 03 | [Hardening: cachedExp reset + logout key audit](./phase-03-hardening-cachedexp-reset-logout-key-audit.md) | 2h | pending | 02 |

Sequential: 01 → 02 → 03.

## Open Questions (must answer before implementing)

1. **Offline use**: if the PWA is used offline, cookie-based refresh may fail (no network to hit the API proxy). Is offline token refresh a hard requirement? If yes, consider encrypting the refresh token in localStorage as a fallback.
2. **`VITE_PUBLIC_API_KEY`**: is this a real secret or a routing header? If a real key, it must move to a backend environment variable immediately.
3. **CSP**: is there a Content-Security-Policy header set? Without it, XSS mitigation is incomplete regardless of cookie strategy.
4. **Same-origin**: lovekit PWA at `:5175` and API at `:5001` are different origins in dev. Cookie SameSite=Strict requires same origin or coordinated CORS with `credentials: include`. Confirm cookie domain strategy for prod.

## Success Criteria

- [ ] `refreshToken` absent from `localStorage` on all code paths
- [ ] Cookie set with `HttpOnly; Secure; SameSite=Strict` flags
- [ ] Token refresh works transparently (no user-visible re-login)
- [ ] Logout clears the HttpOnly cookie via API endpoint
- [ ] No regression in normal login / session persistence

## Dependencies

Successor to: `260511-1813-lovekit-locket-layout-clone` (phase 04 partially mitigates cachedExp; this plan does the full auth security hardening)
