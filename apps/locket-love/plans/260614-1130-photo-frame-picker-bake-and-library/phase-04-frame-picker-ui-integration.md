---
phase: 4
title: Frame Picker UI + Integration
status: completed
priority: P2
effort: 1d
dependencies:
  - 1
  - 3
---

# Phase 4: Frame Picker UI + Integration

## Overview
UI chọn khung trong màn sau-chụp + nối dây: preview khung trực tiếp, bake lúc gửi (thay `shot.file`), và UI upload/xóa khung custom. Cần Phase 1 (compose) + Phase 3 (data).

## Requirements
- Functional: chọn khung (None + built-in + custom), preview live, bake khi gửi, upload/xóa khung riêng.
- Non-functional: không đổi luồng post-moment; lỗi bake → fallback gửi ảnh không khung + toast.

## Architecture
- **`components/frame-picker.jsx`**: dải ngang/sheet thumbnail khung (None, built-in, custom) + nút "Tải khung" (file input) + xóa khung custom (long-press / nút). Dùng `use-frame-store`.
- **`captured-send-preview.jsx`**:
  - state `selectedFrame` (default `none`); nút mở frame-picker (thêm vào action bar cạnh `Aa✦`).
  - **Preview live**: PNG → `<img>` khung absolute đè ảnh; Polaroid → mock CSS viền trắng + chữ. (Chỉ preview; bake thật ở canvas khi gửi.)
  - `handleSend`: gửi kèm `frameSpec` trong payload `onPost`.
- **`camera-screen.jsx` `handlePost`**: trước `createRequestPayloadV5`, nếu `frameSpec.type !== "none"`:
  `const fileToUpload = await composeFrame(shot.file, frameSpec)` (catch → toast + dùng `shot.file`); rồi `createRequestPayloadV5({ mediaFile: fileToUpload, ... })`.
- **Polaroid spec**: xuất **vuông 1080²** (ảnh inset + viền + dải chữ); `date` = lúc đăng; `caption` = ô caption sẵn có (tái dùng, không input mới).

## Related Code Files
- Create: `src/components/frame-picker.jsx`
- Modify: `src/components/captured-send-preview.jsx` (state + nút + preview + truyền frameSpec qua onPost), `src/screens/camera-screen.jsx` (`handlePost` bake trước upload)
- Read for context: `src/utils/compose-frame.js` (P1), `src/stores/use-frame-store.js` (P3), `src/services/payload-services.js` (`createRequestPayloadV5` signature)

## Implementation Steps
1. `frame-picker.jsx`: render thumbnails từ store; chọn → set `selectedFrame`; nút upload (input file → `addCustomFrame` + loading + toast lỗi validate); xóa khung custom.
2. `captured-send-preview.jsx`: thêm state + nút mở picker; render preview đè theo loại khung; gọi `fetchFrames()` lúc mount (như `fetchCaptionOverlays`).
3. Mở rộng payload `onPost` thêm `frame` (frameSpec); cập nhật `handleSend`.
4. `camera-screen.jsx` `handlePost`: nhận `frame`, bake `shot.file` qua `composeFrame` trước `createRequestPayloadV5`; try/catch fallback.
5. Polaroid: dựng `frameSpec = { type:"polaroid", date, caption }` từ state.
6. Manual E2E: đăng ảnh mỗi loại khung → mở URL R2 thấy khung bake; upload khung riêng → chọn → đăng được.

## Success Criteria
- [ ] Chọn khung PNG/Polaroid/custom → preview hiện đúng → gửi → ảnh trên R2 đã bake khung.
- [ ] None → gửi ảnh gốc không đổi (no-op).
- [ ] Upload khung riêng từ UI → vào picker → dùng đăng được; xóa được.
- [ ] Lỗi bake (taint/load) → fallback gửi ảnh không khung + toast, không crash.
- [ ] Không regression: video, đăng không khung, caption overlay, recipients vẫn chạy.

## Risk Assessment
- **Preview ≠ bake**: CSS preview lệch canvas output. Mitigation: dùng cùng tỉ lệ/anchor; chấp nhận sai số nhỏ, ưu tiên output bake là nguồn sự thật.
- **Bake chậm (ảnh lớn)**: thêm spinner "đang xử lý" trước khi upload.
- **Frame R2 crossOrigin**: PNG built-in + custom đều từ R2 → set `img.crossOrigin="anonymous"` lúc bake (R2 CORS GET `*` đã mở). Quên → tainted canvas.
