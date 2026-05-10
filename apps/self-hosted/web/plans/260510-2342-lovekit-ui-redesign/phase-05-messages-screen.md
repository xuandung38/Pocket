---
phase: 5
title: "MessagesScreen (Conversation List + Chat Detail)"
status: completed
priority: P2
effort: "5h"
dependencies: [2]
---

# Phase 05: MessagesScreen (Conversation List + Chat Detail)

## Overview

Build `MessagesScreen` with two sub-views: a scrollable conversation list and a full-height chat detail panel. Uses copied `useMessagesStore` and `useChatSocket` hook. Warm card design throughout.

## Requirements

**Functional**
- List all conversations from `useMessagesStore`
- Tap conversation → slide-in chat detail panel (CSS transition, no React Router)
- Chat detail: message bubbles, text input, send via socket
- Real-time message receive via `useChatSocket`
- Unread badge on conversation item

**Non-functional**
- Conversation list: `ConversationItem` warm card, avatar + name + last message preview + timestamp
- Chat bubbles: own messages right-aligned amber, others left-aligned base-200
- Input bar respects iOS safe-area

## Architecture

```
screens/MessagesScreen.jsx
components/
  ConversationItem.jsx       ← avatar, name, preview, unread badge
  ChatDetail.jsx             ← full-height panel, message list + input bar
  MessageBubble.jsx          ← own vs other styling
  ChatInputBar.jsx           ← text input + send button, safe-area aware
```

### Navigation Pattern

```
MessagesScreen
  state: { activeChatId: null | string }
  → activeChatId == null: render ConversationList
  → activeChatId != null: render ChatDetail (slide in from right via CSS)
  → ChatDetail back button: setActiveChatId(null)
```

No React Router — local `useState`. CSS `transform translate-x` transition for slide animation.

### Data Flow

```
MessagesScreen mounts
  → useMessagesStore.fetchConversations()
  → useChatSocket connects (copied hook)
  → tap ConversationItem → setActiveChatId(id)
  → ChatDetail mounts → useMessagesStore.fetchMessages(chatId)
  → send message → socket.emit("sendMessage", payload)
  → receive message → useMessagesStore updates → re-render bubbles
```

## Related Code Files

**Create**
- `apps/self-hosted/lovekit/src/screens/MessagesScreen.jsx`
- `apps/self-hosted/lovekit/src/components/ConversationItem.jsx`
- `apps/self-hosted/lovekit/src/components/ChatDetail.jsx`
- `apps/self-hosted/lovekit/src/components/MessageBubble.jsx`
- `apps/self-hosted/lovekit/src/components/ChatInputBar.jsx`

**Read for reference (do not modify)**
- `apps/self-hosted/web/src/pages/LocketCameraBeta/BottomHomeScreen/MessageView/` — existing chat UI pattern
- `apps/self-hosted/lovekit/src/stores/useMessagesStore.js` (copied)
- `apps/self-hosted/lovekit/src/hooks/useChatSocket.js` (copied)

## Implementation Steps

1. **`ConversationItem.jsx`** (≤80 lines):
   - `FriendAvatar` + friend name + last message text (truncated 1 line) + `formatTimeAgo(date)`
   - Unread badge: amber circle with count, top-right of avatar
   - `onClick` prop

2. **`MessageBubble.jsx`** (≤50 lines):
   - `isMine` prop: own → `bg-primary text-primary-content rounded-2xl rounded-br-sm ml-auto`
   - Others → `bg-base-200 text-base-content rounded-2xl rounded-bl-sm mr-auto`
   - Max-width 75%, `px-4 py-2`

3. **`ChatInputBar.jsx`** (≤60 lines):
   - `fixed bottom-0 inset-x-0 pb-[env(safe-area-inset-bottom)]`
   - Input + orange send button; `onSubmit` prop; clear on send

4. **`ChatDetail.jsx`** (≤120 lines):
   - Full-screen `fixed inset-0 z-40 bg-base-100`
   - Slide-in: `translate-x-full` → `translate-x-0` transition 300ms
   - Top bar: back arrow + friend name + avatar
   - Message list: `overflow-y-auto flex-col-reverse` (newest at bottom), renders `MessageBubble`
   - Bottom: `ChatInputBar`
   - `useEffect` → scroll to bottom on new messages

5. **`MessagesScreen.jsx`** (≤80 lines):
   - `useEffect` → `fetchConversations(user)` on mount
   - List: scrollable, maps conversations → `ConversationItem`
   - `useState(activeChatId)` → render `ChatDetail` when set
   - `LoadingSkeleton variant="card"` while loading
   - `EmptyState` when no conversations

6. **Smoke test**: open Messages tab → see conversation list → tap → chat opens, messages load → type + send → bubble appears.

## Todo

- [x] ConversationItem (avatar, preview, unread)
- [x] MessageBubble (own/other styles)
- [x] ChatInputBar (safe-area, send)
- [x] ChatDetail (slide-in, message list, scroll)
- [x] MessagesScreen (list, tap to detail, empty/loading)
- [x] Smoke test real conversation flow

## Success Criteria

- [ ] Conversation list shows real data from backend
- [ ] Tap opens chat detail with real message history
- [ ] Send message via socket, bubble appears immediately
- [ ] Back button returns to conversation list smoothly

## Risk Assessment

- **`useMessagesStore` signature**: verify `fetchConversations(user)` and `fetchMessages(chatId, user)` exact params from copied file.
- **Socket reconnect**: `useChatSocket` depends on `idToken` from localStorage — ensure it reads same key as `useAuthStore`.
- **Scroll-to-bottom**: `flex-col-reverse` requires messages in descending order; verify `useMessagesStore` sort order.
- **iOS keyboard**: `ChatInputBar` fixed position shifts up with keyboard on iOS — add `visualViewport` resize handler if needed.

## Chrome MCP Testing Checklist

Activate `ck:chrome-devtools` after logging in with real credentials:

```
navigate http://localhost:5173
viewport 390x844
navigate to Messages tab (Chats)
screenshot → verify: conversation list visible, warm cards, avatars
```

**Conversation list:**
- [ ] Messages tab shows real conversation items (not empty state)
- [ ] Each item: avatar + friend name + last message preview + timestamp
- [ ] Unread badge visible if unread count > 0
- [ ] `network_errors` → no failed fetch calls

**Chat detail:**
- [ ] Tap conversation → ChatDetail slides in from right (smooth transition)
- [ ] Message bubbles: own messages right-side amber, others left-side base-200
- [ ] Older messages visible, scroll up works
- [ ] Screenshot at ChatDetail open state

**Send message:**
- [ ] Type text in input → tap send → own bubble appears immediately
- [ ] `console_errors` → zero errors after send
- [ ] Back button → returns to conversation list

- [ ] Screenshot at 375×667: input bar + keyboard not cut off

## Completion Protocol

**When this phase is done:**
1. Update frontmatter `status: pending` → `status: completed`
2. Check off all items in `## Todo` above
3. Open `plan.md` → update Phase 05 row Status column: `pending` → `completed`
4. Commit with message: `feat(lovekit): phase 05 — messages screen + chat detail`
