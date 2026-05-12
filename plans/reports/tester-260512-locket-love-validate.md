# Tester Report — locket-love build + smoke validation

- Task: #9 (Tester: validate locket-love build + smoke test)
- Tester: dev-10
- Date: 2026-05-12
- Branch: feat/fix-selfhost
- Head: c9ec781 `feat(locket-love): phase 8 — E2E polish + cleanup`

## Result: PASS

All required checks green. Docker step N/A (no Dockerfile present — see notes).

## 1. Build verification — PASS

```
$ npm run build --prefix apps/locket-love
> vite build
vite v6.4.2 building for production...
transforming...
✓ 1872 modules transformed.
✓ built in 1.26s
```

- Errors: 0
- Warnings: 0 (grep on build output for `warn|error|deprecat` → none)
- All chunks emit cleanly. Main bundle: `index-D0RtmYvJ.js` 341 KB (111 KB gzip). CSS: 16.9 KB (4.36 KB gzip).
- Per-route lazy chunks present and sized sanely:
  - camera 33 KB / feed 22 KB / profile-sheet 19 KB / send 9.6 KB / chat-detail 8.8 KB / login 4.7 KB / activity 4.8 KB / chat-list 4.5 KB / bottom-nav 4.1 KB / memories 4.5 KB / messages 0.24 KB (alias wrapper) / profile-screen 0.96 KB (stub)

## 2. Stale-import scan — PASS

```
$ grep -rn "LocketServices\|LocketDioServices\|useFriendStore[^V]" \
    apps/locket-love/src --include="*.jsx" --include="*.js"
(no matches, exit 1)
```

No leftover references to deprecated services or pre-V2 friend store.

## 3. Docker build — N/A

- `apps/locket-love/Dockerfile`: not present
- `apps/locket-love/docker-compose.yml`: not present
- `apps/self-hosted/docker-compose.yml`: has services for `api`, `storage`, `web` — no `locket-love` service defined

Phase 1 (commit de750c3 — rename + infra setup) did not include a Dockerfile for locket-love. Skipping per "if Dockerfile present" condition. Flagged below as a deployment gap for the lead.

## 4. Preview smoke test — PASS

```
$ vite preview --port 5176 (background)
$ curl -sI http://127.0.0.1:5176/         → HTTP/1.1 200 OK
$ curl -sI http://127.0.0.1:5176/login    → HTTP/1.1 200 OK (router fallback)
$ curl -s  http://127.0.0.1:5176/         → valid HTML, title "Locket Love",
                                            asset refs resolve (index.js + index.css)
```

- Preview server boots without crash
- Both `/` and `/login` return 200 with HTML body
- Asset references in `index.html` match emitted dist files
- No errors/stack traces in preview log

## Evidence summary

| Check                 | Status | Evidence                                       |
| --------------------- | ------ | ---------------------------------------------- |
| Production build      | PASS   | 1872 modules, 0 err, 0 warn, 1.26 s            |
| Stale-imports scan    | PASS   | grep returns no matches                        |
| Docker build          | N/A    | no Dockerfile / no service in compose          |
| Preview server (HTTP) | PASS   | 200 on `/` and `/login`, HTML body valid       |

## Unresolved / follow-ups

- **Docker packaging missing:** no `apps/locket-love/Dockerfile`, no `locket-love` service in `apps/self-hosted/docker-compose.yml`. If deploy via the self-hosted compose stack is required, Phase 1 infra setup is incomplete on that front.
- **Browser-level console errors** could not be verified without a headless browser. Preview returns valid HTML; full runtime smoke (login form interaction, store hydration, socket connect) would need Playwright/Puppeteer to validate.

## Verdict

Task #9 acceptance criteria met. Approve merge to main pending the lead's call on Docker packaging.
