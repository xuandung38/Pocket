---
phase: 3
title: "CameraScreen"
status: completed
priority: P2
effort: "5h"
dependencies: [2]
---

# Phase 03: CameraScreen

## Overview

Replace stub `CameraScreen` with real camera-first capture. Full-screen live preview, capture button, friend selector bottom sheet, caption input, and upload via copied post services.

## Requirements

**Functional**
- Request camera permission on mount, show live video preview
- Tap to capture photo; hold to record video
- Add caption overlay; pick friend recipients via bottom sheet
- Upload via `PostMoments` service (copied); progress chip while posting

**Non-functional**
- Camera preview fills full screen (`object-cover`)
- Minimal controls overlaid on preview

## Architecture

```
screens/CameraScreen.jsx
components/
  CameraPreview.jsx          ← <video> + getUserMedia
  CaptureButton.jsx          ← tap=photo, hold=video
  FriendPickerSheet.jsx      ← bottom sheet, useFriendStore
  CaptionInput.jsx           ← floating text overlay
  UploadProgressChip.jsx     ← useUploadQueueStore badge
```

### Upload Flow

```
capture → preview → caption + friend pick
  → PostMoments service (copied LocketDioServices/PostMoments.js)
  → useUploadQueueStore progress → success toast → back to live preview
```

## Related Code Files

**Create**
- `apps/self-hosted/lovekit/src/screens/CameraScreen.jsx`
- `apps/self-hosted/lovekit/src/components/CameraPreview.jsx`
- `apps/self-hosted/lovekit/src/components/CaptureButton.jsx`
- `apps/self-hosted/lovekit/src/components/FriendPickerSheet.jsx`
- `apps/self-hosted/lovekit/src/components/CaptionInput.jsx`
- `apps/self-hosted/lovekit/src/components/UploadProgressChip.jsx`

**Read for reference (do not modify)**
- `apps/self-hosted/web/src/pages/LocketCameraBeta/MainHomeScreen/` — stream setup pattern
- `apps/self-hosted/lovekit/src/services/LocketDioServices/PostMoments.js`
- `apps/self-hosted/lovekit/src/stores/useUploadQueueStore.js`
- `apps/self-hosted/lovekit/src/stores/useFriendStore.js`

## Implementation Steps

1. **`CameraPreview.jsx`**: `getUserMedia({ video: { facingMode: "user" }, audio: false })`, stream to `<video autoPlay playsInline muted>`, cleanup on unmount.

2. **`CaptureButton.jsx`**: large circle button. `onClick` = canvas screenshot. `onPointerDown`/`Up` = `MediaRecorder` start/stop.

3. **`FriendPickerSheet.jsx`**: slide-up bottom sheet, multi-select friends (amber checkmarks), "Post to all" toggle.

4. **`CaptionInput.jsx`**: floating rounded input at bottom of preview.

5. **`CameraScreen.jsx`**: state machine `phase: "preview" | "captured" | "posting"`. Camera preview always mounted (keeps stream alive), controls overlaid.

6. **`UploadProgressChip.jsx`**: shows "Uploading…" badge when `useUploadQueueStore` has pending items.

7. **Smoke test**: live selfie → capture → caption → pick friend → post → toast.

## Todo

- [x] CameraPreview (getUserMedia + cleanup)
- [x] CaptureButton (tap photo, hold video)
- [x] FriendPickerSheet with multi-select
- [x] CaptionInput overlay
- [x] CameraScreen orchestrator
- [x] UploadProgressChip
- [x] Smoke test full flow

## Success Criteria

- [ ] Camera preview visible on real mobile device
- [ ] Photo capture produces real image
- [ ] Post reaches backend, moment appears in Feed tab

## Risk Assessment

- **getUserMedia on HTTP**: only works on localhost or HTTPS in production.
- **iOS Safari facingMode**: may need `{ exact: "user" }`.
- **Canvas black frame**: call `drawImage` only after `video.readyState >= 2`.

## Chrome MCP Testing Checklist

Activate `ck:chrome-devtools` — **must test at mobile viewport, camera requires HTTPS or localhost**:

```
navigate http://localhost:5173
viewport 390x844
navigate to Camera tab
screenshot → verify: full-screen video preview visible
```

- [ ] Camera tab selected → live video preview fills screen
- [ ] Capture button visible, centered at bottom
- [ ] Tap capture → preview frozen (photo captured state)
- [ ] FriendPickerSheet: tap friend icon → bottom sheet slides up, friend list visible
- [ ] Post flow: select friend → post button → progress chip appears → toast success
- [ ] `console_errors` → zero JS errors during full flow
- [ ] Screenshot at 375×667: capture button not cut off

**Note:** Chrome DevTools may block `getUserMedia` without user gesture. Use actual Chrome browser interaction or mock the stream for testing.

## Completion Protocol

**When this phase is done:**
1. Update frontmatter `status: pending` → `status: completed`
2. Check off all items in `## Todo` above
3. Open `plan.md` → update Phase 03 row Status column: `pending` → `completed`
4. Commit with message: `feat(lovekit): phase 03 — camera screen + capture + post`
