---
phase: 8
title: "Docker — Lovekit service in docker-compose"
status: completed
priority: P2
effort: "1h"
dependencies: [7]
---

# Phase 08: Docker — Lovekit service in docker-compose

## Overview

Add `lovekit` as a first-class service in `apps/self-hosted/docker-compose.yml`. Same multi-stage build pattern as the existing `web` service, served on port **5175** via `vite preview`.

## Requirements

**Functional**
- `docker compose up lovekit` builds and serves the PWA on port 5175
- `VITE_API_URL` injected at build time via `.env.production`
- Service depends on `api` (same as `web`)
- Zero changes to existing `web`, `api`, `storage` services

**Non-functional**
- Multi-stage build: `builder` (npm ci + npm run build) → `runner` (vite preview)
- Image stays small: node:20-slim both stages
- `restart: unless-stopped` for prod reliability

## Architecture

```
docker-compose.yml
  lovekit:
    build: ./lovekit
    ports: "5175:5175"
    env_file: ./lovekit/.env.production
    depends_on: [api]
```

```
apps/self-hosted/lovekit/Dockerfile   (new)
  Stage 1 builder: COPY package*.json → npm ci → COPY . → npm run build
  Stage 2 runner:  COPY dist + node_modules → EXPOSE 5175 → CMD vite preview --host 0.0.0.0 --port 5175
```

## Related Code Files

**Create**
- `apps/self-hosted/lovekit/Dockerfile`
- `apps/self-hosted/lovekit/.env.production.example`

**Modify**
- `apps/self-hosted/docker-compose.yml` — add `lovekit` service block

## Implementation Steps

1. **Create `apps/self-hosted/lovekit/Dockerfile`**:

```dockerfile
# ==============================
#  Stage 1: Build
# ==============================
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
RUN npm run build

# ==============================
#  Stage 2: Serve (Vite preview)
# ==============================
FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/vite.config.js ./vite.config.js

EXPOSE 5175

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5175"]
```

2. **Add `preview` script to `package.json`** (if not already present):
   ```json
   "preview": "vite preview"
   ```

3. **Create `apps/self-hosted/lovekit/.env.production.example`**:
   ```
   VITE_API_URL=http://api:5001
   ```

4. **Append `lovekit` service to `docker-compose.yml`**:
   ```yaml
   lovekit:
     build:
       context: ./lovekit
       dockerfile: Dockerfile
     container_name: lovekit-pwa
     env_file:
       - ./lovekit/.env.production
     environment:
       - NODE_ENV=production
     ports:
       - "5175:5175"
     depends_on:
       - api
     restart: unless-stopped
   ```

5. **Smoke test** (local):
   ```bash
   cd apps/self-hosted
   docker compose build lovekit
   docker compose up lovekit
   # Verify http://localhost:5175 serves the PWA
   ```

## Todo

- [x] Create `lovekit/Dockerfile`
- [x] Add `preview` script to `lovekit/package.json` if missing (already present from Phase 01)
- [x] Create `lovekit/.env.production.example`
- [x] Add `lovekit` service to `docker-compose.yml`
- [x] `docker compose build lovekit` — green (image `self-hosted-lovekit:latest`, 560MB)
- [x] `docker compose up lovekit` — PWA accessible on :5175 (smoke-tested via `docker run` on host port 15175 → HTTP 200, `data-theme="lovekit"` confirmed)

## Success Criteria

- [ ] `docker compose build lovekit` succeeds with no errors
- [ ] `http://localhost:5175` serves the Lovekit PWA (LoginScreen visible)
- [ ] Existing `web` service on :5173 completely unaffected
- [ ] `VITE_API_URL` can be overridden via `lovekit/.env.production`

## Risk Assessment

- **`vite preview` needs `--host 0.0.0.0`**: Without it, the container binds to localhost only and is unreachable from outside. Already in CMD.
- **Build args vs env_file**: `VITE_*` vars are baked in at build time by Vite. Must be in `env_file` AND accessible during `docker compose build` (use `args` or build-time env if needed). For simplicity, use `.env.production` file in build context.
- **Port conflict with web (5173)**: Using 5175 avoids collision. If host already uses 5175, change to any free port.

## Completion Protocol

**When this phase is done:**
1. Update frontmatter `status: pending` → `status: completed`
2. Check off all items in `## Todo` above
3. Open `plan.md` → update Phase 08 row Status column: `pending` → `completed`
4. Commit with message: `feat(lovekit): phase 08 — docker service on port 5175`
