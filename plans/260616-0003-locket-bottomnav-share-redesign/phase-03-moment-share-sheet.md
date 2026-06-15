---
phase: 3
title: Moment share sheet
status: completed
priority: P1
effort: 3h
dependencies:
  - 2
---

# Phase 3: Moment share sheet

## Overview
Component `moment-share-sheet.jsx` (bọc `BottomSheet` có sẵn): hàng share targets (Instagram, Snapchat, Tin nhắn, TikTok, Khác) + 2 nút dưới Lưu / Xóa. Branded targets dùng best-effort deep-link + fallback Web Share.

## Requirements
- Functional:
  - Targets: IG, Snapchat, Tin nhắn, TikTok, Khác(Web Share).
  - Branded: thử mở app qua URL scheme + tải ảnh về máy; fail → `navigator.share`/copy link.
  - **Lưu**: download ảnh moment hiện tại về máy.
  - **Xóa**: gọi `useMomentsStoreV2.deleteMoment(id)` — CHỈ hiện/cho phép khi moment là của mình (`isOwn`), có confirm.
- Non-functional: trung thực về giới hạn (deep-link không đính ảnh) — không giả vờ share thành công.

## Architecture
- Props: `{ open, moment, meUid, onClose }`. `BottomSheet` cung cấp backdrop + slide.
- Image URL: `moment.thumbnailUrl||thumbnail_url||image_url||image` (helper đã có ở feed/grid — cân nhắc tách `utils/moment-media.js` để DRY).
- `isOwn = ownerUid === meUid` (ownerUid = `moment.user||userUid||owner`).
- **Download/Save** (`utils/download-moment.js`): `fetch(url)`→blob→`URL.createObjectURL`→`<a download>` click→revoke. Bắt CORS lỗi (R2 đã set CORS — xác nhận) → toast fail.
- **Branded deep-link** (`utils/share-targets.js`): map scheme:
  - Tin nhắn: `sms:?body=<link>` (an toàn, có thật).
  - IG/Snap/TikTok: best-effort `instagram://`, `snapchat://`, `tiktok://` qua `location.href` + timeout fallback Web Share/copy. Ghi chú: KHÔNG đính được ảnh; tải ảnh trước rồi mở app.
  - Khác: `navigator.share({ url, files? })`; không hỗ trợ → copy link + toast.
- Toast: dùng `SonnerSuccess/Warning/Error` có sẵn.

## Related Code Files
- Create: `apps/locket-love/src/components/sheets/moment-share-sheet.jsx`
- Create: `apps/locket-love/src/utils/share-targets.js`
- Create: `apps/locket-love/src/utils/download-moment.js`
- (Optional DRY) Create: `apps/locket-love/src/utils/moment-media.js` (getMomentImage dùng chung feed/grid/camera)
- Modify: `apps/locket-love/src/screens/feed-screen.jsx` (mount sheet — đã nối ở Phase 2)

## Implementation Steps
1. `utils/download-moment.js`: hàm `downloadMoment(url, filename)`.
2. `utils/share-targets.js`: `openShareTarget(target, { url, file })` + `webShare(...)` fallback.
3. `moment-share-sheet.jsx`: hàng icon targets (5) + Lưu + Xóa (Xóa ẩn nếu !isOwn); wire handlers + toast; Xóa confirm rồi `deleteMoment` → onClose.
4. Feed truyền `meUid` + `moment` vào sheet; sau Xóa thành công, nếu activeMoment bị xóa thì observer tự cập nhật.
5. `npx vite build`.

## Success Criteria
- [ ] Bấm Share (feed) → sheet hiện targets + Lưu + Xóa.
- [ ] Lưu → tải đúng ảnh moment đang xem.
- [ ] Tin nhắn mở `sms:`; Khác mở OS share sheet; IG/Snap/TikTok thử mở app, fail→fallback (không crash).
- [ ] Xóa chỉ hiện với moment của mình, confirm, gọi BE, moment biến mất khỏi feed.
- [ ] Build pass.

## Risk Assessment
- **Deep-link không đính ảnh**: chấp nhận (giới hạn web); UX = tải ảnh + mở app. Tránh hứa hẹn sai trong label.
- **CORS khi fetch ảnh để download/Web Share files**: R2 cần `Access-Control-Allow-Origin`. Nếu thiếu → download fail; fallback mở ảnh tab mới. Xác nhận CORS R2 trước.
- **Xóa moment bạn bè**: BE từ chối → guard `isOwn` ở client + ẩn nút.
