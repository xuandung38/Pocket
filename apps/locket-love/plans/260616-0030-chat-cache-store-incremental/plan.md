---
title: Chat cache store + incremental append (client + backend)
description: >-
  Nhấc state chat ra zustand store in-memory để hết jank reload-mỗi-lần-mở-chat;
  chỉ append tin mới qua dedupe. Kèm tối ưu backend bỏ round-trip thừa.
status: completed
priority: P2
branch: feat/fix-selfhost
tags:
  - chat
  - performance
  - store
  - socket
blockedBy: []
blocks: []
created: '2026-06-15T17:31:24.539Z'
createdBy: 'ck:plan'
source: skill
---

# Chat cache store + incremental append (client + backend)

## Overview

**Vấn đề:** Mỗi lần bấm vào một cuộc trò chuyện, `chat-detail-screen.jsx` khởi tạo `messages = useState([])` rỗng → màn trắng → `emitGetMessagesWith()` fetch lại **toàn bộ** lịch sử qua socket → re-render. Chat list (`convMeta`) cũng là state local, reset mỗi lần vào tab. State bị vứt đi theo vòng đời component → giật/lag.

**Giải pháp:** Nhấc state chat ra **zustand store in-memory** (`use-chat-store.js`) làm single source of truth, sống độc lập với vòng đời component. Listener socket do store sở hữu (gắn 1 lần) → tin nhắn dồn vào store; mở lại chat hiện cache tức thì, chỉ **append tin mới thật sự** qua dedupe-by-id. Backend bỏ bớt round-trip thừa (`getAllMessages` gọi mỗi lần mở để resolve `convId`) + tái dùng Locket WS khi mở lại cùng conversation.

**Quyết định đã chốt (brainstorm):** client store · in-memory (mất khi F5, chấp nhận) · ưu tiên client, backend làm chung đợt này · phạm vi gồm chat detail + chat list + optimistic/reaction/read-receipt.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Client Chat Store](./phase-01-client-chat-store.md) | Completed |
| 2 | [Wire Screens to Store](./phase-02-wire-screens-to-store.md) | Completed |
| 3 | [Backend Socket Optimization](./phase-03-backend-socket-optimization.md) | Completed |
| 4 | [Tests](./phase-04-tests.md) | Completed |

## Dependencies

- Phase 2 phụ thuộc Phase 1 (store phải tồn tại trước khi screens consume).
- Phase 3 độc lập client (backend), nhưng test end-to-end sau Phase 2.
- Phase 4 phụ thuộc Phase 1-3.
- Không trùng/đụng plan đang mở khác (memories, caption, photo-frame) — khác vùng file.

## Key Files

- Create: `src/stores/use-chat-store.js`, `src/stores/__tests__/use-chat-store.test.js`
- Modify: `src/stores/index.js`, `src/screens/chat-detail-screen.jsx`, `src/screens/chat-list-screen.jsx`, `apps/self-hosted/api/src/socket/chat-namespace-handler.js`
- Read-only ref: `src/services/socket-service.js`, `src/services/chat-services.js`
