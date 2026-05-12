---
phase: 4
title: "Feed + memories integration"
status: pending
priority: P1
effort: "5h"
dependencies: [3]
---

# Phase 4: Feed + memories integration

## Overview
Replace mock `feedMoments` and `memoriesCalendar` with real API-driven data. FeedScreen pulls a paginated moment feed (filtered by audience or date), MemoriesScreen pulls calendar metadata covering all months that have data.

## Requirements
**Functional:**
- FeedScreen renders moments returned by `useMoments({ audience, date })`:
  - Audience `all` → entire visible feed
  - Audience `owner` → current user only
  - Audience `<friendId>` → that friend only
  - `date=YYYY-MM-DD` → only moments captured on that day
- MemoriesScreen builds month list dynamically from real data (oldest above, current month at bottom)
- Day cell shows count badge for >1 photo, single thumb for 1, plain dot for 0
- Pull-to-refresh on feed top → re-sync
- Infinite scroll: when reaching end of cached moments, fetch next page

**Non-functional:**
- Initial paint within 200ms of cache hit
- Background sync completes within 2s on average network

## Architecture
```
moment-store (Phase 3 scaffold)
    ↓ fetch
PostMoments.getFeed({ audience, beforeTimestamp, limit }) → { moments: [...], nextCursor }
    ↓ normalize
{ id, author, image, video?, caption, date, timeAgo, reactions, reactionList? }
    ↓ store
in-memory + Dexie

memory-store (new)
    ↓ fetch
PostMoments.getMomentMetadata({ from, to }) → [{ date, count, thumbUrl }]
    ↓ store
keyed by YYYY-MM-DD
```

## Related Code Files
**Create:**
- `apps/locket-love/src/stores/memory-store.js` — calendar data store
- `apps/locket-love/src/services/MomentServices.js` — high-level wrapper around PostMoments (getFeed, getCalendar, getMomentById)
- `apps/locket-love/src/utils/format-time.js` — `timeAgo()` (e.g. "2g", "1ngày", "30p") matching native Locket

**Modify:**
- `apps/locket-love/src/screens/feed-screen.jsx`
  - Drop `import { feedMoments }` from mock-data
  - `useMoments({ audience, date: dateFilter })` → moments array
  - Loading skeleton when `loading && moments.length === 0`
  - Empty state already handled
  - `MomentCard` consumes the same shape (just sourced from API)
  - On scroll near bottom of last card → trigger `loadMore()`
- `apps/locket-love/src/screens/memories-screen.jsx`
  - Drop `import { memoriesCalendar, memoriesMonths }` from mock-data
  - `useMemoryCalendar()` → `{ months, byDate }`
  - `MonthSection` reads `byDate[key]` instead of `memoriesCalendar[key]`
  - Stats bar uses `useMemoryStats()` (locketCount, streak)
- `apps/locket-love/src/data/mock-data.js`
  - Delete `feedMoments`, `memoriesCalendar`, `memoriesMonths`, `memoriesStats` (keep caption stickers, friends placeholder if still needed by other places)

## Implementation Steps
1. Wire `moment-store.fetch({ audience, beforeCursor })` → `PostMoments.getFeed()` → normalize → set state
2. Add cursor-based pagination: store `cursorByAudience` map; `loadMore()` calls fetch with `beforeCursor` from current end
3. Build `useMoments({ audience, date })`:
   - On mount: read from Dexie cache → render immediately
   - Trigger `fetch()` with current params
   - Re-fetch when audience/date changes
4. Build `memory-store`:
   - `init()` → call `getMomentMetadata({ from: 12 months ago, to: today })`
   - State: `byDate: { "2026-05-08": { count: 3, thumb: "..." } }`, `monthsWithData: Date[]`
   - Hook `useMemoryCalendar()` returns sorted months + lookup map
5. Build `format-time.js` `timeAgo(date)`:
   - Now < 1m → `vừa xong`
   - <60m → `{n}p`
   - <24h → `{n}g`
   - <7d → `{n}ngày`
   - else → `dd/mm`
6. Refactor FeedScreen:
   - Replace mock import → `useMoments`
   - Add IntersectionObserver on the last card → `loadMore()`
   - Skeleton card (gray box) shown when loading and no cached data
7. Refactor MemoriesScreen:
   - Replace mock imports → `useMemoryCalendar` + `useMemoryStats`
   - `MonthSection` reads `byDate` for the photo URL + count
8. Delete the mock arrays from `mock-data.js`. Keep `captionStickersGeneral`/`Decorative` (still mocked until Phase 7) and `searchableUsers` (until friend-search API in Phase 7)
9. Smoke-test: feed shows real photos; scroll to bottom → loads next page; navigate to memories → shows real calendar with badges; click a date with data → feed filters correctly

## Success Criteria
- [ ] FeedScreen renders moments from API for all audience modes (all / owner / specific friend)
- [ ] `?date=YYYY-MM-DD` filter shows only that day's moments
- [ ] Scrolling to last card triggers next-page fetch (paginated cursor)
- [ ] MemoriesScreen calendar shows months that actually have data
- [ ] Day cells with multiple photos show the count badge
- [ ] Empty audience or date shows "Chưa có khoảnh khắc nào"
- [ ] No mock `feedMoments` or `memoriesCalendar` references remain in screen files

## Risk Assessment
- **Risk:** Backend feed endpoint shape may differ from `apps/main`'s expectations (e.g. nested `author.uid` vs flat `authorId`).
  **Mitigation:** keep a normalize() function inside `moment-store` that maps backend shape → UI shape; update only that function on schema change.
- **Risk:** Calendar API doesn't exist; may need to derive from feed pagination.
  **Mitigation:** if no `getMomentMetadata`, fetch one large batch (last 90 days) and group by date client-side. Document in store.
- **Risk:** Pagination triggers loop if `nextCursor === lastCursor` (server bug).
  **Mitigation:** dedupe by cursor in store; stop when same cursor returned twice in a row.
- **Risk:** Date filter passes a string the backend can't parse.
  **Mitigation:** normalize to ISO 8601 (`2026-05-08T00:00:00Z`) at service boundary.
