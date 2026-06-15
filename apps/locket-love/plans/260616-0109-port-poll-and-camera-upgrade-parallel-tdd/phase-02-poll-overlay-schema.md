---
phase: 2
title: Poll overlay & schema
status: completed
priority: P1
effort: 3h
dependencies: []
---

# Phase 2: Poll overlay & schema

**Track A (Agent A) · không phụ thuộc (render thuần) · sau Phase 1 trong track.**

## Overview
Thêm overlay-type `poll`: schema mang `payload.{left_emoji,right_emoji}`, dispatcher render `<PollOverlay>` với 2 biến thể owner (hiện số vote) / friend (nút vote). Phase này CHỈ render — wiring vote/compose ở Phase 3.

## Requirements
- Functional: `normalizeOverlay` nhận type `poll` + giữ nguyên `payload.{left_emoji,right_emoji}`; `<CaptionOverlay>` dispatch `case "poll"` → `<PollOverlay>`; owner-view hiện `leftCount/rightCount`, friend-view hiện 2 nút emoji.
- Non-functional: restyle Tailwind (KHÔNG dùng DaisyUI/`getCaptionStyle` của upstream — locket-love dùng inline `style` + class `caption-chip`); default emoji `👍/👎`.

## Architecture
- Schema (`caption-overlay-schema.js`): thêm `poll` vào danh sách type (comment + cho phép `resolveType` trả `poll` khi `overlay_id="caption:poll"` hoặc `type="poll"`); đảm bảo field `payload` được copy vào canonical object (hiện chỉ weather dùng — generalize: luôn giữ `payload` nếu có).
- `PollOverlay` (port + restyle): props `{ overlayData, pollCounts, pollVariant="friend", momentId, onVote }`.
  - owner: 2 ô emoji + số đếm (ẩn nếu `!pollCounts?.isPoll`).
  - friend: 2 nút bấm; **không tự gọi service** ở phase này — nhận `onVote(emoji)` từ prop (mặc định no-op) để Phase 3 nối vào.
  - Style: shell `bg-white/50 backdrop-blur` (Tailwind thuần, giữ như upstream); gradient từ `overlayData.background.colors` qua inline `style` (theo pattern `default-overlay.jsx`).

## Related Code Files
- Create: `src/components/caption-overlay/poll-overlay.jsx`
- Create: `src/components/caption-overlay/__tests__/poll-overlay.test.jsx`
- Modify: `src/utils/caption-overlay-schema.js` (type `poll` + giữ `payload`)
- Modify: `src/components/caption-overlay/caption-overlay.jsx` (`case "poll"`)
- Modify: `src/utils/__tests__/caption-overlay-schema.test.js` (case poll)
- Reference: upstream `feature/camera-upgrade:.../Overlay/overlays/PollOverlay.jsx`

## Implementation Steps (TDD)
1. **RED — schema test**: `normalizeOverlay({ type:"poll", payload:{left_emoji:"🔥",right_emoji:"❄️"} })` → `.type==="poll"`, `.payload.left_emoji==="🔥"`; `normalizeOverlay({ overlay_id:"caption:poll", ... })` → `.type==="poll"`.
2. **GREEN — schema**: cập nhật `resolveType` + giữ `payload` trong canonical object.
3. **RED — overlay test** (`poll-overlay.test.jsx`):
   - friend-view: render 2 emoji (`👍`,`👎` mặc định), click nút trái → `onVote("👍")` được gọi.
   - owner-view (`pollVariant="owner"`, `pollCounts={isPoll:true,leftCount:3,rightCount:5}`): hiện `3` và `5`.
   - dispatch: `<CaptionOverlay overlay={normalizeOverlay({type:"poll",...})}/>` render PollOverlay (không rơi vào fallback text).
4. **GREEN — overlay**: viết `poll-overlay.jsx` + thêm `case "poll"` vào `caption-overlay.jsx`.
5. `npm run test` xanh.

## Success Criteria
- [ ] Schema nhận `poll` + giữ `payload`; test xanh.
- [ ] PollOverlay render đúng owner/friend; friend click → `onVote`; test xanh.
- [ ] `<CaptionOverlay>` dispatch poll đúng widget.
- [ ] Không vỡ test overlay cũ.

## Risk Assessment
- `payload` chưa được copy trong `normalizeOverlay` cho mọi type → generalize cẩn thận, không phá weather (weather đã dùng `payload`).
- Default emoji khi `payload` rỗng (moment cũ) → fallback `👍/👎`, không crash.
