---
phase: 1
title: Client Chat Store
status: completed
priority: P1
effort: 3-4h
dependencies: []
---

# Phase 1: Client Chat Store

## Overview

Tạo zustand store in-memory `src/stores/use-chat-store.js` làm single source of truth cho chat: giữ messages theo conversation + conv metadata, sở hữu listener socket (gắn 1 lần), expose actions cho screens. Đây là phase cốt lõi diệt jank — state không còn chết theo component.

## Requirements

- **Functional:**
  - Giữ `messagesByConv` (messages theo từng `friendUid`, newest-first, dedupe theo id) + `convMeta` (lastMessage/lastTime/unread theo `friendUid`).
  - Gắn listener `onMessage` + `onListMessage` **đúng 1 lần cho mỗi instance socket**; tự gắn lại sau khi socket bị tear-down/recreate (đổi token).
  - Merge incoming messages: trùng id → update tại chỗ (cho reaction edits); mới → unshift; giữ sort theo `createdAt|update_time` desc.
  - Optimistic: thêm stub `tmp-*`, và khi echo thật về thì **thay thế stub** (không nhân đôi).
  - Cap mỗi conversation ~200 tin gần nhất (chống phình bộ nhớ).
  - `reset()` xoá toàn bộ state khi logout (`lk:auth:reset`).
- **Non-functional:** in-memory (mất khi refresh — chấp nhận); file < 200 dòng; không phụ thuộc DOM; SSR/test-safe (giống `socket-service`).

## Architecture

**State**
```
messagesByConv: { [friendUid]: Message[] }   // newest-first, dedupe theo id
convMeta:       { [friendUid]: { lastMessage, lastTime, unread } }
activeConv:     string | null
_attachedSocket: object | null               // ref socket đã gắn listener (reconnect-safe)
_offMessage / _offList: (() => void) | null  // unsub handles
```

**Message shape** (giữ nguyên từ backend, xem `chat-namespace-handler.normalizeWsMessage`):
`{ id, uid, body, sender, type, createdAt, update_time, replyMoment, thumbnailUrl, isRead, _pending? }`

**Actions**
- `initSocket(idToken)` — gọi `connectSocket(idToken)`; nếu socket trả về **khác** `_attachedSocket` thì gỡ listener cũ (nếu có), gắn `onMessage(ingestMessages)` + `onListMessage(ingestConvList)`, lưu ref + unsub handles. Idempotent — gọi nhiều lần an toàn.
- `openConversation(friendUid)` — set `activeConv`; gọi `emitGetMessagesWith(friendUid)` để mở live WS + lấy phần thiếu. **KHÔNG xoá `messagesByConv[friendUid]`** (mấu chốt diệt nhấp nháy).
- `ingestMessages(items)` — chuẩn hoá thành mảng, gom theo peer (`sender !== me ? sender : receiver_uid|receiverUid|with_user`), merge+dedupe vào `messagesByConv[peer]` (logic chuyển từ `chat-detail-screen.jsx:112-131`), cap 200, đồng thời cập nhật `convMeta[peer]`.
- `ingestConvList(data)` — merge vào `convMeta` (logic từ `chat-list-screen.jsx:72-95`).
- `addOptimistic(friendUid, { body, myUid })` — unshift stub `{ id: 'tmp-'+Date.now(), body, sender: myUid, createdAt, update_time, type:'text', _pending:true }`; trả về `tmpId`.
- `reconcileOptimistic(friendUid, tmpId, { ok })` — `ok=false` → bỏ stub (rollback); `ok=true` → giữ `_pending:false`. Khi echo thật về qua `ingestMessages`, nếu có message từ `myUid` cùng `body` và còn stub `_pending` → **thay id của stub** thay vì thêm mới (so khớp body+sender, window thời gian ~60s).
- `setUnreadZero(friendUid)` — clear unread khi mở chat (đi kèm `markReadMessage`).
- `reset()` — clear hết, gỡ listener, null refs.

**Selectors (export rời, tránh re-render thừa):**
- `selectMessages(friendUid)` → `s.messagesByConv[friendUid] || EMPTY`
- `selectConvMeta` → `s.convMeta`

**Vòng đời socket:** store chỉ *dùng* `socket-service` (đã là singleton), không tự tạo socket. Listener gắn ở store thay vì ở screen → tin nhắn dồn vào store kể cả khi màn chat unmount. `reset()` được nối với `lk:auth:reset` (đăng ký 1 lần ở module-eval, guard `typeof window`).

## Related Code Files

- Create: `src/stores/use-chat-store.js`
- Modify: `src/stores/index.js` (export `useChatStore` + selectors)
- Read-only ref: `src/services/socket-service.js`, `src/services/chat-services.js`, `src/stores/use-frame-store.js` (pattern), `src/stores/use-memories-store.js` (pattern selector + reset)

## Implementation Steps

1. Tạo `use-chat-store.js` với `create()` của zustand; định nghĩa state mặc định + `EMPTY = []` (hằng dùng chung cho selector tránh tạo array mới).
2. Viết helper thuần (top-of-file, testable): `mergeMessages(prev, incoming)` (dedupe+sort+cap 200) và `peerOf(msg, myUid)`.
3. Implement `ingestMessages` / `ingestConvList` dùng helper trên; cập nhật cả `messagesByConv` lẫn `convMeta`.
4. Implement `addOptimistic` / `reconcileOptimistic` + nhánh thay-thế-stub trong `mergeMessages` (match body+sender+_pending).
5. Implement `initSocket` reconnect-safe (so sánh `_attachedSocket`), `openConversation`, `setUnreadZero`, `reset`.
6. Đăng ký `window.addEventListener('lk:auth:reset', () => useChatStore.getState().reset())` ở cuối module (guard `typeof window !== 'undefined'`).
7. Export từ `src/stores/index.js`. Chạy `npm run build` kiểm tra compile.

## Success Criteria

- [ ] `use-chat-store.js` < 200 dòng, build pass (`npm run build`).
- [ ] `initSocket` gọi 2 lần không gắn trùng listener; sau reconnect (đổi token) listener được gắn lại.
- [ ] `ingestMessages` cùng id 2 lần không tạo bản trùng; reaction edit update tại chỗ.
- [ ] Optimistic stub được echo thật thay thế, không nhân đôi.
- [ ] `reset()` xoá sạch state.

## Risk Assessment

- **Reconnect mất listener:** mitigated bằng so sánh `_attachedSocket` trong `initSocket`.
- **Optimistic id mismatch (tmp vs real):** mitigated bằng match body+sender+_pending window 60s.
- **Phình bộ nhớ:** cap 200 tin/conv.
- **Re-render thừa:** dùng selector + `EMPTY` hằng số.
