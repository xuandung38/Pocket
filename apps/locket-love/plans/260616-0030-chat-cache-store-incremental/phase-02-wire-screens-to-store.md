---
phase: 2
title: Wire Screens to Store
status: completed
priority: P1
effort: 2-3h
dependencies:
  - 1
---

# Phase 2: Wire Screens to Store

## Overview

Refactor `chat-detail-screen.jsx` + `chat-list-screen.jsx` thành **consumer thuần** của `useChatStore`: bỏ state local + listener socket per-screen, đọc qua selector. Vào chat hiện cache tức thì, không clear → hết màn trắng + reload-flash.

## Requirements

- **Functional:**
  - Chat detail đọc `selectMessages(friendUid)` từ store; mount → `initSocket` + `openConversation` + `markReadMessage` + `setUnreadZero`. Không còn `setMessages` local.
  - Gửi tin: `addOptimistic` → `sendMessage` → `reconcileOptimistic(ok)`.
  - Chat list đọc `convMeta` từ store; mount → `initSocket` + `emitGetListMessage`. Không còn `useState(convMeta)`.
  - Hành vi UI giữ nguyên (group header thời gian, avatar, reverse-render, scroll-to-bottom, menu).
- **Non-functional:** không đổi shape props của `ChatBubble`; mỗi screen vẫn < 200 dòng sau refactor (detail hiện 429 dòng — tách helper nếu cần nhưng KHÔNG bắt buộc trong phase này nếu chỉ giảm logic).

## Architecture

**Listener ở đâu:** chuyển từ screen vào store (Phase 1). Screen chỉ gọi `initSocket(idToken)` (idempotent) + emit. Socket-service vẫn singleton → rời màn chat tin vẫn dồn vào store.

**initSocket đặt ở screen (lazy), không ở App.jsx:** chủ ý KISS + không mở socket cho user không bao giờ vào chat. Cả 2 screen gọi `initSocket` on mount (idempotent). Đây là tinh chỉnh của ý "init 1 lần" trong brainstorm — vị trí là chi tiết triển khai, hành vi "gắn listener đúng 1 lần" do store đảm bảo.

**Chat detail flow (thay cho effect hiện tại `chat-detail-screen.jsx:87-142`):**
```
on mount (friendUid đổi):
  const { idToken } = getToken(); if (!idToken) return
  initSocket(idToken)
  openConversation(friendUid)     // emit get_messages_with_user, KHÔNG clear cache
  markReadMessage(friendUid); setUnreadZero(friendUid)
messages = useChatStore(selectMessages(friendUid))   // render cache ngay
```
Bỏ block `setMessages((prev) => …)` dedupe — đã nằm trong store.

**Send flow (thay `handleSend` `chat-detail-screen.jsx:151-190`):**
```
const tmpId = addOptimistic(friendUid, { body: text, myUid }); setDraft(""); setSending(true)
try { await sendMessage({ receiver_uid: friendUid, message: text }); reconcileOptimistic(friendUid, tmpId, { ok:true }) }
catch { reconcileOptimistic(friendUid, tmpId, { ok:false }); setDraft(text) }
finally { setSending(false) }
```

**Chat list flow (thay `chat-list-screen.jsx:64-131`):**
```
on mount: initSocket(idToken); emitGetListMessage()
convMeta = useChatStore(selectConvMeta)    // thay useState
```
Giữ nguyên `sorted` useMemo (đọc convMeta từ store thay vì state local).

## Related Code Files

- Modify: `src/screens/chat-detail-screen.jsx`, `src/screens/chat-list-screen.jsx`, `src/App.jsx` (chỉ nếu chọn init ở App — mặc định KHÔNG đụng App)
- Read-only ref: `src/services/socket-service.js`, `src/stores/use-chat-store.js` (Phase 1), `src/components/ui/chat-bubble.jsx`

## Implementation Steps

1. **chat-detail:** thay `const [messages,setMessages]=useState([])` bằng `const messages = useChatStore(selectMessages(friendUid))`. Import actions `initSocket, openConversation, setUnreadZero, addOptimistic, reconcileOptimistic`.
2. Thay effect socket (87-142) bằng flow gọn ở trên; giữ effect scroll-to-bottom + menu nguyên.
3. Thay `handleSend` bằng optimistic flow dùng store. Giữ `emitTyping` debounce (no-op backend).
4. **chat-list:** thay `useState({})` + 2 listener block bằng `useChatStore(selectConvMeta)` + `initSocket` + `emitGetListMessage`. Giữ `sorted` useMemo, đổi dependency `convMeta` (từ store).
5. `npm run build` + smoke test: vào chat → ra → vào lại không thấy màn trắng/reload.

## Success Criteria

- [ ] Build pass; không còn `useState` cho messages/convMeta trong 2 screen.
- [ ] Vào lại 1 chat đã mở → tin cũ hiện **ngay**, không màn trắng, không nhấp nháy danh sách.
- [ ] Gửi tin: stub hiện ngay, echo về không nhân đôi; gửi lỗi → rollback + khôi phục draft.
- [ ] Chat list không reset trống khi rời/vào tab.
- [ ] Read-receipt + unread badge clear khi mở chat.

## Risk Assessment

- **Effect chạy lại khi friendUid/myUid đổi:** dependency array đúng như cũ; `openConversation` không clear nên an toàn.
- **Socket chưa connect lúc emit:** `emit*` trong socket-service đã guard `if(!socket) return false`; store gọi `connectSocket` trước nên ổn. Nếu socket vừa tạo chưa `connected`, socket.io tự queue emit — chấp nhận.
- **Regression UI:** giữ nguyên render path + ChatBubble props.
