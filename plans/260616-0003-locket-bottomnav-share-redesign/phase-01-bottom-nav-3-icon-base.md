---
phase: 1
title: Bottom-nav 3-icon base
status: completed
priority: P1
effort: 1h
dependencies: []
---

# Phase 1: Bottom-nav 3-icon base

## Overview
Đổi menubar nền (pill nổi giữa) từ `[Lưới · Home · Chat]` sang `[Memory · Shutter · Chat]` đúng Locket. Center là shutter vòng vàng (không phải icon nhà).

## Requirements
- Functional: 3 icon — Memory→`/memories`, Shutter(center)→`/`, Chat→`/chats`. Active highlight theo route hiện tại; center luôn nổi kiểu shutter.
- Non-functional: giữ pill nổi gọn (đã có), không đụng Activity/megaphone.

## Architecture
`bottom-nav.jsx` là component dùng chung (camera, memories, chats, feed...). Phase này chỉ sửa nội dung pill 3-icon. Nút Lưới/Share KHÔNG ở đây (Phase 2 cho feed render riêng).

- Memory icon: dùng `CalendarDays` (lucide) đại diện lịch 3×3 → `/memories`.
- Shutter center: vòng tròn trắng + ring; ring vàng (`--accent-yellow`) khi active (đang ở `/`).
- Chat: `MessageCircle` → `/chats` (alias `/messages`).
- Memory active alias: `/memories`. Bỏ alias `/feed`,`/grid` khỏi base (feed có nav riêng nhưng vẫn render pill — không tab nào active ở feed là chấp nhận được, hoặc giữ shutter mờ).

## Related Code Files
- Modify: `apps/locket-love/src/components/ui/bottom-nav.jsx`

## Implementation Steps
1. Thay `tabs`: `{memory:/memories, CalendarDays}`, `{camera:/, shutter}`, `{messages:/chats, MessageCircle}`.
2. Thêm `ShutterIcon({active})` (vòng trắng + ring vàng khi active) render cho item center; 2 item còn lại render lucide icon thường.
3. Cập nhật import lucide: `CalendarDays, MessageCircle` (bỏ `LayoutGrid, Home` nếu không dùng).
4. Active state: route match → icon sáng; center shutter active khi `pathname === "/"`.
5. `npx vite build` kiểm tra biên dịch.

## Success Criteria
- [ ] Camera/memories/chats chỉ thấy pill 3 icon Memory·Shutter·Chat.
- [ ] Center là shutter vòng vàng khi ở `/`.
- [ ] Bấm Memory→/memories, Chat→/chats, Shutter→/.
- [ ] Build pass.

## Risk Assessment
- Feed render cùng pill → không tab active. Mitigation: chấp nhận (Phase 2 thêm side buttons); hoặc cho Memory active khi `/feed` (alias) — quyết định: KHÔNG alias /feed để tránh hiểu nhầm Memory=feed.
