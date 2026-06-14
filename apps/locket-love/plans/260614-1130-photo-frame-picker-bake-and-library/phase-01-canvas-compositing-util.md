---
phase: 1
title: Canvas Compositing Util
status: completed
priority: P1
effort: 0.5d
dependencies: []
---

# Phase 1: Canvas Compositing Util

## Overview
Module client thuần `utils/compose-frame.js`: nhận ảnh gốc + spec khung → vẽ canvas → `toBlob` ra `File` mới đã bake khung. Nền tảng cho Phase 4. Không phụ thuộc phase khác.

## Requirements
- Functional: hỗ trợ 3 mode — `none` (trả nguyên), `png` (overlay PNG vuông), `polaroid` (viền trắng + bake ngày/caption).
- Non-functional: chạy hoàn toàn client; xử lý ảnh cross-origin (frame từ R2) không taint canvas; font load xong trước khi vẽ text.

## Architecture
```
composeFrame(photoBlob, frameSpec) -> Promise<File>

frameSpec:
  { type: "none" }
  { type: "png", url }                       // url: R2 publicURL (built-in + custom) — load crossOrigin
  { type: "polaroid", date, caption }
```
Luồng:
1. `none` → trả `photoBlob` nguyên (no-op, giữ chất lượng gốc).
2. `png`:
   - canvas 1080×1080; vẽ ảnh `cover`-fit vào ô vuông (crop giữa).
   - load frame: `new Image(); img.crossOrigin = "anonymous"; img.src = url;` `await decode()`.
   - `drawImage(frame, 0,0,1080,1080)` đè lên.
   - `canvas.toBlob(cb, "image/jpeg", 0.9)`.
3. `polaroid` (**xuất vuông 1080²** — giữ moment vuông):
   - canvas 1080×1080; fill `#fff`.
   - vẽ ảnh `cover` vào ô trong (vd x=48,y=48,w=984,h=804) — viền mỏng quanh + **dải trắng đáy dày** (~180px) cho chữ.
   - `await document.fonts.ready`; `ctx.fillText` ở dải đáy (màu `#333`, căn giữa): **ngày đăng** + **caption** (truyền vào).
   - `toBlob(cb, "image/jpeg", 0.95)`.
4. Trả `new File([blob], name, { type: blob.type })` (giữ `name` ổn định để BE đọc extension).

## Related Code Files
- Create: `src/utils/compose-frame.js`
- Read for context: `src/screens/camera-screen.jsx` (shot.file shape), `src/services/storage-services.js` (blob → upload contract)

## Implementation Steps
1. Helper `loadImage(srcOrBlob, {crossOrigin})` → `Promise<HTMLImageElement>` (dùng `decode()`), `drawCover(ctx, img, x,y,w,h)` (tính crop giữa giữ tỉ lệ).
2. `composeFrame` dispatch theo `frameSpec.type`.
3. Mode `png`: vuông 1080², overlay, jpeg 0.9.
4. Mode `polaroid`: **canvas vuông 1080²**, ảnh inset + viền trắng + dải đáy, `document.fonts.ready` rồi `fillText` (ngày đăng + caption), jpeg 0.95.
5. Trả `File`; mode `none` trả blob gốc.
6. Try/catch: lỗi load frame (taint/404) → throw rõ ràng để caller hiện toast + fallback gửi ảnh không khung.

## Success Criteria
- [ ] `composeFrame(blob, {type:"png", url})` trả File JPEG vuông có khung bake.
- [ ] `composeFrame(blob, {type:"polaroid", date, caption})` trả File có viền trắng + chữ ngày/caption.
- [ ] `composeFrame(blob, {type:"none"})` trả blob gốc không đổi.
- [ ] Frame từ R2 (crossOrigin) bake không lỗi tainted canvas (R2 CORS đã `*` GET).
- [ ] Mở File output (URL.createObjectURL) thấy khung đúng.

## Risk Assessment
- **Tainted canvas**: frame PNG đều từ R2 (built-in + custom) → `toBlob` throw nếu thiếu CORS. Mitigation: luôn `crossOrigin="anonymous"` + R2 CORS GET `*` đã mở.
- **Font chưa load** → text Polaroid sai/không hiện. Mitigation: `await document.fonts.ready`.
- **Chất lượng**: downscale 1080² hợp lý cho ảnh moment; tránh upscale ảnh nhỏ (vẽ đúng size nguồn nếu < 1080).
