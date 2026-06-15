# Cook Report — Chat cache store + incremental append

**Plan:** `plans/260616-0030-chat-cache-store-incremental/` · **Branch:** `feat/fix-selfhost` · **Date:** 2026-06-16
**Status:** DONE · 4/4 phases · 69/69 tests pass · build pass

## Vấn đề
Mỗi lần mở chat → `useState([])` rỗng → màn trắng → fetch lại full history. State chết theo vòng đời component → giật/lag.

## Đã làm
| Phase | Thay đổi |
|-------|----------|
| 1 | **Tạo `src/stores/use-chat-store.js`** — zustand in-memory, single source of truth. Sở hữu socket listener (gắn 1 lần, reconnect-safe), dedupe-by-id, optimistic reconcile, cap 200/conv, reset on `lk:auth:reset`. |
| 2 | **Refactor `chat-detail-screen.jsx` + `chat-list-screen.jsx`** thành consumer của store. `openConversation` KHÔNG clear cache → vào lại chat hiện tin ngay, không nhấp nháy. |
| 3 | **`chat-namespace-handler.js`** — per-socket `convIdCache` (bỏ `getAllMessages` thừa mỗi lần mở) + `activePeer` reuse Locket WS; cleanup on disconnect. |
| 4 | **`use-chat-store.test.js`** (15) + **`use-pull-to-refresh.test.js`** (4). |

## Bổ sung theo yêu cầu giữa chừng
- **Pull-to-refresh**: hook `src/hooks/use-pull-to-refresh.js` + indicator spinner trên đầu chat-detail. Vuốt xuống ở đỉnh → re-emit `openConversation` → store merge (dedupe) → chỉ tin mới append.

## Code review (gate bắt buộc) — DONE_WITH_CONCERNS → đã xử lý
- **C1 (critical, đã fix):** echo tin của mình mang `sender=me` không có receiver → trước phải đoán qua `activeConv` → điều hướng nhanh A→B làm tin rớt sai conversation. **Fix gốc rễ:** backend stamp `conversation_uid = peerUid` vào mọi message emit; client `peerOf` ưu tiên tag này. Có test chứng minh.
- **C2/H1 (hardened):** tmp id chống va chạm (`tmp-{ts}-{seq}`); với `conversation_uid` bucket đúng, echo reconcile tin cậy trên đường bình thường. Edge còn lại = echo mất hẳn do mạng (fire-and-forget cố hữu, pre-existing).
- **H2:** thực ra đã xử lý — `readyState >= 2` reopen kể cả same-peer.
- **M1 (deferred, có lý do):** tăng unread live cho conversation không active dễ bị **history refetch thổi phồng** (BE gửi history + live chung 1 event, không phân biệt được) → giữ unread theo snapshot `get_list_message`. Cần BE phân tách mới làm an toàn.

## Files
- Create: `src/stores/use-chat-store.js`, `src/hooks/use-pull-to-refresh.js`, 2 test files
- Modify: `src/stores/index.js`, `src/screens/chat-detail-screen.jsx`, `src/screens/chat-list-screen.jsx`, `apps/self-hosted/api/src/socket/chat-namespace-handler.js`

## Unresolved / theo dõi sau
1. Live unread badge cho conversation không active (M1) — chờ BE tách history vs live, hoặc dùng `conversation_uid` + cờ "is_history" để client phân biệt.
2. Reconcile chính xác bằng `client_token` round-trip (thay fuzzy sender+body+60s) — cần xác nhận upstream Locket có echo lại `client_token` không.
3. In-memory → mất khi F5; nâng Dexie nếu cần (đã cài sẵn).
