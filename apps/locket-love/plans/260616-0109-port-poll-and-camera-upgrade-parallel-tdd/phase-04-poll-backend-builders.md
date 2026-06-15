---
phase: 4
title: Poll backend builders
status: completed
priority: P1
effort: 3h
dependencies: []
---

# Phase 4: Poll backend builders

**Track B (Agent B) · không phụ thuộc · chạy song song với Track A & C.** Repo khác: `apps/self-hosted/api`.

## Overview
Thêm payload builder cho poll trong self-hosted API để moment poll **ghi `data.payload.{left_emoji,right_emoji}`** vào Firestore (read-path đã sẵn). Mẫu có sẵn: `imagePostPayloadWeather`.

## Requirements
- Functional: POST moment với `optionsData.type==="poll"` → tạo overlay `{ overlay_id:"caption:poll", overlay_type:"caption", data:{ payload:{left_emoji,right_emoji}, text, text_color, background } }`; áp dụng cho cả ảnh + video.
- Non-functional: theo đúng convention builder hiện có; không phá các type khác.

## Architecture
- `createImagePayload.js`: thêm `exports.imagePostPayloadPoll = ({ imageUrl, optionsData }) => {...}` — đọc `payload.{left_emoji,right_emoji}`, `caption`, `text_color`, `background`; push overlay `caption:poll` có `data.payload`.
- `postImageMoment.js`: thêm `case "poll": postData = creImagePayload.imagePostPayloadPoll({...})` trong cả 2 switch (image + video path nếu chung file).
- `createVideoPayload.js`: thêm `videoPostPayloadPoll` tương tự; nối vào dispatcher video (`postVideoMoment.js`).
- Read-path: KHÔNG sửa — `getMoment.js normalizeMoment` đã trả `overlays.payload`.

## Related Code Files
- Modify: `apps/self-hosted/api/src/services/LocketPayload/createImagePayload.js` (+ `imagePostPayloadPoll`)
- Modify: `apps/self-hosted/api/src/services/LocketPayload/createVideoPayload.js` (+ `videoPostPayloadPoll`)
- Modify: `apps/self-hosted/api/src/services/LocketMoment/postImageMoment.js` (`case "poll"`)
- Modify: `apps/self-hosted/api/src/services/LocketMoment/postVideoMoment.js` (`case "poll"`)
- Reference (mẫu): `createImagePayload.js:126` `imagePostPayloadWeather`

## Implementation Steps (TDD)
1. **Khảo sát test runner BE**: kiểm tra `apps/self-hosted/api` có test setup chưa (`package.json` scripts). Nếu CÓ → viết unit test cho builder. Nếu KHÔNG có harness → viết script kiểm thử thuần (node) khẳng định builder trả đúng shape, ghi rõ trong success criteria (không dựng test-framework mới chỉ cho phase này — KISS).
2. **RED**: assert `imagePostPayloadPoll({imageUrl:"u", optionsData:{type:"poll", payload:{left_emoji:"🔥",right_emoji:"❄️"}, caption:"?"}})` → `data.overlays[0]` có `overlay_id:"caption:poll"`, `data.payload.left_emoji==="🔥"`.
3. **GREEN**: viết builder image + video (mô phỏng `imagePostPayloadWeather`).
4. **Dispatcher**: thêm `case "poll"` vào switch image + video.
5. Smoke: chạy builder với input mẫu → in payload, xác nhận shape khớp Locket (overlay_type "caption").

## Success Criteria
- [x] `imagePostPayloadPoll` + `videoPostPayloadPoll` trả overlay `caption:poll` chứa `data.payload.{left_emoji,right_emoji}`.
- [x] Dispatcher image + video nhận `case "poll"`.
- [ ] Read-path roundtrip xác nhận ở Phase 7 (đăng poll → đọc lại có payload).
- [x] Không phá builder type khác (smoke các case cũ).

## Risk Assessment
- `overlay_id` chính xác của Locket-native cho poll chưa chắc `caption:poll` → cần verify khi test thật (Phase 7); nếu app Locket gốc không nhận, thử id khác (vd `poll`). Ghi nhận open question.
- BE có thể chưa có test harness → dùng smoke script, không over-engineer.
- Video post path có thể nằm khác file `postImageMoment` → xác minh tên dispatcher video thực tế trước khi sửa.
