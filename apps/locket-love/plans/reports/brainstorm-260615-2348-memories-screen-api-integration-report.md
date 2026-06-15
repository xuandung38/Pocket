---
title: "Brainstorm — Memories screen API integration (locket-love)"
date: 2026-06-15
type: brainstorm
status: approved
slug: memories-screen-api-integration
---

# Brainstorm — Memories screen API integration

## Problem
`memories-screen.jsx` (tab "Kỷ niệm") render 100% mock (`memoriesCalendar`, `memoriesMonths`, `memoriesStats`, `currentUser`, ảnh galaxy). Cần ghép data thật. KHÔNG cần backend mới — pipeline + endpoint đã có.

## Scout (đã verify)
- **UI lịch đã dựng**: month grid (ảnh đầu/ngày + badge count), galaxy header (ảnh nổi + sao), stats pill (lockets, streak), avatar. Click ngày → `navigate('/feed?date=YYYY-MM-DD')`.
- **Pipeline có sẵn**: `getAllMoments({friendId,limit,syncToken})` → `/locket/getMomentV2` → backend `getLocketMoments` đọc `/history/{userId}/entries`, filter `userUid`. `friendId = meUid` ⇒ **own moments**. Moment shape: `{id, thumbnailUrl, videoUrl, date, createTime, caption, overlays}`.
- **Feed đã hỗ trợ `?date=`** (`filterMoments`) ⇒ điều hướng ngày→feed đã chạy.
- **Streak**: lovekit `GetLastestMoment()` → `/locket/proxy/getLatestMomentV2` `{fetch_streak:true}` → `data.streak{count,last_updated_yyyymmdd}`. locket-love api **đã whitelist** `getLatestMomentV2` (`locket.controller.js:24`). locket-love chưa có streak service.
- **Auth**: `meUid = getToken().localId`; profile (avatar/name) trong `use-auth-store`.
- **Khác lovekit**: lovekit chỉ có streak strip 7-ngày (`StreakCalendar.jsx`); locket-love memories = lịch tháng own moments (phong phú hơn).

## Requirements chốt (qua hỏi đáp)
1. **Output**: memories-screen render lịch + stats + galaxy từ data thật, không còn mock.
2. **Data scope**: **own moments, cửa sổ gần** (`friendId=meUid`, ~200 moment / vài trang; tháng cũ lazy khi cuộn lên).
3. **Stats**: ghép **streak thật** (getLatestMomentV2) + lockets count (tổng own moments đã load).
4. **Galaxy header**: giữ, dùng 3 thumbnail own moment gần nhất.
5. **Cache**: **localStorage + stale-while-revalidate** — hiện cache ngay (tốc độ), load ngầm, update ngầm nếu có data mới.
6. **OUT of scope**: backend changes; day-viewer riêng cho ngày cũ ngoài cửa sổ feed; tổng lockets tuyệt đối (dùng count cửa sổ).

## Approaches đã cân nhắc
| | Cách | Verdict |
|---|---|---|
| **A** ✅ | `useMemoriesStore` (zustand) riêng, mỏng, reuse `getAllMoments` + streak service, cache localStorage SWR | **Chọn** — đúng convention zustand, own-only sạch, cache nhanh |
| B | Reuse `useMomentsStoreV2` filter own | Loại — feed own+friends/recent, over-fetch, lẫn concern |
| C | Hook `useMemories()` không store | Loại — không cache, lệch convention |

## Giải pháp chốt — A + localStorage SWR

### `src/stores/use-memories-store.js` (mới, ~100 dòng)
- **State**: `moments` (map by id, own only), `streak` ({count,last_updated_yyyymmdd}|null), `loading`, `isRevalidating`, `hasMore`, `syncToken`.
- `CACHE_KEY="memories"` (localStorage) — chỉ lưu **metadata** (id/thumbnail/date/streak…), KHÔNG blob (~100KB cho 200 moment).
- **`loadMemories()`** (SWR, mirror lovekit `syncStreak`):
  1. Hydrate localStorage **đồng bộ** → set moments+streak ngay (render tức thì).
  2. Nếu đang revalidate → bail.
  3. Nền: `Promise.all([getAllMoments({friendId:meUid, limit:200}), getLatestMoment()])`.
  4. Merge; nếu khác (id mới / streak đổi) → set + persist. Không đổi → no-op.
- **`loadMoreOlder()`**: paginate `syncToken` cho tháng cũ (cuộn lên đỉnh) → merge + persist.
- **`clear()`**: logout reset + xóa cache.
- **Selector** `selectMemoriesByDate`: group own moments → `{ "YYYY-MM-DD": [moment...] }` (dùng `useMemo`, tránh loop như `selectMomentsArray`).

### `src/services/moment-services.js` (+1 hàm)
- `getLatestMoment()` → `api.post("/locket/proxy/getLatestMomentV2", {fetch_streak:true, ...})` (mirror body lovekit) → trả `{ streak, ... }`.

### `src/screens/memories-screen.jsx` (rewire)
- Bỏ import mock → đọc store + `selectMemoriesByDate`.
- `memoriesCalendar` → group own moments (`thumbnailUrl`, video dùng poster).
- `memoriesMonths` → suy từ range ngày đã load.
- Stats: `lockets`=count, `streak`=`store.streak.count`.
- Galaxy floating = 3 thumbnail gần nhất.
- Avatar = auth user; "Hôm nay" = ngày thật (bỏ `TODAY_KEY` cứng).
- Cuộn đỉnh → `loadMoreOlder()`.
- Empty state: chưa có moment → lịch rỗng + prompt.

### `src/stores/index.js`: export `useMemoriesStore`.

**KHÔNG đụng backend.** Touch: `use-memories-store.js` (new), `moment-services.js`, `memories-screen.jsx`, `stores/index.js`.

## Risks / lưu ý
- **Day-click ngày cũ**: `/feed?date=` lọc trên store feed (own+friends/recent) → ngày ngoài cửa sổ có thể trống. Hợp lựa chọn "cửa sổ gần"; ngày rất cũ = edge (day-viewer riêng = follow-up).
- **localStorage quota**: chỉ lưu metadata, không blob → an toàn.
- **Lockets count**: = số own moments đã load (cửa sổ), không tuyệt đối — chấp nhận.
- **SWR merge**: cần diff ổn định (so id set + streak) để tránh re-render thừa.
- **Own filter**: xác nhận `friendId=meUid` trả đúng own-authored (backend `userUid` filter) — verify ở phase đầu bằng `npm run dev`.

## Success criteria
- Memories render own moments thật theo lịch tháng; vào lại thấy cache ngay (<16ms), data mới cập nhật ngầm.
- Streak + lockets count thật.
- Galaxy 3 ảnh thật; "hôm nay" đúng ngày.
- Cuộn lên load tháng cũ; empty state không crash.
- Tests (nếu TDD): group-by-date, SWR merge/diff, cache hydrate/persist.

## Unresolved questions
- Có cần highlight/streak chính xác theo `last_updated_yyyymmdd` trên lịch (tô ngày streak) hay chỉ hiện count? (mặc định: chỉ count, như mock.)
