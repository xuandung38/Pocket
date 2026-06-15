---
phase: 1
title: Data layer — service + store (TDD)
status: completed
priority: P1
effort: 0.5d
dependencies: []
---

# Phase 1: Data layer — service + store (TDD)

## Overview
Thêm streak service + `useMemoriesStore` (zustand) với stale-while-revalidate qua localStorage. Logic thuần (group-by-date, SWR merge/diff, cache hydrate/persist) viết test TRƯỚC.

## Requirements
- Functional: store cung cấp own moments (cửa sổ gần) + streak cho memories-screen; cache localStorage hydrate đồng bộ; revalidate ngầm chỉ update khi data đổi; paginate tháng cũ.
- Non-functional: file <200 dòng; chỉ lưu metadata vào localStorage (không blob); selector group-by-date dùng được với `useMemo` (không tạo array mới mỗi render gây loop — xem cảnh báo `selectMomentsArray`).

## Architecture
- **Service** `src/services/moment-services.js` (+1 hàm):
  - `getLatestMoment()` → `api.post("/locket/proxy/getLatestMomentV2", { fetch_streak: true, ... })` (mirror body lovekit `GetLastestMoment` tại `apps/self-hosted/lovekit/src/services/LocketServices/moment.services.js:41-55`). Trả `res.data?.data ?? res.data` (chứa `streak{count,last_updated_yyyymmdd}`). Best-effort: lỗi → trả `null`, không throw.
- **Store** `src/stores/use-memories-store.js` (mới):
  - State: `moments` (map by id, own only), `streak` (`{count,last_updated_yyyymmdd}|null`), `loading`, `isRevalidating`, `hasMore`, `syncToken`.
  - `CACHE_KEY = "memories"` (localStorage). Lưu `{ moments: [...metadata], streak, syncToken, hasMore, savedAt }` — moment metadata gọn (id/thumbnailUrl/videoUrl/date/createTime/caption/overlays). KHÔNG lưu blob.
  - **`loadMemories()`** (SWR):
    1. Hydrate localStorage **đồng bộ** → `set({moments, streak, ...})` ngay (render tức thì). Lỗi parse → bỏ qua.
    2. Nếu `isRevalidating` → bail.
    3. `set({isRevalidating:true})`; nền: `const meUid = getToken()?.localId`; `Promise.all([ getAllMoments({friendId: meUid, limit: 200}), getLatestMoment() ])`.
    4. Merge own moments (index by id) + streak. **Diff**: nếu id-set hoặc streak đổi → `set(...)` + `persist()`. Không đổi → no-op (tránh re-render thừa).
    5. `finally set({isRevalidating:false, loading:false})`.
  - **`loadMoreOlder()`**: guard (đang load / `!hasMore` / `!syncToken` / chưa có moment) → `getAllMoments({friendId:meUid, limit:50, syncToken})` → merge (giữ entry cũ) + cập nhật `syncToken/hasMore` + `persist()`.
  - **`clear()`**: reset state + `localStorage.removeItem(CACHE_KEY)` (logout).
  - **Helper** `indexById(list)` (reuse pattern `useMomentsStoreV2`).
- **Selector** `selectMemoriesByDate(state)`: own moments → `{ "YYYY-MM-DD": [moment...] }` (sort moment trong ngày theo createTime desc). Dùng với `useMemo` ở screen. Bucket ngày từ `getMomentTimestampMs`-style (epoch `createTime` → `date` ISO → `m.date`).

## Related Code Files
- Create:
  - `src/stores/use-memories-store.js`
  - Tests: `src/stores/__tests__/use-memories-store.test.js`, `src/services/__tests__/get-latest-moment.test.js`
- Modify:
  - `src/services/moment-services.js` (+`getLatestMoment`)
  - `src/stores/index.js` (export `useMemoriesStore`, `selectMemoriesByDate`)
- Read for context:
  - `src/stores/use-moments-store-v2.js` (pattern map/indexById/loadMoreOlder/selector)
  - `apps/self-hosted/lovekit/src/stores/useStreakStore.js` (SWR `syncStreak` reference), `.../moment.services.js:41-55` (body getLatestMomentV2)
  - `src/services/moment-services.js` (proxy pattern), `src/utils/storage/storage.js` (`getToken`)

## Tests (write FIRST — TDD)
1. `use-memories-store.test.js` (mock `@/services/moment-services` + `@/utils` getToken + localStorage):
   - `selectMemoriesByDate`: moments nhiều ngày → group đúng `{YYYY-MM-DD:[...]}`; cùng ngày → gộp + sort desc.
   - `loadMemories` lần đầu (cache rỗng): gọi `getAllMoments({friendId:meUid,limit:200})` + `getLatestMoment`; set moments + streak; persist localStorage.
   - SWR hydrate: cache có sẵn → `loadMemories` set moments+streak **đồng bộ** trước khi fetch resolve.
   - SWR diff: fetch trả y hệt id-set + streak → KHÔNG đổi reference moments (no-op); fetch trả id mới → cập nhật + persist.
   - `loadMoreOlder`: merge giữ moment cũ + thêm mới; bail khi `!hasMore`/`!syncToken`.
   - `clear`: xóa state + localStorage.
2. `get-latest-moment.test.js`: mock `api.post` (vi.hoisted) → POST `/locket/proxy/getLatestMomentV2` body có `fetch_streak:true`; parse `streak`; lỗi → null.
3. Chạy đỏ trước implement.

## Implementation Steps
1. Viết tests (đỏ).
2. `getLatestMoment()` trong `moment-services.js` (đọc lovekit body trước).
3. `use-memories-store.js`: state + `indexById` + `loadMemories` (SWR) + `loadMoreOlder` + `clear` + `selectMemoriesByDate`.
4. Persist/hydrate localStorage (metadata only); diff ổn định (so id-set + streak).
5. Export ở `stores/index.js`.
6. `npm test` xanh; `npm run build` pass.

## Success Criteria
- [ ] `getLatestMoment` POST đúng endpoint + parse streak; lỗi → null.
- [ ] `useMemoriesStore` hydrate cache đồng bộ; revalidate ngầm; diff no-op khi không đổi.
- [ ] `selectMemoriesByDate` group đúng; `loadMoreOlder` merge đúng; `clear` xóa cache.
- [ ] Tests Phase 1 xanh; build pass.

## Risk Assessment
- **`friendId=meUid` có trả đúng own-authored?** → verify ở Phase 2 `npm run dev`; nếu sai shape, điều chỉnh filter (backend `userUid`).
- **localStorage quota**: chỉ metadata → an toàn; vẫn try/catch quota.
- **SWR diff thiếu ổn định** → re-render loop. Mitigation: so sánh id-set (sorted join) + streak fields, chỉ `set` khi khác.
- **getLatestMomentV2 body khác kỳ vọng** → đọc lovekit body chính xác trước khi viết.
