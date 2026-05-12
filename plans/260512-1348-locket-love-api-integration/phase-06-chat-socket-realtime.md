---
phase: 6
title: "Chat + socket realtime"
status: pending
priority: P2
effort: "6h"
dependencies: [3]
---

# Phase 6: Chat + socket realtime

## Overview
Replace mock conversations + chat messages with real ChatServices + socket.io realtime: list of conversations, message history, send/receive in realtime, typing indicator, read receipts (when enabled).

## Requirements
**Functional:**
- ChatListScreen shows real conversations sorted by last activity, unread badge per conv
- ChatDetailScreen loads message history (paginated upward), shows real messages with sender avatar, timestamp grouping
- Send a message → posts via API → echoes immediately via socket
- Incoming messages arrive in <1s via socket without polling
- Typing indicator: emit on input change (debounced); show when other side is typing
- Read receipts: emit `read` event when conversation is opened (only if `notifs.sendReadReceipts === true` from profile settings)

**Non-functional:**
- Socket auto-reconnects on network blip (already in `socketClient.js`)
- Message order is stable across reloads (server timestamp wins)
- Cached messages render instantly from Dexie before socket connects

## Architecture
```
App.jsx (after auth bootstrap)
    ↓ idToken
createSocket(idToken) → socket-store (singleton)
    ↓ events
- "message:new"        → message-store.append()
- "message:read"       → message-store.markRead()
- "typing:start/stop"  → typing-store.set()
- "conv:update"        → conv-store.upsert()

ChatListScreen → useConversations() (REST + socket merged)
ChatDetailScreen → useMessages(convId) (REST history + live socket appends)
```

## Related Code Files
**Create:**
- `apps/locket-love/src/services/ChatServices.js` (copy + adapt — list convs, load messages, send message)
- `apps/locket-love/src/socket/socket-client.js` (copy from `apps/main`)
- `apps/locket-love/src/socket/socket-store.js` — zustand singleton holding the socket instance + connection status
- `apps/locket-love/src/stores/conversation-store.js` — list of convs, sort, unread counts
- `apps/locket-love/src/stores/message-store.js` — keyed by convId, list of messages
- `apps/locket-love/src/stores/typing-store.js`

**Modify:**
- `apps/locket-love/src/App.jsx`
  - After auth bootstrap → `socketStore.connect(idToken)`
  - On logout → `socketStore.disconnect()`
- `apps/locket-love/src/screens/chat-list-screen.jsx`
  - Replace mock `conversations` import with `useConversations()`
  - Show unread badge, last message preview, timestamp
- `apps/locket-love/src/screens/chat-detail-screen.jsx`
  - Replace mock `chatMessages` with `useMessages(id)`
  - Add infinite scroll upward for older messages
  - Input bar: debounced typing emit, send button calls `ChatServices.sendMessage`
  - On mount: `ChatServices.markRead(convId)` (if read receipts enabled)
- `apps/locket-love/src/components/sheets/profile-sheet.jsx`
  - "Send read receipts" ToggleRow → wire to profile-store `setReadReceipts(boolean)`

## Implementation Steps
1. Copy `ChatServices.js` and `socketClient.js` from `apps/main`; adapt path aliases
2. Build `socket-store.js`:
   - `connect(idToken)` → wraps `createSocket()`, stores instance, attaches event listeners that dispatch into other stores
   - `disconnect()` → tear down listeners + close socket
   - State: `{ socket, status: "disconnected" | "connecting" | "connected" | "error" }`
3. Build `conversation-store.js`:
   - `init()` → `ChatServices.listConversations()` → set + persist
   - On socket `conv:update` → upsert single conv + re-sort
   - `useConversations()` returns sorted array + status
4. Build `message-store.js`:
   - Keyed by convId: `{ [convId]: { messages, hasMore, oldestCursor, loading } }`
   - `loadInitial(convId)` → fetch latest 30
   - `loadMore(convId)` → fetch 30 older using cursor
   - `appendFromSocket(msg)` → push to correct conv if loaded; bump conversation-store
   - `useMessages(convId)` hook
5. Wire `App.jsx`: after `bootstrap()` resolves to authed → `socketStore.connect(idToken)`; on logout → disconnect
6. Refactor ChatListScreen: drop mock import, use `useConversations()`; render unread badge in friend pill
7. Refactor ChatDetailScreen:
   - `const { messages, loadMore, hasMore } = useMessages(id)`
   - On scroll near top → `loadMore()`
   - Input: `onChange` → debounced `socketStore.emitTyping(convId)`
   - Send button → `ChatServices.sendMessage(convId, text)` → optimistic append
   - On mount: if read-receipts enabled, `ChatServices.markRead(convId)`
8. Wire profile sheet "Send read receipts" toggle to profile store
9. Smoke-test: open two browser sessions logged in as different users → send message from A → appears in B in <1s; typing indicator works; reload → history persists

## Success Criteria
- [ ] Conversation list loads from API with correct sort + unread counts
- [ ] Opening a conv loads message history; scroll up loads older
- [ ] Send message → appears immediately on sender + within 1s on receiver
- [ ] Typing indicator shows/hides correctly
- [ ] Socket survives network blip (verify by toggling wifi)
- [ ] Read receipts toggle in profile actually controls behavior

## Risk Assessment
- **Risk:** Socket event names in backend differ from `apps/main` assumptions.
  **Mitigation:** scout actual events emitted by backend before wiring; document in `socket-store.js` comments.
- **Risk:** Reconnect storm if backend rejects bad token — infinite reconnect loop.
  **Mitigation:** on `connect_error` with auth code, call `authStore.bootstrap()` to refresh; if refresh fails, logout.
- **Risk:** Message dedupe — same message arrives via REST send response AND socket event.
  **Mitigation:** dedupe by `id` in `appendFromSocket` if already present.
- **Risk:** Read-receipt emit fires before user actually sees the message (if conv mounts but is scrolled away).
  **Mitigation:** emit only when last message is in viewport (IntersectionObserver), not on mount.
