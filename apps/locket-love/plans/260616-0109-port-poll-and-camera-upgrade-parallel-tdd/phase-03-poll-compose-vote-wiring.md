---
phase: 3
title: Poll compose & vote wiring
status: completed
priority: P1
effort: 5h
dependencies:
  - 1
  - 2
---

# Phase 3: Poll compose & vote wiring

**Track A (Agent A) · blockedBy [1,2] · làm cuối track A.**

## Overview
Nối poll end-to-end: modal chọn cặp emoji ở compose → set `overlayData.payload` → đăng (payload đã passthrough sẵn); ở feed, friend-view vote gọi `sendReactMoment` + `triggerReaction`; owner-view tính `pollCounts` từ `moment.reactions`.

## Requirements
- Functional:
  - Compose: thêm entry "Poll" trong caption-picker mở `EmojiPollModal`; chọn cặp/lẻ → cập nhật overlay state `{type:"poll", payload:{left_emoji,right_emoji}}`; preview hiện PollOverlay owner-style (không nút vote).
  - Feed: PollOverlay friend-view `onVote(emoji)` → `sendReactMoment(emoji, momentId, 0)` + `triggerReaction(emoji)` + toast; owner moment → tính `pollCounts` từ `moment.reactions`.
- Non-functional: tái dùng `sendReaction` pattern sẵn có ở `feed-screen.jsx`; không sửa `payload-services.js` (đã passthrough `overlayData.payload` ở dòng 68-69).

## Architecture
- `emoji-poll-modal.jsx` (port `EmojiPollModal`, restyle): bottom-sheet portal, 2 tab "Gợi ý cặp"/"Chỉnh lẻ"; remap class DaisyUI (`btn/btn-primary/base-*`) → token locket-love; theo cơ chế animation của `caption-picker-sheet.jsx`. Callback `onSelect({left_emoji,right_emoji})`.
- `caption-picker-sheet.jsx`: thêm nhóm/nút "Poll" → mở modal → emit overlay `{type:"poll", payload}` qua `onSelect` hiện có.
- `captured-send-preview.jsx`: khi overlay.type==="poll" render `<PollOverlay pollVariant="owner">` (compose preview, chưa có vote/counts).
- `feed-screen.jsx`:
  - Helper `computePollCounts(moment)`: group `moment.reactions` theo emoji → `{leftCount,rightCount,leftEmoji,rightEmoji,isPoll}` so với `overlay.payload`.
  - Render `<PollOverlay pollVariant={isOwner?"owner":"friend"} momentId={moment.id} pollCounts={computePollCounts(moment)} onVote={(e)=>{ sendReaction(moment,e); triggerReaction(e); }} />`.

## Related Code Files
- Create: `src/components/caption-picker/emoji-poll-modal.jsx`
- Create: `src/components/caption-picker/__tests__/emoji-poll-modal.test.jsx`
- Modify: `src/components/caption-picker/caption-picker-sheet.jsx` (entry Poll)
- Modify: `src/components/captured-send-preview.jsx` (preview poll owner-style)
- Modify: `src/screens/feed-screen.jsx` (vote + computePollCounts + triggerReaction)
- Modify: `src/components/caption-overlay/poll-overlay.jsx` (nếu cần nhận `onVote` đã có ở P2)
- Reference: upstream `feature/poll-emoji-picker:.../Modal/EmojiPollModal.jsx`

## Implementation Steps (TDD)
1. **RED — modal test**: render `<EmojiPollModal open onSelect=spy/>`; click 1 cặp ở tab "Gợi ý cặp" → `onSelect` nhận `{left_emoji,right_emoji}`; chuyển tab "Chỉnh lẻ" + `activeSide` → click emoji → set đúng 1 vế.
2. **GREEN — modal**: viết `emoji-poll-modal.jsx` (restyle).
3. **RED — count test**: `computePollCounts({reactions:[{emoji:"👍"},{emoji:"👍"},{emoji:"👎"}], overlays:{payload:{left_emoji:"👍",right_emoji:"👎"}}})` → `{leftCount:2,rightCount:1,isPoll:true}`. (Đặt helper export được để test trực tiếp.)
4. **GREEN — count + feed wiring**: thêm `computePollCounts`, nối PollOverlay vào feed; friend-view `onVote` gọi `sendReaction`+`triggerReaction`.
5. **Compose wiring**: thêm entry Poll vào caption-picker; preview owner-style.
6. **RED/GREEN — vote test (feed)**: mock `sendReactMoment`; click vote ở friend moment → `sendReactMoment` gọi với `(emoji, momentId, 0)`; `triggerReaction` được gọi.
7. `npm run test` xanh.

## Success Criteria
- [ ] Modal chọn cặp/lẻ → emit payload đúng; test xanh.
- [ ] `computePollCounts` đúng; test xanh.
- [ ] Friend vote → `sendReactMoment(emoji,id,0)` + `triggerReaction`; owner thấy số đếm.
- [ ] Compose chọn Poll → preview owner-style; đăng kèm `overlayData.payload` (không sửa payload-services).
- [ ] Không vỡ test feed/compose cũ.

## Risk Assessment
- Trùng emoji react thường vs vote (đã chấp nhận ở brainstorm) — count theo emoji là đủ.
- `moment.reactions` có thể rỗng/thiếu → `isPoll:false`, owner ẩn số đếm (degrade).
- Modal z-index vs các sheet khác → kiểm tra chồng lớp.
- ⚠️ Cần Phase 4 (BE builder) để moment poll đăng được & roundtrip; nếu Phase 4 chưa xong, test FE vẫn xanh nhưng E2E thật chờ Phase 7.
