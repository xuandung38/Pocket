---
phase: 4
title: Streak chip + polish
status: completed
priority: P2
effort: 1.5h
dependencies:
  - 3
---

# Phase 4: Streak chip + polish

## Overview
Thêm chip Streak 🔥 (client-side) vào General/SystemSection. Zodiac đã đến từ data (Phase 3) nên không làm lại. Polish tổng thể + docs.

## Requirements
- Functional: chip "🔥 <n>" hiển thị streak hiện tại nếu lấy được từ user/moments data; không có dữ liệu → ẩn chip (không hiện 0 giả).
- Non-functional: KISS — chỉ thêm 1 SystemButton + overlay streak; không thêm store mới nếu dữ liệu đã có.

## Architecture
- Tìm nguồn streak: kiểm tra `useAuthStore.user` / moments store có field streak/`current_streak` không. Nếu BE self-hosted không trả streak → để TODO (ẩn chip) + ghi rõ; không bịa số.
- `system-section.jsx`: thêm SystemButton "Streak" → onSelect(normalizeOverlay({ type:"streak", caption:`${n}`, icon:"🔥" })) hoặc shape v2 tương ứng để CaptionOverlay render.
- CaptionOverlay: đảm bảo có nhánh render streak (icon 🔥 + số) — nếu Phase 3 chưa cover, thêm.

## Related Code Files
- Modify: `apps/locket-love/src/components/caption-picker/system-section.jsx`
- Modify (nếu cần): `apps/locket-love/src/components/caption-overlay/caption-overlay.jsx`
- Read: `apps/locket-love/src/stores` (tìm nguồn streak)

## Implementation Steps
1. Xác định nguồn streak trong user/moments data (grep). Có → dùng; không → ẩn chip + TODO.
2. Thêm SystemButton streak + render overlay 🔥.
3. Pass tổng thể: build, test, preview các tier/section.

## Success Criteria
- [ ] Chip Streak hiện khi có dữ liệu, ẩn khi không (không số giả).
- [ ] Zodiac (data-driven) hiển thị đúng trong picker.
- [ ] Build + test pass; docs cập nhật nếu cần.

## Risk Assessment
- BE self-hosted có thể không expose streak → chip ẩn (chấp nhận, ghi TODO). Không bịa dữ liệu.

## Open Questions
- Self-hosted BE có trả streak count không? (xác minh ở bước 1; nếu không, streak chip hoãn.)
