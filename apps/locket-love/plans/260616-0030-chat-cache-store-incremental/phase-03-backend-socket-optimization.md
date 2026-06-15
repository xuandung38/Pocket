---
phase: 3
title: Backend Socket Optimization
status: completed
priority: P2
effort: 2h
dependencies: []
---

# Phase 3: Backend Socket Optimization

## Overview

Bỏ round-trip thừa ở `chat-namespace-handler.js`: mỗi lần `get_messages_with_user` đang gọi `getAllMessages` (full conv list) **chỉ để** resolve `conversationId`, rồi mới fetch history. Thêm cache map peer→convId per-socket + tái dùng Locket WS khi mở lại đúng conversation đang mở.

## Requirements

- **Functional:**
  - Cache `peerUid → conversationId` theo từng socket connection (sống suốt connection, clear on disconnect). Lần mở chat tiếp theo trong cùng phiên không gọi lại `getAllMessages`.
  - Nếu `get_messages_with_user` được gọi cho **đúng peer đang mở** (WS còn sống) → không đóng+mở lại Locket WS; vẫn fetch history (client store dedupe nên không nhân đôi UI).
  - Giữ nguyên contract event (`new_message_with_user`, `new_on_list_message`) — client không cần đổi.
- **Non-functional:** không thêm dependency mới; thay đổi khu trú trong `chat-namespace-handler.js`; an toàn khi cache miss (fallback gọi `getAllMessages` như cũ).

## Architecture

**Maps mới (cạnh `activeLocketWs`):**
```
const convIdCache = new Map();   // socket.id → Map<peerUid, convId>
const activePeer  = new Map();   // socket.id → peerUid hiện đang mở
```

**`get_messages_with_user` (sửa `chat-namespace-handler.js:96-135`):**
```
peerUid = otherUserId || messageId
// 1. resolve convId qua cache trước
let perSocket = convIdCache.get(socket.id) || new Map()
let conversationId = perSocket.get(peerUid)
if (!conversationId) {
   try { const { messages: convList } = await getAllMessages(idToken, localId)
         const conv = convList.find(c => c.with_user===peerUid || c.uid===peerUid)
         conversationId = conv?.uid || peerUid
         // cache toàn bộ mapping luôn để mở chat khác cũng hit
         for (const c of convList) if (c.uid) perSocket.set(c.with_user||c.uid, c.uid)
         convIdCache.set(socket.id, perSocket)
   } catch { conversationId = peerUid }
}
// 2. WS reuse: chỉ đóng+mở khi đổi peer
const samePeer = activePeer.get(socket.id) === peerUid
const prev = activeLocketWs.get(socket.id)
if (!samePeer && prev && prev.readyState < 2) prev.close()
// 3. fetch history (luôn — client dedupe)
try { const { messages } = await getMessagesWithUser(idToken, localId, conversationId)
      if (messages?.length) socket.emit("new_message_with_user", messages) } catch {}
// 4. mở WS mới chỉ khi đổi peer hoặc WS chết
if (!samePeer || !prev || prev.readyState >= 2) {
   const ws = openLocketChatWs(localId, peerUid, idToken, (msgs)=>socket.emit("new_message_with_user", msgs))
   activeLocketWs.set(socket.id, ws)
}
activePeer.set(socket.id, peerUid)
```

**`disconnect` (sửa `:138-142`):** thêm `convIdCache.delete(socket.id); activePeer.delete(socket.id);`

**Out of scope (cố tình bỏ — YAGNI):** honor `timestamp` để trả incremental history. Lý do: live WS đã đẩy tin mới, client store đã dedupe full history → lợi ích nhỏ, đụng query Firestore phức tạp. Ghi nhận làm sau nếu đo thấy fetch history vẫn nặng.

## Related Code Files

- Modify: `apps/self-hosted/api/src/socket/chat-namespace-handler.js`
- Read-only ref: `apps/self-hosted/api/src/services/LocketMessage/index.js` (`getAllMessages`, `getMessagesWithUser`)

## Implementation Steps

1. Thêm `convIdCache` + `activePeer` Map cạnh `activeLocketWs`.
2. Sửa handler `get_messages_with_user` theo pseudo ở trên: resolve-via-cache, prefill toàn bộ mapping, WS reuse theo `samePeer`.
3. Sửa `disconnect` cleanup 2 map mới.
4. Test thủ công: mở chat A → B → A lại, xác nhận log không lặp `getAllMessages` (thêm log tạm nếu cần), WS không đóng/mở khi mở lại đúng peer.

## Success Criteria

- [ ] Mở chat lần 2+ trong cùng phiên không gọi lại `getAllMessages` (cache hit).
- [ ] Mở lại đúng peer đang mở không churn Locket WS (không log close+open).
- [ ] Đổi peer vẫn đóng WS cũ + mở WS mới đúng (không rò connection).
- [ ] Cache miss / lỗi → fallback hành vi cũ, không vỡ.
- [ ] Disconnect clear sạch 3 map (không leak theo socket.id).

## Risk Assessment

- **Stale convId cache:** convId hiếm khi đổi trong 1 phiên; nếu lỗi fetch history → client vẫn nhận qua live WS. Chấp nhận, clear on disconnect.
- **WS reuse sai trạng thái:** chỉ reuse khi `readyState < 2` (OPEN/CONNECTING); ngược lại mở mới.
- **Leak map:** cleanup ở `disconnect` cho cả 3 map.
