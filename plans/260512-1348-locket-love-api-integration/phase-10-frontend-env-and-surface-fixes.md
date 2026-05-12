# Phase 10 — Frontend: Env Wiring + Surface Fixes (Camera Visibility, Stub Endpoints)

**Owner:** dev-10 · **Effort:** 1.5h · **Status:** pending

## Context Links
- Plan: `plan.md`
- Files:
  - `apps/self-hosted/lovekit/.env.example`
  - `apps/self-hosted/lovekit/.env.production.example`
  - `apps/self-hosted/lovekit/src/components/CameraPreview.jsx`
  - `apps/self-hosted/lovekit/src/services/LocketDioServices/AuthServices.js` (only `GetUserData`/`GetUserDataV2`)
  - `apps/self-hosted/lovekit/src/services/ExtensionsServices/MusicServices.js`
  - `apps/self-hosted/lovekit/src/services/ExtensionsServices/CollabServices.js`

## Overview
**Priority:** P2 · **Status:** pending
Cleanup phase: env defaults + stubbed endpoints + minor surface bugs. Disjoint from
critical-path phases — runs in parallel with 04/05/07/08/09.

## Key Insights
- `CameraPreview` requests `getUserMedia` only on `active` change; on background tab return, the stream may be torn down by browser → preview shows black until `facingMode` changes. Fix: also re-init on `document.visibilitychange`.
- `GetUserData` (`/api/me`) and `GetUserDataV2` (`/api/po`) are unused (dead from previous SaaS). Remove or stub. `useAuthStore.fetchUserData` calls `GetUserDataV2` — remove the call.
- `getInfoMusicByUrl` and `getCollabCaption` hit non-existent backend endpoints. They're called from optional features (caption AI, music overlay) — return null gracefully or remove from import surface.
- `.env.example` is good but missing `VITE_BETA_API_URL` doc comment (used by `axios.exten` and beta server proxies).

## Requirements
**Functional**
- Camera preview restarts when tab regains visibility
- No 404s in network log on first open from `/api/me`, `/api/po`, `/api/getInfoMusic`, `/api/collab/getCaption`
- Env example mirrors actual usage

## Architecture
No architecture change — quality fixes.

## Related Code Files
**Modify**
- `apps/self-hosted/lovekit/.env.example` — document optional `VITE_BETA_API_URL`
- `apps/self-hosted/lovekit/.env.production.example` — same as above
- `apps/self-hosted/lovekit/src/components/CameraPreview.jsx` — add visibilitychange listener
- `apps/self-hosted/lovekit/src/services/LocketDioServices/AuthServices.js` — make `GetUserData`/`GetUserDataV2` graceful (resolve null + warn, do not throw)
- `apps/self-hosted/lovekit/src/services/ExtensionsServices/MusicServices.js` — short-circuit return null without API call (or feature-flag)
- `apps/self-hosted/lovekit/src/services/ExtensionsServices/CollabServices.js` — same

**Read**
- `apps/self-hosted/lovekit/src/stores/useAuthStore.js:101` — confirm `GetUserDataV2` usage
- `apps/self-hosted/lovekit/src/screens/CameraScreen.jsx` — confirm `isActive` prop wiring

## Implementation Steps
1. **CameraPreview** — add visibility handler:
   ```js
   useEffect(() => {
     const onVis = () => {
       if (document.visibilityState === "visible" && active && !streamRef.current) {
         // re-trigger by toggling active dependency: nudge via state
         setError(null);
         // start() can be extracted to a callback and called here
       }
     };
     document.addEventListener("visibilitychange", onVis);
     return () => document.removeEventListener("visibilitychange", onVis);
   }, [active]);
   ```
   Cleaner: extract `start()` to a memoized callback so visibility handler can call it directly.
2. **AuthServices.GetUserData / GetUserDataV2**: wrap in try/catch returning `null` + `console.warn("not implemented in self-hosted")`. Do not throw.
3. **useAuthStore.fetchUserData**: remove the `GetUserDataV2` call entirely (it's dead code returning nothing useful).
4. **MusicServices.getInfoMusicByUrl**: return null with a single `console.warn` if env flag `VITE_FEATURE_MUSIC` is not "true". Otherwise leave as-is.
5. **CollabServices.getCollabCaption**: same pattern as Music.
6. **.env.example**: add commented line:
   ```
   # Beta server proxy (used for fetchUserByData / sendCelebrityRequestV2)
   # VITE_BETA_API_URL=https://api-beta.locket-dio.com
   ```
7. Smoke:
   - Background tab on Camera screen → return → preview live
   - Open app → no 404s for `/api/me`, `/api/po`, `/api/getInfoMusic`, `/api/collab/getCaption`

## Todo List
- [ ] Add visibility listener to CameraPreview (extract `start` to callback)
- [ ] Soften `GetUserData`/`GetUserDataV2` to graceful null
- [ ] Remove `GetUserDataV2` call from `useAuthStore.fetchUserData`
- [ ] Short-circuit Music + Collab services
- [ ] Update env examples with `VITE_BETA_API_URL` doc

## Success Criteria
- No 404s in network log from these endpoints
- Camera preview reliably resumes after tab return
- No regressions in posting/feed/profile

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Visibility re-init double-binds stream | Low | Med | Guard with `streamRef.current` check |
| Removing `GetUserDataV2` breaks unknown consumer | Low | Low | Grep first; only call site is `useAuthStore.fetchUserData` |
| Feature flag missing breaks Music users | Low | Low | Default to "off" in self-hosted; document |

## Security Considerations
- None — quality fixes

## Next Steps
- Future: implement actual `/api/getInfoMusic` and `/api/collab/getCaption` in BE if features wanted
