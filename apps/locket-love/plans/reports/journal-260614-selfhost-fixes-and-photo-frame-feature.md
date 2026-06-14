# Self-Hosted Docker Hardening + Photo Frame Feature: CORS & Upload Root Causes

**Date**: 2026-06-14 16:00
**Severity**: High
**Component**: locket-love PWA + self-hosted Docker (api/storage services), image upload pipeline
**Status**: Resolved

## What Happened

Extended session on self-hosted backend stability + new Photo Frame Picker feature. Docker Compose lacked health checks + network isolation. Image uploads via locket-love failed with ERR_HTTP2_PROTOCOL_ERROR when posting to Firebase-mimicking endpoint. CORS errors cascaded across three independent layers. Photo Frame feature merged but code review caught breaking response envelope mismatch. All issues traced, fixed, and merged to feat/fix-selfhost.

## The Brutal Truth

This felt like death by a thousand paper cuts. Each "fix" revealed the next layer of misconfiguration. The CORS nightmare was real: we thought it was the API, then the preview server, then the third-party bucket. By the time we realized we needed to set R2 CORS via PutBucketCorsCommand, we'd wasted three hours on the wrong places. The image upload was even worse — we nearly shipped a fix that would have 400'd silently because the backend expects `.path` in mediaInfo and presignedV3 returns `.key`. Code review literally saved us from merging a broken feature. The Docker .env.production exclusion in .dockerignore was the kind of silent fail that would have haunted production for weeks.

## Technical Details

### Docker Compose Health & Network

- `docker-compose.yml` missing health checks → depends_on: service_healthy never met
- node:20-slim lacks curl/wget → custom node script health-check via localhost API ping
- No network isolation → services on default bridge
- Added: bridge network + healthChecks + service_healthy waits
- Removed dead middleware: `multipart-upload-support.middleware.js` (imported, never used, created spurious uploads/ dirs)
- Frontend port clash: Vite defaults (5173/5175) collided with dev servers → remapped to 8001, 8003

### CORS Cascade (Three Layers)

**Layer 1: Express CORS** — api/app.js + storage/app.js had `origin: "*"` but credentials:true forbids it
- Fix: `origin: (req, callback) => callback(null, true)` to reflect origin (Access-Control-Allow-Origin: <origin>)

**Layer 2: Vite Dev Server** — preview mode blocked custom domain via host check
- Fix: vite.config.js `allowedHosts: true` (permissive, but necessary for LAN IP + custom domain testing)

**Layer 3: Cloudflare R2 Bucket** — browser PUT to R2 returned no ACAO header
- Root cause: R2 CORS not configured at all
- Fix: new storage/scripts/set-r2-cors.js (PutBucketCorsCommand, AllowedOrigins: ["*"], AllowedMethods: ["PUT", "GET"])
- Lesson: Direct browser→bucket requests require bucket-level CORS, not just app-level

### Image Upload Root Cause

locket-love payload-services.js was posting directly to Firebase Resumable Upload (resumable protocol) → 400 ERR_HTTP2_PROTOCOL_ERROR from self-hosted origin.

Real issue: locket-love should upload to R2 (like working "web" app), not Firebase.

Fix:
1. Switched `uploadFileAndGetInfoR2` in payload-services.js (calls storage presignedV3)
2. Validated presignedV3 response envelope: returns `key` (not `path`)
3. Changed VITE_STORAGE_API_URL from Firebase shim → storage service :5003
4. Server-side uploadMediaV2 controller expects mediaInfo.path (presignedV3 PUT result) — would 400 if missing

Near miss: nearly shipped a "fix" without verifying the backend contract. Tracing response shapes is non-negotiable.

### Environment Variable Baking

.env.production held VITE_STORAGE_API_URL (for build-time baking), but .dockerignore excluded it.

Result: vite build used fallback, container got wrong API endpoint.

Fix: Created .env.production (public VITE_ vars only) + removed from .dockerignore so Docker COPY picks it up.

## Root Cause Analysis

1. **Docker lack of observability**: no health checks = debugging in the dark (services "up" but not ready)
2. **CORS education gap**: team knew HTTP errors are "CORS" but not which layer (app, preview, bucket). Needed mental model: client request → App CORS header → (if direct bucket) → Bucket CORS header
3. **Envelope mismatch**: backend uploadMediaV2 and presignedV3 responses have different shapes (path vs key, data vs data.data). No shared types/validation.
4. **Build artifact assumptions**: VITE_* baked at build time, but source .env excluded from Docker → container falls back silently

## Lessons Learned

- **CORS debugging**: Always trace the layer that emits (or fails to emit) Access-Control-Allow-Origin header. Can be app, preview server, or third-party bucket.
- **Response contracts**: Verify presigned response envelope (key vs path) against backend consumption before shipping. Runtime validation would catch this early.
- **Docker .env baking**: Public build vars (VITE_*) must be copied into container if you want them baked. .dockerignore is a footgun.
- **Code review catches integration bugs**: Syntax checks miss envelope mismatches. Mandatory review for fullstack features.
- **Explicit over implicit**: Health checks, environment handling, network topology should be explicit in docker-compose. Implicit defaults fail silently.

## Next Steps

- [ ] Run storage/scripts/seed-frames.js to populate built-in frames (needs Firebase ID token + R2 creds; currently uses placeholder PNGs)
- [ ] Implement server-side frame PNG validation (size, format, dimensions) — deferred to M4
- [ ] Audit storage /api/delete endpoint (unauthenticated; pre-existing platform weakness; partially mitigated by key-ownership check — track as tech debt)
- [ ] Add response envelope types/validation (TypeScript + runtime check) to prevent future shape mismatches
- [ ] Document Docker env var handling in DOCKER.md or deployment guide

## Files Changed

- `apps/self-hosted/docker-compose.yml` — health checks, network, depends_on, port remapping
- `apps/self-hosted/api/src/app.js` — CORS origin reflect
- `apps/self-hosted/storage/app.js` — CORS origin reflect
- `apps/self-hosted/storage/scripts/set-r2-cors.js` — new, PutBucketCorsCommand
- `apps/self-hosted/api/src/controllers/frame.controller.js` — Photo Frame CRUD (fixed in review)
- `apps/self-hosted/api/scripts/seed-frames.js` — populate built-in frames
- `apps/locket-love/src/services/payload-services.js` — switched to uploadFileAndGetInfoR2
- `apps/locket-love/src/utils/compose-frame.js` — canvas frame baking
- `apps/locket-love/src/stores/use-frame-store.js` — frame state + library
- `apps/locket-love/src/components/frame-picker.jsx` — UI + selection logic
- `apps/locket-love/.env.production` — new, public VITE_ vars
- `apps/locket-love/vite.config.js` — allowedHosts, VITE_STORAGE_API_URL mapping

---

**Status**: DONE. All code review fixes applied. Docker healthchecks passing. Image uploads working. Photo Frame Picker merged. Self-hosted stack stable under LAN + custom domain.
