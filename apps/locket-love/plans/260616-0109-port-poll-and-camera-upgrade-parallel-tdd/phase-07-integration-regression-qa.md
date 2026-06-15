---
phase: 7
title: "Integration & regression QA"
status: pending
priority: P1
effort: "4h"
dependencies: [1, 2, 3, 4, 5, 6]
---

# Phase 7: Integration & regression QA

**Lead (sau khi cả 3 track xong) · blockedBy [1-6].**

## Overview
Hợp nhất 3 track, chạy full regression, và E2E thật cho luồng poll (đăng → roundtrip → vote → count) + camera trên thiết bị thật. Đây là cổng xác minh cuối.

## Requirements
- Functional: poll end-to-end thật (compose → BE ghi payload → feed đọc lại có payload → friend vote → reaction-effect bay → owner thấy count); camera iOS/Android luồng thật OK.
- Non-functional: toàn bộ `npm run test` xanh; không regression overlay/feed/camera/compose cũ.

## Architecture
- Merge 3 track (worktree/branch) → resolve nếu đụng `src/stores/index.js` hay file chung (đã phân quyền tránh, nhưng verify).
- E2E thủ công: cần 1 tài khoản Locket thật + 2 thiết bị (iOS Safari, Android Chrome).

## Related Code Files
- Modify (nếu cần reconcile): `src/stores/index.js`, `src/App.jsx`
- Không tạo file mới ngoài fix tích hợp.

## Implementation Steps
1. **Merge & build**: gộp 3 track; `npm run build` không lỗi; `npm run test` toàn bộ xanh.
2. **Poll roundtrip thật**: đăng moment poll (ảnh + video) → kiểm tra Firestore/đọc lại moment có `overlays.payload.{left_emoji,right_emoji}` (xác nhận `overlay_id` Locket chấp nhận — chốt open question Phase 4).
3. **Vote thật**: từ tài khoản bạn bè → vote → `reactToMoment` thành công + reaction-effect bay + owner thấy count tăng đúng vế.
4. **Camera thật**: iOS Safari (facingMode, record, torch); Android Chrome (chọn lens 0.5x/1x/2x, pinch-zoom, record 30fps, torch). Không regression.
5. **Regression sweep**: overlay cũ (weather/battery/heart...), feed react thường, compose caption thường, gallery fallback.
6. Cập nhật docs nếu cần (`docs/` — đánh giá impact).

## Success Criteria
- [ ] `npm run test` + `npm run build` xanh toàn bộ.
- [ ] Poll roundtrip thật OK (payload ghi + đọc lại + hiển thị trên app Locket gốc nếu có thể).
- [ ] Vote thật → effect + count đúng.
- [ ] Camera iOS + Android luồng thật không regression; Android đa-lens + pinch-zoom hoạt động.
- [ ] Overlay/feed/compose/camera cũ không vỡ.
- [ ] Open question `overlay_id` poll được chốt (verify thật).

## Risk Assessment
- `overlay_id:"caption:poll"` có thể không hiển thị trên app Locket chính thức → nếu vậy thử id khác; ghi nhận & sửa Phase 4 builder.
- Camera chỉ test đủ trên thiết bị thật — không có thiết bị → để lại checklist QA cho user, đánh dấu phase blocked-on-device thay vì giả "done".
- Merge conflict `stores/index.js` nếu track lấn quyền → review trước merge.

## Next Steps
- `/ck:journal` ghi lại quyết định & bài học.
- Cân nhắc roadmap 2 branch còn lại (`feature/background-image-support`, `feature/group-chat`).
