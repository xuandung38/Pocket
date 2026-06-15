---
phase: 3
title: "Render v2 types + sectioned picker"
status: pending
priority: P1
effort: "3h"
dependencies: [2]
---

# Phase 3: Render v2 types + sectioned picker

## Overview
Render đủ 6 loại item v2 trong CaptionOverlay và hiển thị caption-picker theo section thật (map vào tier VIP/General/Decorative). Đây là phần "thể hiện đẹp hơn" + "không thiếu".

## Requirements
- Functional: CaptionOverlay render đúng:
  - `custom`: nền gradient (background.colors) + text editable (text_color).
  - `decorative`/`template`: gradient + emoji icon + text.
  - `caption_image`: badge PNG (icon.data url).
  - `caption_gif`: GIF (icon.data url).
  - `star_sign`: ảnh zodiac + text ("Mùa <cung>").
- Picker chia tier: **VIP** = photo frame (đã có) + section `suggest`/đặc sắc?; **General** = custome/text + system; **Decorative** = decorative/template/caption_image/caption_gif/star_sign — HOẶC render theo đúng section name của data (suggest/Decorative by Locket/by Dio/Icon/Gif/Cung hoàng đạo). Chốt mapping khi cook: ưu tiên giữ section name gốc dưới 3 tier.

## Architecture
- `caption-overlay/caption-overlay.jsx`: thêm nhánh render theo `type` v2 (image badge, gif, zodiac image). Tái dùng gradient/text hiện có cho custom/decorative/template.
- `caption-picker-sheet.jsx`: thay nhóm cứng bằng render `sections` từ store (Phase 2), gom vào 3 tier. `picker-section.jsx` nhận items canonical (đã hỗ trợ). VIP vẫn là FrameSection.
- `caption-pill.jsx` không đổi (đã reuse CaptionOverlay).

## Related Code Files
- Modify: `apps/locket-love/src/components/caption-overlay/caption-overlay.jsx` (+ sub-renderers nếu cần)
- Modify: `apps/locket-love/src/components/caption-picker/caption-picker-sheet.jsx`
- Modify (nếu cần): `apps/locket-love/src/components/caption-picker/picker-section.jsx`

## Implementation Steps
1. CaptionOverlay: thêm render image/gif/zodiac (img từ icon.data; bo góc; max-height); giữ gradient+text cho custom/decorative/template.
2. caption-picker-sheet: lấy `sections` từ store, map section → tier (VIP/General/Decorative) theo bảng chốt; render section name làm label phụ.
3. Đảm bảo chọn item vẫn forward canonical overlay (onSelect) + đóng sheet; frame vẫn riêng (onSelectFrame).
4. Verify hiển thị: gradient, emoji, badge, gif, zodiac đều đẹp; preview.

## Success Criteria
- [ ] 6 loại item render đúng & đẹp trong picker và trên ảnh.
- [ ] Picker hiện đủ sections từ data (không thiếu caption).
- [ ] Chọn caption/frame hoạt động đúng; không vỡ overlay feed.
- [ ] Build + test pass.

## Risk Assessment
- caption_image/gif là ảnh ngoài (cdn.locket-dio/storage.googleapis) — chỉ hiển thị `<img>` (OK, không CORS). Nếu sau này cần bake vào ảnh gửi đi → ngoài scope phase này.
- Tier mapping mơ hồ → chốt bảng map ở đầu cook, ưu tiên giữ section name gốc.
