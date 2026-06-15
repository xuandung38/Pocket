---
phase: 2
title: Screen rewire + lazy load + edge cases
status: completed
priority: P1
effort: 0.5d
dependencies:
  - 1
---

# Phase 2: Screen rewire + lazy load + edge cases

## Overview
Rewire `memories-screen.jsx` từ mock sang `useMemoriesStore`: lịch tháng + galaxy + stats + "hôm nay" thật, lazy-load tháng cũ khi cuộn lên, empty state. Verify thủ công trên `npm run dev`.

## Requirements
- Functional: lịch render own moments thật theo ngày; vào tab thấy cache ngay rồi cập nhật ngầm; stats (lockets count + streak) thật; galaxy 3 ảnh gần nhất; "hôm nay" = ngày thật; cuộn lên đỉnh → load tháng cũ; chưa có moment → empty state.
- Non-functional: giữ UX hiện có (auto-scroll xuống tháng hiện tại, badge count, click ngày → feed). Không thêm dependency.

## Architecture
- **Bỏ mock imports** (`memoriesCalendar/memoriesMonths/memoriesStats/currentUser`) → dùng:
  - `useMemoriesStore` + `selectMemoriesByDate` (qua `useMemo`).
  - `useAuthStore` cho avatar/name (thay `currentUser`).
- **Mount**: `useEffect(() => { loadMemories(); }, [loadMemories])` (SWR: cache đồng bộ + revalidate ngầm).
- **Derived**:
  - `byDate` = `selectMemoriesByDate` → `{YYYY-MM-DD:[moment]}`; thay `memoriesCalendar[key]`. Ảnh ngày = `moment.thumbnailUrl` (video cũng có thumbnailUrl/poster).
  - `memoriesMonths` → suy từ range ngày trong `byDate` (sớm nhất → tháng hiện tại). Helper `buildMonthsFromDates(dateKeys)`.
  - `TODAY_KEY` → ngày thật (`new Date()` → `YYYY-MM-DD`), bỏ hằng cứng.
  - Galaxy floating = 3 thumbnail moment mới nhất (sort theo createTime desc, lấy 3).
  - Stats: `lockets` = tổng own moments (`Object.keys(moments).length`); `streak` = `store.streak?.count ?? 0`.
- **Lazy older**: khi `scrollRef` chạm gần đỉnh (scrollTop < threshold) và `hasMore` → `loadMoreOlder()`. Giữ scroll position sau khi prepend tháng cũ (đo `scrollHeight` trước/sau, bù `scrollTop`) để không nhảy.
- **Empty state**: `moments` rỗng & không `loading` → message "Chưa có kỷ niệm nào" + gợi ý chụp; ẩn galaxy ảnh.
- **Day-click**: giữ `navigate('/feed?date=dateKey')` (đã hoạt động).

## Related Code Files
- Modify:
  - `src/screens/memories-screen.jsx` (rewire toàn bộ data; thêm scroll-up lazy + empty state)
- Read for context:
  - `src/stores/use-memories-store.js` (Phase 1), `src/stores/use-auth-store.js` (user shape)
  - `src/screens/feed-screen.jsx` (`getMomentTimestampMs`, `?date=` filter — để bucket ngày nhất quán)
- Delete: (none — `mock-data.js` giữ; chỉ bỏ import ở memories-screen. Dọn export memories mock = optional follow-up.)

## Tests (write FIRST — TDD, light)
1. `memories-screen.test.jsx` (Testing Library, mock `useMemoriesStore` + `useAuthStore` + react-router):
   - store có moments 2 ngày → render 2 ô ngày có ảnh + badge count đúng cho ngày ≥2 moment.
   - store rỗng + `!loading` → hiển thị empty state, không crash.
   - stats: lockets = số moment, streak = `streak.count`.
   - (mock `navigate`) click ngày có ảnh → `navigate('/feed?date=YYYY-MM-DD')`.
2. Đỏ trước rewire.

## Implementation Steps
1. Viết test screen (đỏ).
2. Rewire imports + mount `loadMemories`.
3. Thay `memoriesCalendar/Months/Stats/currentUser` bằng derived từ store + auth; `TODAY_KEY` thật.
4. Galaxy 3 ảnh gần nhất; empty state.
5. Scroll-up lazy `loadMoreOlder` + giữ scroll position.
6. Verify `npm run dev`: vào tab → cache hiện ngay (nếu có) → data thật; click ngày → feed lọc đúng; cuộn lên → tháng cũ; tài khoản mới (0 moment) → empty.
7. `npm test` + `npm run build` xanh.

## Success Criteria
- [ ] Memories render own moments thật theo lịch; cache hiện tức thì, update ngầm.
- [ ] Stats (lockets + streak) thật; galaxy 3 ảnh thật; "hôm nay" đúng ngày.
- [ ] Cuộn lên → load tháng cũ, không nhảy scroll; empty state không crash.
- [ ] Click ngày → `/feed?date=` đúng.
- [ ] Tests Phase 2 xanh; build pass.

## Risk Assessment
- **Day-click ngày cũ ngoài cửa sổ feed** → feed trống. Chấp nhận (scope "cửa sổ gần"); day-viewer riêng = follow-up.
- **Prepend tháng cũ làm nhảy scroll** → đo & bù `scrollTop` quanh `loadMoreOlder`.
- **Video moment không có thumbnail** → fallback poster/placeholder; ẩn ô nếu thiếu cả ảnh lẫn video.
- **Lockets count = cửa sổ** (không tuyệt đối) → chấp nhận; nếu BE có total ở profile thì dùng (follow-up).
