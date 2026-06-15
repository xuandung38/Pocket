---
phase: 2
title: Feed side buttons + active moment
status: completed
priority: P1
effort: 2h
dependencies:
  - 1
---

# Phase 2: Feed side buttons + active moment

## Overview
Trên `/feed` thêm 2 nút tròn nổi hai bên pill: Lưới (trái → `/grid`) và Share (phải → mở share-sheet cho moment đang xem). Feed tự render (không nhét vào BottomNav) để giữ component nav đơn giản và sở hữu logic active-moment + sheet.

## Requirements
- Functional: 2 nút CHỈ hiện ở feed; Lưới điều hướng `/grid`; Share mở sheet (Phase 3) cho moment đang hiển thị; xác định moment đang xem qua IntersectionObserver.
- Non-functional: nút canh ngang với pill nav (bottom ~22px), không đè card/nav.

## Architecture
- Feed là vertical snap scroller; mỗi `MomentCard` đã có `data-moment-id` (thêm ở lần sửa trước).
- Active moment: 1 `IntersectionObserver` (threshold ~0.6) trên các phần tử `[data-moment-id]` trong `scrollRef`; entry intersecting nhiều nhất → `activeMomentId`. Lưu state, fallback = moment đầu danh sách.
- 2 nút render trong FeedScreen (ngoài scroller), `position: absolute; bottom: 22` — Lưới `left: 16`, Share `right: 16`, cùng tầm pill nav. Style tròn ~46px nền tối mờ.
- Share onClick → set `shareMoment = moments.find(activeMomentId)` → mở sheet Phase 3.

## Related Code Files
- Modify: `apps/locket-love/src/screens/feed-screen.jsx`
- (Phase 3 tạo) `apps/locket-love/src/components/sheets/moment-share-sheet.jsx`

## Implementation Steps
1. Thêm state `activeMomentId`, `shareOpen`.
2. `useEffect` tạo IntersectionObserver quan sát tất cả `[data-moment-id]` con của `scrollRef`; cập nhật `activeMomentId` theo entry có `intersectionRatio` cao nhất. Re-observe khi `moments` đổi; disconnect khi cleanup.
3. Render 2 nút (Lưới trái, Share phải) chỉ trong nhánh có moments (không hiện ở skeleton/empty). Lưới → `navigate("/grid")`. Share → `setShareOpen(true)`.
4. Mount `<MomentShareSheet open={shareOpen} moment={activeMoment} onClose={...} />` (component Phase 3).
5. `npx vite build`.

## Success Criteria
- [ ] Camera/memories/chats KHÔNG thấy Lưới/Share; chỉ feed có.
- [ ] Cuộn feed → `activeMomentId` đổi theo card đang chiếm màn.
- [ ] Bấm Lưới → /grid. Bấm Share → mở sheet đúng moment đang xem.
- [ ] Build pass.

## Risk Assessment
- Observer chạy lại nhiều lần khi moments đổi → guard re-observe + disconnect cũ.
- Nút Share đè thanh tương tác card khi card thấp → đặt `zIndex` trên card, dưới sheet; kiểm tra không che nội dung chính.
