# Brainstorm — Locket bottom-nav + feed share redesign

**Date:** 2026-06-16
**App:** `apps/locket-love`
**Branch:** feat/fix-selfhost
**Status:** Agreed — ready for `/ck:plan`

## Problem statement
Bottom menubar phải khớp Locket gốc:
- Menubar nền (mọi màn) chỉ **3 icon**: Memory · Home(shutter) · Chat.
- Vào Feed (Lịch sử) mới hiện **2 nút rời hai bên**: Lưới (trái) + Share (phải).
- Share mở bottom-sheet: targets IG/Snap/Tin nhắn/TikTok + Web Share, dưới có Lưu + Xóa.

## Requirements (chốt qua Q&A)
- **Memory** (icon lịch 3×3) → `/memories` (lưu ý: đang mock-data).
- **Lưới** (feed-only, trái) → `navigate("/grid")`.
- **Share** (feed-only, phải) → bottom-sheet cho moment đang xem.
- **Share targets** → **best-effort deep-link + fallback Web Share** (IG/Snap/TikTok/Messages).
- **Lưu** → tải ảnh moment về máy. **Xóa** → `deleteMoment` (chỉ moment của mình).
- **Activity** → giữ nguyên ở megaphone góc trái-trên camera (không vào menubar).

### Expected output
- `bottom-nav.jsx`: pill 3 icon [Memory→/memories, Shutter→/, Chat→/chats], center shutter vòng vàng.
- `feed-screen.jsx`: render 2 nút tròn nổi hai bên (Lưới trái → /grid, Share phải → mở sheet) chỉ trên /feed; track active moment bằng IntersectionObserver.
- Component mới `moment-share-sheet.jsx` (tái dùng `sheets/bottom-sheet.jsx`): hàng targets + Lưu + Xóa.

### Acceptance criteria
- Camera/memories/chats: chỉ thấy pill 3 icon, không có Lưới/Share.
- Trên /feed: thấy Lưới (trái) + Share (phải) flanking pill.
- Bấm Lưới → /grid. Bấm Share → sheet cho đúng moment đang hiển thị.
- Sheet: branded button thử mở app (URL scheme) + tải ảnh, fail → Web Share; Lưu tải ảnh; Xóa chỉ hiện/cho phép với moment của mình + confirm.
- Memory → /memories.

### Scope boundary (OUT)
- Wire `/memories` sang dữ liệu thật (vẫn mock) — follow-up riêng.
- Không đổi luồng camera/capture, không đổi Activity.

### Constraints / touchpoints
- Files: `components/ui/bottom-nav.jsx`, `screens/feed-screen.jsx`, `screens/grid-screen.jsx` (đã đúng), mới `components/.../moment-share-sheet.jsx`; reuse `sheets/bottom-sheet.jsx`, store `deleteMoment`.
- Routes hiện có: /memories, /grid, /feed, /chats, /activity.

## Approaches
| Phần | Chọn | Lý do |
|------|------|-------|
| Side buttons | Feed tự render (không nhét vào BottomNav) | Share cần active-moment + sheet; giữ BottomNav đơn giản (KISS) |
| Active moment | IntersectionObserver per card | Feed là snap scroller; card chiếm màn nhiều nhất = active |
| Branded share | Best-effort deep-link + Web Share fallback | User chọn; giống Locket nhất trong giới hạn web |

## Risks / brutal honesty
- **Branded deep-link không đính được ảnh**: instagram://, snapchat://, tiktok:// chỉ mở app, KHÔNG nhận ảnh từ web. Best-effort = mở app + ảnh tải/copy riêng + fallback Web Share. Cần set kỳ vọng đúng trong UI (vd: tải ảnh rồi mở app).
- **Xóa**: chỉ moment của mình; guard `isOwn`, confirm trước khi gọi BE.
- **/memories mock-data**: Memory ra lịch mock cho tới khi wire.
- **Center icon**: đổi từ house (đang có) → shutter vòng vàng theo ảnh mới.

## Success metrics
- Đúng 3 icon nền; Lưới/Share chỉ ở feed; share sheet thao tác đúng moment; build pass; thao tác mobile thực tế ổn.

## Open questions
- Deep-link mỗi target chính xác dùng scheme nào (instagram-stories://share cần FB App ID)? → xác định ở phase plan; mặc định fallback Web Share nếu scheme rủi ro.
