---
phase: 4
title: "Image Caption Upload (R2)"
status: reverted
priority: P3
effort: "1d"
dependencies: [1, 2]
---

> **REVERTED (2026-06-15, user request):** Locket không hỗ trợ upload ảnh tùy chỉnh làm caption → gỡ toàn bộ. Đã xóa `image-upload-section.jsx`, `use-image-caption.js`, `crop-rounded-square.js` + 2 test; gỡ section khỏi `caption-picker-sheet.jsx`. Renderer `image-icon-overlay` GIỮ LẠI (dùng cho preset image_icon/image_gif từ API). Nội dung dưới đây giữ để tham khảo lịch sử.

# Phase 4: Image Caption Upload (R2)

## Overview
Cho phép user upload ảnh riêng làm **icon caption** (image_icon động): crop vuông + bo góc bằng canvas, upload qua **R2 có sẵn** (`uploadFileAndGetInfoR2`) thay Cloudinary của web. Lưu danh sách ảnh đã upload ở localStorage để chọn lại.

## Requirements
- Functional: section "Ảnh" trong picker → nút thêm ảnh → chọn file → crop vuông + bo góc → upload R2 → trả URL → tạo overlay `{type:"image_icon", icon:url, caption:""}`. Ảnh đã upload lưu localStorage, hiển thị lại để chọn/xóa.
- Non-functional: tái dùng R2 upload, KHÔNG thêm Cloudinary/credential. Canvas crop <200 dòng. Xử lý lỗi upload (toast).

## Architecture
- **Hook** `src/hooks/use-image-caption.js`:
  - `images[]` từ `localStorage["imgcaption"]` (port key web).
  - `addImage(file)` → canvas crop vuông + bo góc (port logic `web/.../ImageCaption.jsx` canvas) → Blob → `uploadFileAndGetInfoR2(blob,"image",localId)` → push URL vào list + persist.
  - `removeImage(url)`.
- **Picker section** `src/components/caption-picker/image-upload-section.jsx`: grid ảnh + nút "＋"; chọn ảnh → `onSelect({type:"image_icon",icon:url,caption:""})`; long-press/nút xóa → `removeImage`.
- **Render**: tái dùng `image-icon-overlay.jsx` (Phase 1) — không cần renderer mới.
- **Canvas util** `src/utils/crop-rounded-square.js`: `(file, size=200, radius)` → Blob PNG. Tách riêng để test thuần.

## Related Code Files
- Create:
  - `src/hooks/use-image-caption.js`
  - `src/utils/crop-rounded-square.js`
  - `src/components/caption-picker/image-upload-section.jsx`
  - Tests: `src/utils/__tests__/crop-rounded-square.test.js`, `src/hooks/__tests__/use-image-caption.test.js`
- Modify:
  - `src/components/caption-picker/caption-picker-sheet.jsx` (cắm image-upload-section)
- Read for context: `web/.../CaptionItems/ImageCaption.jsx` (canvas + upload logic), `src/services/storage-services.js` (`uploadFileAndGetInfoR2` signature)

## Tests (write FIRST — TDD)
1. `crop-rounded-square.test.js`: cho 1 ảnh test (canvas mock/OffscreenCanvas) → trả Blob `image/png`, kích thước vuông `size×size`.
2. `use-image-caption.test.js`: mock `uploadFileAndGetInfoR2` → `addImage` push URL vào `images` + ghi localStorage; `removeImage` xóa; load lại từ localStorage khi init.
3. Đỏ trước implement.

## Implementation Steps
1. Viết tests (đỏ).
2. `crop-rounded-square.js` (canvas) → test xanh.
3. `use-image-caption.js` (reuse R2 upload + localStorage) → test xanh.
4. `image-upload-section.jsx` + cắm vào picker.
5. Verify `npm run dev`: upload ảnh → thấy icon trong picker → chọn → preview image_icon → gửi → `optionsData.icon`=URL R2.
6. Xử lý lỗi upload (Sonner toast), file quá lớn (giới hạn size).
7. `npm test` + build xanh.

## Success Criteria
- [x] Upload ảnh → crop vuông bo góc → R2 URL; lưu/xóa localStorage hoạt động.
- [x] Chọn ảnh → overlay image_icon render đúng (reuse renderer P1) ở compose + feed.
- [x] Không phụ thuộc Cloudinary; lỗi upload có toast.
- [x] Tests + build xanh (35/35).

## Completion Notes (Session 2 — 2026-06-15)
- `crop-rounded-square.js`: center-crop vuông + bo góc (radius=size/6) → Blob PNG (port canvas web, bỏ Cloudinary). Test mock canvas/Image trong jsdom.
- `use-image-caption.js`: localStorage key `"imgcaption"` (chỉ lưu URL, KHÔNG base64); `addImage(file)` → crop → `uploadFileAndGetInfoR2(blob,"image",localId)` (R2 publicURL bền) → push + persist; `removeImage(url)`.
- `image-upload-section.jsx`: grid ảnh + nút "＋" (file input) + delete mode; chọn → `onSelect(normalizeOverlay({type:"image_icon",icon:url,caption:""}))`; reuse renderer `image-icon-overlay` (P1, không cần renderer mới). Guard size 8MB + toast lỗi upload (SonnerWarning). Cắm vào picker sheet tại slot P4.
- Round-trip feed: `image_icon` icon=url string → `toOverlayData` → `optionsData.icon` → feed `overlays.icon` → `normalizeIcon` (string passthrough) → `<img src>`. Verified path.
- Code review: manual (additive client-only, regression thấp). Files: `crop-rounded-square.js`, `use-image-caption.js`, `image-upload-section.jsx` + 2 tests; modified `caption-picker-sheet.jsx` (cắm section).

## Risk Assessment
- **Canvas test trong jsdom** (không có canvas thật) → dùng mock `HTMLCanvasElement.toBlob` hoặc test logic kích thước; e2e crop verify thủ công trên dev.
- **R2 URL hết hạn / private** → xác nhận `uploadFileAndGetInfoR2` trả URL truy cập được lâu dài (giống ảnh moment); nếu signed-url ngắn hạn → cân nhắc lưu path thay vì URL.
- **localStorage quota** (ảnh base64?) → chỉ lưu URL (đã upload), KHÔNG lưu base64.
