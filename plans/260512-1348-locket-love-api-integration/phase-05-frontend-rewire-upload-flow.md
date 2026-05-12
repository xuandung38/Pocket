# Phase 05 — Frontend: Rewire Upload Flow to `/locket/initUpload` + `/locket/finalizeUpload`

**Owner:** dev-5 · **Effort:** 2h · **Status:** pending · **Blocked by:** 02

## Context Links
- Plan: `plan.md`
- FE Storage (rewrite): `apps/self-hosted/lovekit/src/services/LocketDioServices/StorageServices.js`
- FE Payload builder (touch): `apps/self-hosted/lovekit/src/services/LocketDioServices/PayloadServices.js`
- BE init/finalize endpoints: `apps/self-hosted/api/src/routes/locket.route.js:20-21`
- BE controller: `apps/self-hosted/api/src/controllers/locket.controller.js:262-293`, `369-491`
- Upload queue store (read): `apps/self-hosted/lovekit/src/stores/useUploadPostStore.js`

## Overview
**Priority:** P1 · **Status:** pending
The frontend's only upload code path goes through `/api/presignedV3` (R2). With Phase 02
shipping a Firebase-backed shim, the FE works — but the *intended* path is to use
`/locket/initUpload` + direct Firebase PUT + `/locket/finalizeUpload`, then post via
`mediaInfo.imageUrl` direct path (`uploadMediaV2` lines 379-391: skips download/upload).
This phase migrates the FE.

## Key Insights
- Backend `uploadMediaV2` has TWO paths:
  - **Direct path** (`mediaInfo.imageUrl` set): `postImageToLocketDirect` — no server-side download
  - **Indirect path** (`mediaInfo.url`+`path`+`type`+`size` set): downloads from URL, processes, posts
- For images: direct path is faster + cheaper. For videos: indirect path needed because we generate thumbnail server-side
- `initUpload` returns `{ uploadUrl, getUrl }`; client PUTs file to `uploadUrl`; then either:
  - calls `/locket/finalizeUpload {getUrl}` to get download URL → passes as `mediaInfo.imageUrl`
  - OR backend resolves it during `postMomentV2` (current direct path doesn't, so finalize is needed for image direct path)
- Video path stays "indirect" — server downloads from Firebase URL, generates thumbnail, posts

## Requirements
**Functional**
- Image upload: capture/gallery → R2 PUT removed → Firebase PUT works → moment posted to Locket → appears in feed
- Video upload: capture/gallery → Firebase PUT works → server processes + thumbnails → moment posted
- Upload progress retained (currently 0/100 binary; acceptable until streamed-progress phase)

**Non-functional**
- No call to `/api/presignedV3` from production code
- Bandwidth on VPS unchanged for image (direct), reasonable for video (necessary processing)

## Architecture
```
Image flow (NEW):
1. FE → POST /locket/initUpload {fileSize, contentType:"image/webp", type:"image"}
        → { uploadUrl, getUrl }
2. FE → PUT uploadUrl (direct Firebase) [browser PUT, body=file]
3. FE → POST /locket/finalizeUpload {getUrl}
        → { downloadUrl }
4. FE → POST /locket/postMomentV2 { options, mediaInfo:{ imageUrl: downloadUrl } }
        → moment data

Video flow (NEW):
1. Same init
2. FE → PUT uploadUrl
3. FE → POST /locket/finalizeUpload {getUrl}
        → { downloadUrl }
4. FE → POST /locket/postMomentV2 { options, mediaInfo:{
          type:"video", url: downloadUrl, name:filename, size, path:firebasePath
        }} → server downloads, processes, posts
```

## Related Code Files
**Modify**
- `apps/self-hosted/lovekit/src/services/LocketDioServices/StorageServices.js` — replace `uploadFileAndGetInfoR2` with `uploadFileViaInitFinalize`
- `apps/self-hosted/lovekit/src/services/LocketDioServices/PayloadServices.js` — switch `createRequestPayloadV5` to call new uploader, build `mediaInfo` with `imageUrl` (image) or `url+path+name+size+type` (video)

**Read**
- `apps/self-hosted/api/src/services/FirestorageService/uploadImage.js:112-148` — for content-type contract

## Implementation Steps
1. New `StorageServices.js`:
   ```js
   import api from "@/lib/axios";
   export const uploadFileViaInitFinalize = async (file, previewType, _localId) => {
     // 1. init
     const initRes = await api.post("/locket/initUpload", {
       fileSize: file.size,
       contentType: file.type,
       type: previewType, // "image" | "video"
     });
     const { uploadUrl, getUrl } = initRes.data;

     // 2. PUT file directly to Firebase
     const putRes = await fetch(uploadUrl, {
       method: "PUT",
       headers: { "Content-Type": file.type },
       body: file,
     });
     if (!putRes.ok) throw new Error("Firebase PUT failed: " + putRes.status);

     // 3. finalize → download URL
     const finRes = await api.post("/locket/finalizeUpload", { getUrl });
     const downloadUrl = finRes.data.downloadUrl;

     return {
       downloadURL: downloadUrl,
       metadata: {
         name: file.name,
         size: file.size,
         type: file.type,
         uploadedAt: new Date().toISOString(),
         path: getUrl, // backend uses this to identify the file if needed
       },
     };
   };
   ```
2. In `PayloadServices.js#createRequestPayloadV5`:
   - Replace `await uploadFileAndGetInfoR2(...)` with `await uploadFileViaInitFinalize(...)`
   - For images: set `mediaInfo = { imageUrl: fileInfo.downloadURL }` (triggers BE direct path)
   - For videos: keep `mediaInfo = { url, path, name, size, uploadedAt, type }` (triggers BE indirect path)
3. Keep `uploadFileAndGetInfoR2` exported as a thin wrapper around `uploadFileViaInitFinalize` if any other consumer exists (grep first)
4. Smoke test:
   - Capture image → upload → check Network panel for init/PUT/finalize/postMomentV2 sequence
   - Capture video → upload → same sequence with thumbnail processing on BE
5. Verify CORS on Firebase Storage — if browser blocks PUT:
   - Fallback: keep R2-style indirect path + use Phase 02 shim (`/api/presignedV3`) — leave both wirings present, env-flag the switch

## Todo List
- [ ] Implement `uploadFileViaInitFinalize`
- [ ] Update `createRequestPayloadV5` to dispatch image vs video to right `mediaInfo` shape
- [ ] Remove `uploadFileAndGetInfoR2` (or keep as alias)
- [ ] E2E image upload smoke
- [ ] E2E video upload smoke
- [ ] Confirm CORS on Firebase resumable session works for browser

## Success Criteria
- Network log: init → PUT (Firebase host) → finalize → postMomentV2 → moment in feed
- Posted moment visible in feed within 5s
- No `/api/presignedV3` call in prod
- Image upload bypasses VPS bandwidth (direct Firebase PUT)

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Firebase CORS rejects browser PUT | Med | High | Keep Phase 02 shim alive as env-flagged fallback; document toggle |
| Video MIME mismatch with `*.webp` filename hardcode | High | High | Phase 02 generalizes filename — verify it shipped before this phase merges |
| `mediaInfo.imageUrl` direct path skips video processing | High if used | High | Image-only direct path; video must use indirect with `url`+`path`+`type:"video"` |
| `getUrl` not yet finalized when called | Low | Med | `finalizeUpload` polls Firebase metadata; safe |

## Security Considerations
- Browser exposed to Firebase Storage URL temporarily (resumable session) — safe (token-based)
- No new auth surface; backend still gates init/finalize via `verifyIdToken`

## Next Steps
- Phase 09 may extend with retry / progress reporting (not in this phase)
