---
phase: 3
title: Client Data Layer + Custom Upload
status: completed
priority: P2
effort: 0.75d
dependencies:
  - 2
---

# Phase 3: Client Data Layer + Custom Upload

## Overview
Tầng dữ liệu client cho khung: service gọi API frame, zustand store (built-in + user), và luồng upload khung custom (validate PNG vuông + alpha → R2 → tạo metadata). Cần Phase 2 (endpoints).

## Requirements
- Functional: fetch danh sách khung (built-in global + custom, đều từ BE); upload khung custom; xóa khung custom.
- Non-functional: cache như `useOverlayStore`; validate định dạng trước upload; tái dùng `uploadFileAndGetInfoR2`.

- **Nguồn frame**: **tất cả từ backend** `GET /frames` (built-in global + custom của user, đã merge server-side). Không bundle asset client.
- **`services/frame-services.js`**: `getFrames()` (GET /frames), `createFrame({name,url,key})` (POST), `deleteFrame(id)` (DELETE) — dùng instance `api` (auth tự gắn).
- **`utils/validate-frame-png.js`**: load file vào canvas (downscale ~64² để check nhanh) → kiểm tra `width===height` (vuông) + có pixel alpha < 255 (vùng trong suốt). Reject nếu không đạt.
- **`uploadCustomFrame(file)`** (trong frame-services): validate → `uploadFileAndGetInfoR2(file, "image", localId)` → `createFrame({ name, url: downloadURL, key: metadata.path })`.
- **`stores/use-frame-store.js`** (mirror `use-overlay-store.js`): state `frames` (từ GET /frames), `isLoading`; actions `fetchFrames` (cache sessionStorage), `addCustomFrame(file)`, `removeFrame(id)`. Frame từ R2 sẽ load `crossOrigin` lúc bake (Phase 1/4).

## Related Code Files
- Create: `src/services/frame-services.js`, `src/stores/use-frame-store.js`, `src/utils/validate-frame-png.js`
- Modify: `src/stores/index.js`, `src/services/index.js` (barrel export — theo pattern hiện có)
- Read for context: `src/stores/use-overlay-store.js`, `src/services/overlay-services.js`, `src/services/storage-services.js` (`uploadFileAndGetInfoR2`), `src/libs/index.js` (`api`)

## Implementation Steps
1. `validate-frame-png.js`: đọc file → Image → canvas (downscale) → check vuông + alpha; trả `{ok, reason}`.
2. `frame-services.js`: 3 hàm CRUD + `uploadCustomFrame` (validate → R2 → createFrame).
3. `use-frame-store.js`: theo khuôn `use-overlay-store.js` (fetch GET /frames + cache); actions add/remove.
4. Barrel export ở `stores/index.js`, `services/index.js`.

## Success Criteria
- [ ] `fetchFrames()` trả built-in + khung custom của user.
- [ ] `addCustomFrame(file)` với PNG vuông trong suốt → upload R2 + tạo metadata + xuất hiện trong store.
- [ ] PNG không vuông / không alpha → bị reject với lý do rõ ràng (không upload).
- [ ] `removeFrame(id)` xóa khung custom khỏi BE + store.
- [ ] Reload app → khung custom vẫn còn (persist BE).

## Risk Assessment
- **Validate alpha tốn CPU**: ảnh lớn → quét pixel chậm. Mitigation: downscale về canvas nhỏ (vd 64²) để check alpha nhanh.
- **Race fetch/cache**: theo đúng guard của `useOverlayStore` (skip khi đã load).
- **Phụ thuộc Phase 2**: cần endpoints sẵn sàng; nếu BE chưa xong, store vẫn chạy với built-in (degrade mềm).
