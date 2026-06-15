---
phase: 6
title: Camera platform split & video
status: completed
priority: P2
effort: 8h
dependencies:
  - 5
---

# Phase 6: Camera platform split & video

**Track C (Agent C) · blockedBy [5] · rủi ro CAO NHẤT toàn dự án.**

## Overview
Tách camera theo platform (FULL split như upstream — user yêu cầu): `camera-screen.jsx` thành shell delegate `<CameraPreview>` + `<CameraToggle>` có dispatcher `isIOS()`. iOS giữ `facingMode`; Android dùng `deviceId` + pinch-zoom + nhãn lens. Thêm `frameRate 30fps`.

## Requirements
- Functional:
  - `camera-preview/index.jsx` dispatch `isIOS() ? <IOS/> : <Android/>`; cả 2 dùng `useCameraCapture` (Phase 5) cho record/photo.
  - iOS: `facingMode` user/environment (hành vi hiện tại, không đổi).
  - Android: `getAvailableCameras()` → chọn `deviceId`; pinch-to-zoom (multi-touch); nhãn zoom `0.5x/1x/2x` từ `track.getCapabilities().zoom`.
  - `camera-toggle/index.jsx` dispatch platform (iOS toggle front/back; Android chọn lens).
  - `buildConstraints` thêm `frameRate:{ideal:30,max:30}`.
- Non-functional: KHÔNG regression torch/zoom/record/upload; shell giữ swipe-nav + sheets + phase lifecycle.

## Architecture
```
camera-screen.jsx            # shell: phase, upload, sheets, swipe-nav, gallery fallback
components/camera/
  camera-preview/
    index.jsx                # isIOS() dispatcher
    camera-preview-ios.jsx   # facingMode, dùng useCameraCapture
    camera-preview-android.jsx  # deviceId + pinch-zoom + zoom labels, dùng useCameraCapture
  camera-toggle/
    index.jsx                # dispatcher
    camera-toggle-ios.jsx    # user/environment
    camera-toggle-android.jsx# chọn lens (0.5x/1x/2x)
  use-camera-capture.js      # (Phase 5) shared
```
- `camera-screen.jsx` GỠ logic record/preview trùng (đã chuyển vào hook + preview components), giữ shell.

## Related Code Files
- Create: `src/components/camera/camera-preview/index.jsx`, `camera-preview-ios.jsx`, `camera-preview-android.jsx`
- Create: `src/components/camera/camera-toggle/index.jsx`, `camera-toggle-ios.jsx`, `camera-toggle-android.jsx`
- Create: `src/components/camera/__tests__/camera-preview-dispatch.test.jsx`
- Modify: `src/screens/camera-screen.jsx` (shell hoá, delegate, `frameRate`)
- Reference: upstream `feature/camera-upgrade:.../MediaPreview/{Android,IOS}.jsx`, `.../CameraToggle/{Android,IOS}.jsx`

## Implementation Steps (TDD)
1. **RED — dispatch test**: mock `isIOS` → `<CameraPreview>` render nhánh iOS khi true, Android khi false (assert qua testid/role đặc trưng mỗi nhánh).
2. **GREEN — dispatcher + 2 preview components**: iOS port từ behavior hiện tại; Android port deviceId + pinch + zoom labels từ upstream Android.jsx (restyle).
3. **GREEN — toggle**: dispatcher + iOS/Android toggle.
4. **Shell hoá camera-screen**: thay block preview/record inline bằng `<CameraPreview>` + `useCameraCapture`; gỡ code trùng; thêm `frameRate` vào `buildConstraints`.
5. **RED/GREEN — Android zoom labels test**: mock `getCapabilities().zoom={min:0.5,max:3}` → labels chứa `0.5x`,`1x`,`2x`.
6. `npm run test` xanh; **manual device test** (Phase 7) cho luồng thật.

## Success Criteria
- [ ] Dispatch iOS/Android đúng theo `isIOS()`; test xanh.
- [ ] Android: chọn lens + pinch-zoom + nhãn zoom hoạt động (verify Phase 7 thiết bị thật).
- [ ] iOS: hành vi facingMode giữ nguyên.
- [ ] `frameRate 30fps` áp vào constraints.
- [ ] Record/photo/torch/upload KHÔNG regression (test + manual).
- [ ] `camera-screen.jsx` còn là shell gọn (không còn logic record trùng).

## Risk Assessment
- ⚠️ **RỦI RO CAO NHẤT**: đại phẫu file 876 dòng đang chạy. Giảm thiểu: commit nhỏ từng bước (hook-swap trước, split sau); giữ nhánh iOS = behavior cũ để có đường lui.
- jsdom không chạy camera thật → unit test chỉ phủ dispatch + logic zoom-label; **bắt buộc manual test iOS Safari + Android Chrome** ở Phase 7.
- Pinch-zoom đụng swipe-up→feed gesture của shell → kiểm tra không xung đột touch handler.
