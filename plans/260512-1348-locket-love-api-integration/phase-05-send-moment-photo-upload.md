---
phase: 5
title: "Send moment + photo upload"
status: pending
priority: P1
effort: "5h"
dependencies: [3, 4]
---

# Phase 5: Send moment + photo upload

## Overview
Wire the SendScreen flow end-to-end: capture (or pick) a photo, attach a caption (text or sticker), choose recipients, upload to storage, POST a new moment, then return user to FeedScreen with optimistic insert.

## Requirements
**Functional:**
- CameraScreen capture button → navigate `/send` carrying the captured/picked image (object URL or File)
- SendScreen displays the image, lets the user:
  - Edit message slot (text bubble) OR pick a sticker via the sheet
  - Cycle quick-caption slots via swipe
  - Toggle recipients (Tất cả + individual friends)
- Send button:
  - Upload the image to `StorageServices.uploadImage()` → returns CDN URL
  - POST `PostMoments.createMoment({ imageUrl, caption, audience, recipientIds })`
  - On success: optimistic insert into `moment-store`, navigate `/feed`, show toast "Đã gửi"
  - On failure: show toast, keep user on send screen with retry button

**Non-functional:**
- Image compressed client-side (max 1920px, JPEG quality 0.85) before upload to keep payloads under 1MB
- Upload progress visible (spinner on send button while uploading)
- Cancel mid-upload returns to SendScreen with form intact

## Architecture
```
CameraScreen
    ↓ capture (file input or camera API)
File → object URL → navigate('/send', { state: { imageBlob } })

SendScreen
    ↓ user edits caption + selects recipients
    ↓ click send
1. compressImage(blob) → smaller blob
2. StorageServices.uploadImage(blob) → { url, key }
3. PostMoments.createMoment({ url, caption, audience, recipientIds })
4. moment-store.insertOptimistic(newMoment)
5. navigate('/feed')
```

## Related Code Files
**Create:**
- `apps/locket-love/src/services/StorageServices.js` (copy from `apps/main`)
- `apps/locket-love/src/utils/compress-image.js` — canvas-based downscale + JPEG re-encode
- `apps/locket-love/src/utils/capture-camera.js` — wrapper for `<input type=file capture=environment>` fallback to file picker

**Modify:**
- `apps/locket-love/src/screens/camera-screen.jsx`
  - `CaptureButton` opens file picker (or live camera if browser supports getUserMedia later)
  - On file selected → navigate `/send` with file via router state
  - Gallery thumbnail (left) opens system file picker too
- `apps/locket-love/src/screens/send-screen.jsx`
  - Read `useLocation().state.imageBlob` (fallback to demo photo if direct nav)
  - Replace `DEMO_PHOTO` with object URL from blob
  - Wire `<SendIcon>` button: disabled while not ready, spinner while uploading
  - Build payload: `{ imageUrl, caption: aaText || customMessage || sheetCaption.label, audience: allSelected ? 'all' : null, recipientIds: selectedRecipients.filter(id => id !== 'all') }`
  - On success: `momentStore.insertOptimistic(newMoment)` → `navigate('/feed')` → `SonnerSuccess('Đã gửi')`
  - On failure: keep state, show error toast, allow retry
- `apps/locket-love/src/stores/moment-store.js`
  - Add `insertOptimistic(moment)` and `replaceTempId(tempId, realMoment)` for optimistic UI
- `apps/locket-love/src/data/mock-data.js`
  - Move `captionStickersGeneral`, `captionStickersDecorative` to `apps/locket-love/src/data/caption-stickers.js` (these stay client-side)

## Implementation Steps
1. Copy `StorageServices.js` from `apps/main`; adapt to `instanceStorage` axios instance
2. Build `compress-image.js`:
   - Load image into off-screen canvas, scale down so longest side ≤1920
   - Export `canvas.toBlob('image/jpeg', 0.85)` → return Blob
3. Build `capture-camera.js`:
   - Returns a promise that opens file input with `accept="image/*" capture="environment"`
   - Resolves with the selected File
4. Wire CaptureButton in CameraScreen:
   - On click → `captureCamera()` → if file → `navigate('/send', { state: { file } })`
5. Wire SendScreen:
   - Pull file from `useLocation().state.file`; if missing → `navigate('/')`
   - Convert to object URL for preview: `URL.createObjectURL(file)`; revoke on unmount
   - Build payload assembler: pick text OR sticker OR sheet pick (existing logic), recipient ids
   - SendIcon button: `disabled || uploading` + spinner overlay
   - On click:
     ```js
     setUploading(true);
     try {
       const compressed = await compressImage(file);
       const { url } = await StorageServices.uploadImage(compressed);
       const moment = await PostMoments.createMoment({ url, caption, recipientIds });
       momentStore.insertOptimistic({ ...moment, isOptimistic: true });
       navigate('/feed');
       SonnerSuccess('Đã gửi');
     } catch (err) {
       SonnerError(err.message);
     } finally { setUploading(false); }
     ```
6. Add upload progress UI: replace SendIcon with a spinner ring while uploading
7. Smoke-test: capture/pick image → send → verify it appears at top of feed → reload → verify it persisted server-side

## Success Criteria
- [ ] Capture/pick flow returns user to send screen with the image visible
- [ ] Compressing keeps uploads <1MB for typical phone photos
- [ ] Send button disabled when no image, no recipients, or upload in progress
- [ ] On success: feed shows the new moment at top + toast "Đã gửi"
- [ ] On failure: error toast, send screen unchanged, retry works
- [ ] Reload after send: moment persists (real backend store)

## Risk Assessment
- **Risk:** Browsers without `capture=environment` fall back to file picker — UX feels off on desktop dev.
  **Mitigation:** desktop fine for testing; mobile UX matches Locket native (file picker becomes camera).
- **Risk:** Storage upload returns a key that doesn't match `createMoment` field name.
  **Mitigation:** check `apps/main/PostMoments.js` for the exact field; mirror the mapping.
- **Risk:** Large photos exceed memory in `compressImage` on low-end devices.
  **Mitigation:** stream via `createImageBitmap` if available; fall back to `<img>` for older browsers.
- **Risk:** Optimistic insert duplicates when real fetch happens before insert.
  **Mitigation:** key by `tempId` until backend ID arrives, then `replaceTempId`.
- **Risk:** User navigates away mid-upload → lost upload.
  **Mitigation:** Phase 5 ships without resume; document as known limitation, plan for Phase 8.
