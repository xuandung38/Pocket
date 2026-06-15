---
phase: 2
title: "Picker Sheet Upgrade + Selection"
status: completed
priority: P1
effort: "1.5d"
dependencies: [1]
---

# Phase 2: Picker Sheet Upgrade + Selection

## Overview
Nâng cấp BottomSheet "Chú thích" trong `captured-send-preview.jsx` thành **sectioned picker** (Themes/Special/Icon/GIF, các section khác để Phase 3-4-5 cắm vào), tổng quát hóa state lựa chọn thành 1 `selectedOverlay` object phẳng, và **sửa bug mapping** để overlay thực sự chảy vào payload.

## Requirements
- Functional: picker hiển thị section theo nhóm type từ `useOverlayStore` (custome/background/decorative/special/image_icon/image_gif). Chọn 1 item → set `selectedOverlay` (object schema Phase 1) → preview cập nhật qua `<CaptionOverlay>`. Edit text caption ("Aa") vẫn hoạt động.
- Non-functional: mỗi section component <200 dòng. Không port DaisyUI; dùng `BottomSheet` + style locket-love. KISS: 1 sheet cuộn dọc nhiều section (không cần modal CustomeStudio).

## Architecture
- **State refactor** trong `captured-send-preview.jsx`: thay `sheetCaption` (object rời) + `overlayData:{sticker}` bằng `selectedOverlay` (object phẳng `normalizeOverlay`). `handleSend` truyền thẳng `overlayData: selectedOverlay` (đúng field `overlay_id/type/color_top/...` mà `payload-services.js:59` đọc) → **FIX bug** overlay không vào payload.
  - Editable text slot: khi user gõ message/Aa → `selectedOverlay = { ...defaultOverlay, type: isAa?"default":"default", caption: text }`. Phân biệt message-bubble vs Aa giữ như hiện tại (style khác nhau), nhưng cả hai chỉ là `type:"default"` với style pill khác.
- **Picker sections** `src/components/caption-picker/`:
  - `caption-picker-sheet.jsx` — wrapper BottomSheet, render danh sách section + nhận `onSelect(overlay)`.
  - `theme-section.jsx` — render 1 nhóm preset (custome/background/decorative) dạng pill grid (reuse markup pill hiện ở `captured-send-preview.jsx:594-609`).
  - `special-section.jsx` — preset `special` với mini snow preview.
  - `icon-section.jsx` — preset `image_icon`.
  - `gif-section.jsx` — preset `image_gif`.
  - (placeholder cho `system-section` P3, `image-upload-section` P4, `music` P5 — chỉ render khi có data/đủ điều kiện.)
- Mỗi section nhận `items` (đã `normalizeOverlay`) + `selectedId` + `onSelect`; ẩn nếu `items.length===0` (giữ behavior hiện tại — themes API trả `[]` thì sheet gọn).

## Related Code Files
- Create:
  - `src/components/caption-picker/caption-picker-sheet.jsx`
  - `src/components/caption-picker/theme-section.jsx`
  - `src/components/caption-picker/special-section.jsx`
  - `src/components/caption-picker/icon-section.jsx`
  - `src/components/caption-picker/gif-section.jsx`
  - Tests: `src/components/caption-picker/__tests__/caption-picker-sheet.test.jsx`
- Modify:
  - `src/components/captured-send-preview.jsx` (state refactor `selectedOverlay`; thay sheet "Chú thích" cũ bằng `<CaptionPickerSheet>`; fix `handleSend` overlayData)
  - `src/services/payload-services.js` (xác nhận map đủ field; thêm passthrough cho field type-specific nếu thiếu — chủ yếu đã có)
- Read for context: `web/.../CustomeStudio/index.jsx`, `CaptionItems/ThemesCustomes.jsx`, `SpecialCaption.jsx`, `CaptionIconSelector.jsx`, `CaptionGifThemes.jsx`

## Tests (write FIRST — TDD)
1. `caption-picker-sheet.test.jsx`:
   - render với `captionOverlays.custome=[{...}]` → thấy pill section "Themes"; click pill → `onSelect` gọi với overlay object phẳng (`type:"custome"`, có `color_top`).
   - section rỗng (`image_icon=[]`) → KHÔNG render section đó.
   - special section render snow preview node.
2. Test mapping fix (unit, không cần render): hàm build overlayData từ `selectedOverlay` → có `overlay_id/type/color_top/color_bottom/text_color/icon` đúng (regression cho bug `{sticker}`).
3. Chạy đỏ trước implement.

## Implementation Steps
1. Viết tests section + mapping (đỏ).
2. Tạo `caption-picker-sheet.jsx` + 4 section component, dùng `normalizeOverlay`.
3. Refactor `captured-send-preview.jsx`: introduce `selectedOverlay`; nối picker; cập nhật `<CaptionOverlay overlay={selectedOverlay}/>` (từ P1) cho preview.
4. **Fix `handleSend`**: `overlayData: selectedOverlay` (bỏ `{sticker}`). Verify payload qua test + `npm run dev` (gửi thử, log payload `optionsData` có overlay_id).
5. Xóa code pill/sheet "Chú thích" cũ đã thay thế; giữ slot editable text + music-button (music nối ở P5).
6. `npm test` + `npm run build` xanh.

## Success Criteria
- [x] Picker hiển thị đúng section theo nhóm có data; section rỗng được ẩn.
- [x] Chọn item → preview đổi qua `<CaptionOverlay>`; gửi → `optionsData.overlay_id/type/...` đúng (bug cũ hết).
- [x] Edit text vẫn hoạt động (message slot). Aa-as-large-text vốn là dead code (không reachable) → đã gỡ; nút "Aa✦" giờ mở picker.
- [x] Tests Phase 2 xanh (18/18 toàn plan), build pass.

## Completion Notes (Session 2 — 2026-06-14/15)
- **Bug POST-mapping FIXED end-to-end:** `handleSend` nay truyền `overlayData: toOverlayData(activeOverlay)` (phẳng) thay `{sticker}`. Verified: `camera-screen.jsx:331 handlePost` → `createRequestPayloadV5` (`:368`) → `payload-services.js:57-69` đọc `overlay_id/type/color_top/color_bottom/text_color/icon/weatherData/payload/music`. Carousel theme slots cũng emit overlay data (trước gửi `{}` — gap tiềm ẩn, nay hết).
- **Kiến trúc (lệch tên file plan, theo DRY/KISS):** thay vì 4 file `theme/special/icon/gif-section.jsx` gần trùng nhau → dùng `caption-pill.jsx` (pill reuse `<CaptionOverlay>` cho parity) + `picker-section.jsx` generic (ẩn khi rỗng) + `caption-picker-sheet.jsx` compose qua mảng `SECTIONS`. **Plug-point cho P3/P4/P5:** thêm section vào `SECTIONS` hoặc render trước `{footer}` trong `caption-picker-sheet.jsx` (đã đánh dấu comment). P3 system-section / P4 image-upload / P5 music-section cắm tại đây.
- **State refactor:** bỏ `sheetCaption`/`aaText`/`isAaCaption`/`normalizeTheme`/`selectFromSheet` → 1 `selectedOverlay` (canonical phẳng | null). `toOverlayData()` (schema) strip `_raw` + chỉ giữ field payload (giải quyết luôn L1 review Phase 1).
- **Helper mới:** `toOverlayData(overlay)` trong `caption-overlay-schema.js`.
- **Code review** (`code-reviewer` → DONE_WITH_CONCERNS): **M1** (overlay_id fallback về `"standard"` cho preset thiếu id → picker selection/toggle hỏng) **đã fix** (nới fallback chain qua caption/order_index, + test). **L1** (polaroid caption lệch bake) **đã fix** (align `captionForPolaroid` với caption handleSend bake). L2/L3/L4 (edge/UX/intended) bỏ qua theo YAGNI.
- **⚠️ M2 — FOLLOW-UP cho user:** `src/screens/send-screen.jsx` (route `/send`, App.jsx:88) còn nguyên bug `{sticker}` + `normalizeTheme` cũ. Route **orphaned** (không in-app navigation nào tới `/send`; chỉ reachable qua URL trực tiếp; camera-screen là single-screen flow). Ngoài scope Phase 2. **Đề xuất:** migrate sang picker mới HOẶC gỡ route — chờ user quyết.
- Files created: `src/components/caption-picker/{caption-pill,picker-section,caption-picker-sheet}.jsx` + test. Modified: `captured-send-preview.jsx` (refactor), `caption-overlay-schema.js` (`toOverlayData` + overlay_id fallback).

## Risk Assessment
- **Regression flow gửi** (refactor state) → test mapping + giữ branch editable text; verify gửi thật trên dev.
- **Themes API trả `[]`** → section ẩn, picker chỉ còn text + (P3 system). Chấp nhận đến khi backend seed.
- **Trùng file `captured-send-preview.jsx` với P1** → P2 nối tiếp P1 (dependencies:[1]), không chạy song song.
