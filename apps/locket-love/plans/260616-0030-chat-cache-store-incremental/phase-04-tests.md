---
phase: 4
title: Tests
status: completed
priority: P2
effort: 2h
dependencies:
  - 1
  - 2
  - 3
---

# Phase 4: Tests

## Overview

Unit test cho `use-chat-store` (logic dedupe/merge/optimistic/reset) + smoke test refactor screen không vỡ. Trọng tâm là phần logic thuần của store — nơi dễ regress nhất.

## Requirements

- **Functional:** test merge/dedupe, optimistic reconcile, reconnect-safe listener, reset. Vitest + jsdom (đã cấu hình, xem `src/stores/__tests__/use-memories-store.test.js`).
- **Non-functional:** mock `socket-service` + `chat-services` qua `vi.hoisted`/`vi.mock` như pattern memories store; không gọi mạng thật.

## Architecture

**Mock surface:**
```
vi.mock("@/services/socket-service", () => ({ connectSocket, emitGetMessagesWith, onMessage, onListMessage, ... }))
vi.mock("@/services/chat-services", () => ({ sendMessage, markReadMessage }))
vi.mock("@/utils", () => ({ getToken: () => ({ idToken:"t", localId:"me" }) }))
```
Reset store qua `useChatStore.setState({...defaults})` trong `beforeEach`.

## Related Code Files

- Create: `src/stores/__tests__/use-chat-store.test.js`
- Read-only ref: `src/stores/__tests__/use-memories-store.test.js` (pattern), `src/stores/use-chat-store.js`

## Implementation Steps

1. Setup mock + `beforeEach` reset (theo memories test).
2. Test `ingestMessages`: (a) thêm mới sort desc; (b) cùng id 2 lần → 1 bản; (c) reaction edit update tại chỗ; (d) cap 200.
3. Test optimistic: `addOptimistic` thêm stub `_pending`; echo thật cùng body+sender → thay thế stub (length không tăng); `reconcileOptimistic(ok:false)` → bỏ stub.
4. Test `ingestConvList`: merge convMeta, giữ giá trị cũ khi field thiếu.
5. Test `initSocket`: gọi 2 lần chỉ gắn listener 1 lần (assert `onMessage` mock call count); socket mới (token đổi) → gắn lại.
6. Test `reset`: clear sạch + gọi unsub.
7. Chạy `npm test`; nếu screen có test sẵn, đảm bảo pass; thêm 1 smoke render nếu cần.

## Success Criteria

- [ ] `npm test` xanh toàn bộ.
- [ ] Cover: merge/dedupe, sort, cap, optimistic reconcile, convMeta merge, initSocket idempotent + reconnect, reset.
- [ ] Không test nào dùng mạng thật / fake-pass.

## Risk Assessment

- **Zustand state rò giữa test:** reset đầy đủ trong `beforeEach`.
- **Timing optimistic window:** dùng thời gian cố định/`vi.useFakeTimers` nếu cần để match window 60s ổn định.
