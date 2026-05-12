# Phase 09 — Frontend: Feed/Moments Pagination via `syncToken` + Real-Time Delete

**Owner:** dev-9 · **Effort:** 1.5h · **Status:** pending · **Blocked by:** 03

## Context Links
- Plan: `plan.md`
- Service: `apps/self-hosted/lovekit/src/services/LocketDioServices/ActionMoments.js`
- Store: `apps/self-hosted/lovekit/src/stores/useMomentsStoreV2.js`
- Screen: `apps/self-hosted/lovekit/src/screens/FeedScreen.jsx` (intersection-only edits, gated on Phase 03 merge)
- Backend pagination: `apps/self-hosted/api/src/controllers/locket.controller.js:82-105` returns `{ data, syncToken }`

## Overview
**Priority:** P1 · **Status:** pending
Backend `getMoments` returns `{ data, syncToken: nextPageToken }` but `useMomentsStoreV2.loadMoreOlder`
paginates via `lastCreateTime` (timestamp). This works only if BE sorts by createTime; safer
to use the BE-provided `syncToken`. Also: `removeMoment` needs to fire on socket delete events
(if any) — verify socket handler wiring.

## Key Insights
- BE `getMoments` (`controllers/locket.controller.js:82`) accepts `{ friendId, limit, syncToken }` body
- FE `GetAllMoments` (`ActionMoments.js:3`) sends `{ timestamp, friendId, limit, syncToken }` — backend ignores `timestamp`
- Store `loadMoreOlder` derives next page from `lastCreateTime` — works but redundant; should use returned `syncToken` (controller wraps response with `{ data, syncToken }` but FE reads only `data` via `res.data?.data`, dropping syncToken)
- Need to plumb `syncToken` through service → store → next call

## Requirements
**Functional**
- Feed initial load shows N moments
- Scroll to bottom triggers load-more, fetches next page, appends without duplicates
- Pagination terminates correctly (`hasMore` flips false when `syncToken` null)
- New moment from upload appears at top within 2s
- Deleted moment disappears from feed within 2s

**Non-functional**
- No duplicate API calls during a single scroll
- IndexedDB cache stays consistent

## Architecture
```
Before:
useMomentsStoreV2.loadMoreOlder ── GetAllMoments({ timestamp: lastCreateTime })
                                      └─► returns res.data.data, drops syncToken

After:
useMomentsStoreV2.loadMoreOlder ── GetAllMoments({ syncToken: bucket.syncToken })
                                      └─► returns { items, syncToken }
                                            stored in bucket; null → hasMore=false
```

## Related Code Files
**Modify**
- `apps/self-hosted/lovekit/src/services/LocketDioServices/ActionMoments.js` — return `{ items, syncToken }`
- `apps/self-hosted/lovekit/src/stores/useMomentsStoreV2.js` — add `syncToken` to bucket; rewire `fetchMoments`/`reloadMoments`/`loadMoreOlder` to use it; flip `hasMore` from token presence

**Modify (intersection-only, after Phase 03 lands)**
- `apps/self-hosted/lovekit/src/screens/FeedScreen.jsx` — no-op (already calls `loadMoreOlder(null)`); confirm

## Implementation Steps
1. **ActionMoments.js**: change to return both:
   ```js
   export const GetAllMoments = async ({ friendId = null, limit = 60, syncToken = null }) => {
     try {
       const res = await api.post("/locket/getMomentV2", { friendId, limit, syncToken });
       return {
         items: res.data?.data ?? [],
         syncToken: res.data?.syncToken ?? null,
       };
     } catch (err) {
       console.warn("Failed", err);
       return { items: [], syncToken: null };
     }
   };
   ```
2. **useMomentsStoreV2.defaultBucket** — add `syncToken: null`
3. **fetchMoments** + **reloadMoments**:
   ```js
   const { items: apiData, syncToken } = await GetAllMoments({
     friendId: selectedFriendUid, limit: initialVisible,
   });
   ```
   Persist `syncToken` into bucket; `hasMore = !!syncToken`
4. **loadMoreOlder**:
   ```js
   if (!bucket.syncToken) {
     // hasMore=false
     return;
   }
   const { items: older, syncToken: nextToken } = await GetAllMoments({
     friendId: selectedFriendUid, limit: loadMoreLimit, syncToken: bucket.syncToken,
   });
   ...
   set({ ..., syncToken: nextToken, hasMore: !!nextToken });
   ```
5. **Update all callers** of `GetAllMoments(...)` — should be only `useMomentsStoreV2`. Grep:
   `grep -rn "GetAllMoments(" lovekit/src` — confirm
6. **Delete signal**: socket handlers in `socket/socketHandlers.js` and `socketHandlersV2.js` — verify if there's an `on("moment_deleted", ...)` event. If yes, hook to `removeMoment`. If no, leave for future phase.
7. Smoke:
   - Scroll feed → see "Đang tải" → see new items
   - Reach end → "Bạn đã xem hết"
   - Post moment → appears within 2s
   - Delete via OptionMoment → disappears

## Todo List
- [ ] Update `GetAllMoments` return shape
- [ ] Add `syncToken` to bucket
- [ ] Rewire fetch/reload/loadMore
- [ ] Confirm only one caller of `GetAllMoments`
- [ ] Smoke pagination + post + delete

## Success Criteria
- Pagination uses BE-provided `syncToken`
- `hasMore` accurate (driven by token presence)
- No duplicate moments across pages
- Post + delete reflect in feed quickly

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| BE doesn't return `syncToken` | Med | High | If null, fall back to `hasMore = items.length === limit` heuristic |
| Caller signature changes break ProfileScreen / FriendMomentRow | Low | Med | They don't call `GetAllMoments` directly — use store |
| Phase 03 not yet merged | High at start | Med | `addBlockedBy: ["3"]` |

## Security Considerations
- None — pure client-side data flow

## Next Steps
- Future: wire socket-driven realtime moment events through this store
