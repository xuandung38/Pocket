---
phase: 2
title: "FE data layer v2 shape"
status: pending
priority: P1
effort: "2h"
dependencies: [1]
---

# Phase 2: FE data layer v2 shape

## Overview
FE lấy dataset v2 sectioned từ endpoint mới và normalize từng item sang shape nội bộ mà CaptionOverlay/picker dùng — giữ thông tin section (id/name/order) để Phase 3 render theo nhóm.

## Requirements
- Functional: store giữ danh sách sections `[{section_id, name, order_id, items: normalizedOverlay[]}]`. `normalizeOverlay` xử lý cả shape v2 (icon{data,type}, background.colors, text, text_color, effect, is_editable, overlay_id) lẫn shape cũ (backward-compat).
- Non-functional: không phá normalize hiện có cho moment overlays (feed). Cache sessionStorage như cũ.

## Architecture
- `overlay-services.js`: đổi gọi `api.get("v1/public/getAllOverlaysV2")`; trả mảng sections; fallback [].
- `use-overlay-store.js`: thay `groupByType` bằng giữ sections; thêm selector lấy items theo section_id. State: `sections: []` (+ giữ `captionOverlays` map cũ rỗng cho code chưa migrate, hoặc derive map từ items theo type để KHÔNG vỡ caption-picker hiện tại trong lúc migrate).
- `caption-overlay-schema.js` `normalizeOverlay`: nhận diện v2 — map `icon.type==="emoji"` → icon glyph; `icon.type==="image"` → icon image url (data); `background.colors` → gradient; `text`/`text_color`; `overlay_id`; `type` v2 (custom/decorative/template/caption_image/caption_gif/star_sign). Trả object canonical thống nhất với field hiện có (overlay_id, type, caption, text_color, background.colors, icon...) để CaptionOverlay render.

## Related Code Files
- Modify: `apps/locket-love/src/services/overlay-services.js`
- Modify: `apps/locket-love/src/stores/use-overlay-store.js`
- Modify: `apps/locket-love/src/utils/caption-overlay-schema.js`

## Implementation Steps
1. Service → endpoint mới, trả sections (mảng) hoặc [].
2. Store giữ `sections`; derive helper `itemsByType`/`sectionsForTier` cho Phase 3; cache sessionStorage.
3. Mở rộng `normalizeOverlay` cho v2 (giữ nhánh cũ). Unit-test normalize cho từng type v2.
4. Bảo đảm feed moment overlay (đang dùng normalizeOverlay) không đổi hành vi — chạy test cũ.

## Success Criteria
- [ ] Store nạp được sections từ endpoint; sessionStorage cache OK.
- [ ] normalizeOverlay trả canonical đúng cho cả 6 type v2 + shape cũ.
- [ ] Test overlay/caption hiện có vẫn pass; thêm test normalize v2.
- [ ] Build pass.

## Risk Assessment
- normalizeOverlay là điểm dùng chung (feed + picker) → regression. Mitigation: giữ nhánh cũ, thêm nhánh v2 theo dấu hiệu (`icon.type`/`background.colors`/`overlay_id`), test cả hai.
