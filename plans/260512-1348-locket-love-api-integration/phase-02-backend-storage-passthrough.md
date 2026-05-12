# Phase 02 — Backend: Storage Endpoints (Firebase Init Improvements + R2 Fallback Shim)

**Owner:** dev-2 · **Effort:** 2h · **Status:** pending · **Blocks:** 05

## Context Links
- Plan: `plan.md`
- Existing Firebase upload: `apps/self-hosted/api/src/services/FirestorageService/uploadImage.js:112` (`initImageUploadSession`)
- FE storage caller: `apps/self-hosted/lovekit/src/services/LocketDioServices/StorageServices.js:18` (calls `/api/presignedV3` — DOES NOT EXIST)
- FE caller of caller: `apps/self-hosted/lovekit/src/services/LocketDioServices/PayloadServices.js:46`

## Overview
**Priority:** P1 · **Status:** pending
The frontend's only used upload path goes through `/api/presignedV3` (R2 storage) which is not
implemented on the self-hosted backend. The backend already has a Firebase resumable upload
flow (`/locket/initUpload` + `/locket/finalizeUpload`) — Phase 05 rewires the FE to use it.
This phase **owns the backend side**: ensures init/finalize handle videos + adds an optional
shim `/api/presignedV3` returning a Firebase-backed compat response, so existing FE code
**still works** before Phase 05 ships.

## Key Insights
- `initImageUploadSession` filename is hardcoded `*.webp` (uploadImage.js:113). Videos break with this content type.
- `getFirebaseDownloadUrl` returns the download URL — works for both image and video as long as upload succeeded
- `/api/presignedV3` shim must mimic the response shape: `{ data: { url, publicURL, key, expiresIn } }`
- Browser must be able to PUT file directly to Firebase URL (CORS allowlist on Firebase rules — confirm at runtime)

## Requirements
**Functional**
- `/locket/initUpload` accepts `{ fileSize, contentType, type }` and returns the right Firebase resumable URL (image or video)
- `/locket/finalizeUpload` returns the download URL (already works — verify)
- NEW shim `/api/presignedV3` accepts `{ filename, contentType, type, size, uploadedAt }` and returns `{ data: { url, publicURL, key, expiresIn: 3600 } }` where `url` is Firebase upload URL and `publicURL` is the download endpoint (will be resolved at finalize)

**Non-functional**
- Shim documented as "compatibility — will be removed when FE migrates to initUpload"
- Both image and video upload paths supported

## Architecture
```
Option A (long-term, Phase 05 wires FE):
FE ──/locket/initUpload──► returns { uploadUrl, getUrl }
FE ──PUT uploadUrl (direct Firebase)──► 200
FE ──/locket/finalizeUpload {getUrl}──► returns downloadUrl
FE ──/locket/postMomentV2 {mediaInfo:{imageUrl}}──► postImageToLocketDirect

Option B (this phase — keep FE working until Phase 05):
FE ──/api/presignedV3──► shim resolves init internally, returns Firebase URL as `url` and a stable getUrl as `publicURL`
FE ──PUT url (direct Firebase)──►
FE ──/locket/postMomentV2 {mediaInfo:{url:publicURL,path:key}}──► downloads from getUrl, posts to Locket
```

## Related Code Files
**Modify**
- `apps/self-hosted/api/src/services/FirestorageService/uploadImage.js` — generalize `initImageUploadSession` for image+video MIME

**Create**
- `apps/self-hosted/api/src/controllers/storage.controller.js` — handler for `/api/presignedV3`

**Modify (route registration)**
- `apps/self-hosted/api/src/routes/api.route.js` — mount `/presignedV3`

**Read**
- `apps/self-hosted/api/src/middlewares/verifyToken.js` — to wire `verifyIdToken`

## Implementation Steps
1. Refactor `initImageUploadSession(userId, idToken, fileSize, opts = {})` to accept `{ contentType, type }`. When `type === "video"`:
   - Use bucket `locket-video` (or whatever the existing video upload code targets — read `uploadVideo.js`)
   - Use video MIME content type
   - Use video folder path
2. Export new function `initFirebaseUploadSession` from `FirestorageService/index.js` (rename old or add wrapper that defaults to image for backward-compat)
3. Update `locket.controller.js#initUpload` to forward `contentType` + `type` from `req.body` to the new function
4. Create `controllers/storage.controller.js`:
   ```js
   const { initImageUploadSession } = require("../services/FirestorageService");

   exports.presignedV3 = async (req, res, next) => {
     try {
       const { idToken, localId } = req.user;
       const { filename, contentType, type, size } = req.body;
       const { uploadUrl, getUrl } = await initImageUploadSession(
         localId, idToken, size, { contentType, type }
       );
       return res.json({
         data: {
           url: uploadUrl,             // FE PUTs file here
           publicURL: getUrl,          // FE passes this as mediaInfo.url; BE resolves to download URL via finalize/postMoment
           key: filename,
           expiresIn: 3600,
         },
       });
     } catch (err) { next(err); }
   };
   ```
5. Register in `api.route.js`:
   ```js
   const { verifyIdToken } = require("../middlewares/verifyToken.js");
   const storageController = require("../controllers/storage.controller.js");
   router.post("/presignedV3", verifyIdToken, storageController.presignedV3);
   ```
6. Manual smoke:
   ```bash
   curl -X POST $API/api/presignedV3 -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"filename":"a.webp","contentType":"image/webp","type":"image","size":12345}'
   ```

## Todo List
- [ ] Generalize `initImageUploadSession` for image+video
- [ ] Add `storage.controller.js` with `presignedV3` handler
- [ ] Mount `/api/presignedV3` route with `verifyIdToken`
- [ ] Update `/locket/initUpload` to accept `{ contentType, type }` body
- [ ] curl smoke for image init
- [ ] curl smoke for video init

## Success Criteria
- `POST /api/presignedV3` returns 200 with valid Firebase upload URL
- Browser CORS allows PUT to returned URL (verified by Phase 05 E2E)
- `POST /locket/initUpload` works for both image and video bodies

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Firebase CORS blocks browser PUT | Med | High | If blocked, Phase 05 falls back to backend-side upload via `postMomentV2` (already supported via `mediaInfo.url`) |
| Video bucket / folder shape unknown | Med | Med | Read `uploadVideo.js` to copy exact path/MIME/headers |
| Shim drift from FE expectation | Low | Med | Match shape exactly: `{ data: { url, publicURL, key, expiresIn } }` |

## Security Considerations
- `verifyIdToken` enforced on both `/api/presignedV3` and `/locket/initUpload`
- Firebase URL returned is short-lived (resumable session token expires)
- Filename injection: Firebase API + path is server-controlled (`Date.now()_vtd182.{ext}`)

## Next Steps
- Phase 05 cuts over FE to `initUpload`/`finalizeUpload` and may delete `/api/presignedV3` shim afterwards
- If CORS blocks Firebase PUT, fallback: keep server-side upload path (`postMomentV2` with `mediaInfo.url`) and have BE download from FE's R2-style URL
