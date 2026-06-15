---
phase: 5
title: Camera utils & capture hook
status: completed
priority: P2
effort: 5h
dependencies: []
---

# Phase 5: Camera utils & capture hook

**Track C (Agent C) · không phụ thuộc · chạy song song với Track A & B.**

## Overview
Chuẩn bị nền tảng cho camera full-split: 2 util device (`get-available-cameras`, `is-ios`) + rút logic dùng chung từ `camera-screen.jsx` (876 dòng) ra hook `use-camera-capture` để 2 nhánh platform tái dùng (DRY) — **giữ nguyên behavior**.

## Requirements
- Functional:
  - `getAvailableCameras()`: enumerate `videoinput`; nếu thiếu label → xin quyền `getUserMedia` rồi enumerate lại (stop track tạm); phân loại front/back + ultrawide/normal/zoom + fallback.
  - `isIOS()`/`isAndroid()`: detect chuẩn (iPadOS giả Mac qua `maxTouchPoints`).
  - `useCameraCapture`: đóng gói MediaRecorder (start/stop, mime fallback, 10s cap), `capturePhoto` (canvas toBlob), torch capability — **trích từ camera-screen, không đổi hành vi**.
- Non-functional: util thuần (test bằng mock `navigator.mediaDevices`); hook test bằng mock `MediaRecorder`/`getUserMedia`.

## Architecture
- `get-available-cameras.js`: port `getInfoCamera.js` + `classifyVideoDevices` (regex front/back vi+en+`camera2/1 0/1`, fallback khi không match, `backNormalCamera ??= backCameras[0]`).
- `is-ios.js`: port `onlyIOS.js`.
- `use-camera-capture.js`: nhận `streamRef/videoRef` refs + setters (`setShot`,`setPhase`), trả `{ startRecording, stopRecording, capturePhoto, handleCaptureDown, handleCaptureUp, torch... }`. Logic copy nguyên từ `camera-screen.jsx:300-410` (MediaRecorder mime chain, MAX_VIDEO_MS, VIDEO_HOLD_MS).

## Related Code Files
- Create: `src/utils/get-available-cameras.js`
- Create: `src/utils/is-ios.js`
- Create: `src/components/camera/use-camera-capture.js`
- Create: `src/utils/__tests__/get-available-cameras.test.js`
- Create: `src/utils/__tests__/is-ios.test.js`
- Create: `src/components/camera/__tests__/use-camera-capture.test.js`
- Reference: upstream `feature/camera-upgrade:.../utils/device/{getInfoCamera.js,onlyIOS.js}`; logic record hiện tại `src/screens/camera-screen.jsx:300-410`

## Implementation Steps (TDD)
1. **RED — is-ios test**: mock `navigator.userAgent`/`platform`/`maxTouchPoints` → `isIOS()` true cho iPhone UA + iPadOS(MacIntel+touch); `isAndroid()` true cho Android UA; cả 2 false trên desktop.
2. **GREEN — is-ios**.
3. **RED — cameras test**: mock `navigator.mediaDevices.enumerateDevices` (front/back/ultrawide labels) → phân loại đúng `frontCameras/backCameras/backUltraWide...`; thiếu label → gọi `getUserMedia` rồi enumerate lại; không có back → fallback từ remaining.
4. **GREEN — cameras**.
5. **RED — hook test**: mock `MediaRecorder` (isTypeSupported, start/stop, ondataavailable/onstop); giữ ≥`VIDEO_HOLD_MS` → `startRecording`; nhả nhanh → `capturePhoto`; quá `MAX_VIDEO_MS` → auto stop.
6. **GREEN — hook**: trích logic từ camera-screen (chưa gỡ khỏi camera-screen — Phase 6 mới thay thế bằng hook).
7. `npm run test` xanh.

## Success Criteria
- [ ] `is-ios` + `get-available-cameras` test xanh (mock mediaDevices).
- [ ] `use-camera-capture` test xanh (mock MediaRecorder); hành vi tap/hold/cap khớp camera-screen hiện tại.
- [ ] Không sửa `camera-screen.jsx` ở phase này (chỉ tạo mới) → không regression.

## Risk Assessment
- jsdom không có `MediaRecorder`/`getUserMedia` → phải mock đầy đủ; test tập trung logic quyết định (tap/hold/mime-pick), không test stream thật.
- Trích hook nhưng để camera-screen vẫn dùng code cũ tới Phase 6 → tạm thời trùng logic (chấp nhận, gỡ ở P6).
