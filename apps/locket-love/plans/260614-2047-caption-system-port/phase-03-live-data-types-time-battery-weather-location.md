---
phase: 3
title: "Live-Data Types (time/battery/weather/location)"
status: completed
priority: P2
effort: "2d"
dependencies: [1, 2]
---

# Phase 3: Live-Data Types (time/battery/weather/location)

## Overview
Thêm các caption type lấy data runtime: **time** (Date), **battery** (navigator.getBattery), **weather** (`POST /api/weatherV2` đã có sẵn ở self-hosted), **location** (Nominatim OSM free), cùng **review** + **heart** (form/static). Gồm hooks/services + renderer con + system-section trong picker.

## Requirements
- Functional: section "System" trong picker hiển thị nút time/weather/battery/location/review/heart. Chọn → set `selectedOverlay` với data thực + render đúng (giờ chạy, °C + icon, % pin, địa chỉ, sao+quote, tim). Weather/location xin geolocation; battery best-effort.
- Non-functional: hooks tách riêng `src/hooks/`; renderer <200 dòng; Nominatim có debounce/cache tránh rate-limit; graceful khi user từ chối geolocation / battery API thiếu (ẩn hoặc fallback).

## Architecture
- **Services/hooks** (port từ `web/src/utils/enviroment/` + `services/ExtensionsServices/`):
  - `src/services/weather-services.js` → `POST ${CONFIG.api.baseUrl}/api/weatherV2` body `{lat,lon}` qua `@/libs` axios → `{temp_c_rounded,icon,condition,...}`. Endpoint verified `apps/self-hosted/api/src/routes/api.route.js:7`; host = `CONFIG.api.baseUrl` (`src/config/webConfig.js:16`). <!-- Updated: Validation Session 1 - weather host pinned -->
  - `src/hooks/use-weather.js` → geolocation → gọi weather-services → `{weather, loading}`.
  - `src/hooks/use-location.js` → geolocation → fetch Nominatim reverse + search (free, no key) → `addressOptions[]`. Debounce + cache theo lat/lon.
  - `src/hooks/use-battery.js` → `navigator.getBattery()` → `{level, charging}`; nếu API thiếu → `{level:null}` (ẩn nút battery).
- **Renderer con** `src/components/caption-overlay/`:
  - `time-overlay.jsx`, `battery-overlay.jsx`, `weather-overlay.jsx`, `location-overlay.jsx`, `review-overlay.jsx`, `heart-overlay.jsx`. Đăng ký vào dispatcher Phase 1.
- **Picker** `src/components/caption-picker/system-section.jsx`: nút grid (port `web/.../GeneralThemes.jsx` logic chọn, bỏ DaisyUI). Map data shape:
  - time → `{type:"time",caption:"HH:mm"}`
  - weather → `{type:"weather",caption:"23°C",text_color:"#FFFFFF",weatherData:{...}}`
  - battery → `{type:"battery",caption:level,icon:charging}`
  - location → `{type:"location",caption:address}`
  - review → `{type:"review",icon:rating,caption:text}` (qua form)
  - heart → `{type:"heart",caption:"inlove"}`
- **Review form** `src/components/caption-picker/review-form-sheet.jsx` (port `FormReviewPoup`): rating sao + text → `onSubmit({rating,text})`.

## Related Code Files
- Create:
  - `src/services/weather-services.js`
  - `src/hooks/use-weather.js`, `src/hooks/use-location.js`, `src/hooks/use-battery.js`
  - `src/components/caption-overlay/{time,battery,weather,location,review,heart}-overlay.jsx`
  - `src/components/caption-picker/system-section.jsx`, `review-form-sheet.jsx`
  - Tests: `src/hooks/__tests__/use-battery.test.js`, `src/services/__tests__/weather-services.test.js`, `src/components/caption-overlay/__tests__/live-overlays.test.jsx`
- Modify:
  - `src/components/caption-overlay/caption-overlay.jsx` (đăng ký 6 type mới)
  - `src/components/caption-picker/caption-picker-sheet.jsx` (cắm system-section)
  - `src/services/payload-services.js` (đảm bảo `weatherData`→`payload`, `music` passthrough — đã có `:68`)
- Read for context: `web/.../GeneralThemes.jsx`, `web/src/utils/enviroment/weather.js` + `location.js`, `web/src/utils/device/batteryUtils.js`, `web/.../services/ExtensionsServices/WeatherServices.js`

## Tests (write FIRST — TDD)
1. `weather-services.test.js`: mock axios → POST `/api/weatherV2` đúng body `{lat,lon}`, parse field `temp_c_rounded`.
2. `use-battery.test.js`: mock `navigator.getBattery` → trả `{level,charging}`; khi không có API → `level:null`.
3. `live-overlays.test.jsx`: render `weather` overlay với `weatherData` → có `<img>` icon + "23°C"; `battery` charging=true → có dấu sạc; `time` → có chuỗi giờ; `review` rating=4 → 4 sao; `heart` → icon tim.
4. Đỏ trước implement.

## Implementation Steps
1. Viết tests (đỏ).
2. `weather-services.js` + `use-weather.js`; xác nhận `/api/weatherV2` qua `npm run dev` (cho phép vị trí → thấy °C).
3. `use-location.js` (Nominatim) + `use-battery.js`.
4. 6 renderer con + đăng ký dispatcher.
5. `system-section.jsx` + `review-form-sheet.jsx`; cắm vào picker sheet (P2).
6. Map data → `selectedOverlay`; verify gửi → `optionsData.payload`=weatherData.
7. Graceful: từ chối geolocation → ẩn weather/location data, không crash; battery thiếu → ẩn nút.
8. `npm test` + build xanh.

## Success Criteria
- [x] time/battery/weather/location/review/heart render đúng ở compose + feed.
- [x] weather gọi `/api/weatherV2` thật; location dùng Nominatim không cần key.
- [x] Từ chối geolocation / battery thiếu → degrade mượt, không crash.
- [x] weatherData chảy vào `optionsData.payload`; tests + build xanh (30/30).

## Post-completion refinements (2026-06-15, user feedback)
- **Location dropdown + nearby search:** nút "Vị trí" nay mở `location-sheet.jsx` — hiện vị trí hiện tại (reverse) + ô tìm kiếm Nominatim `search` (bias viewbox quanh toạ độ) chọn địa điểm lân cận/khác. `use-location.js` refactor: `fetchCurrent()` + `search(query)` debounce 400ms. Bỏ logic await-pick-first trong system-section.
- **Caption style theo Locket (per-type):** plain=tối; live-data (weather/time/pin/vị trí/tim/đánh giá/nhạc)=trắng-mờ chữ tối `#1c1c1e`; themed=gradient. `.caption-chip` bo góc 24px + blur(24px). Tim đỏ, sao vàng.
- **Fix caption cắt ngắn:** wrapper (compose+feed) `left:50%`+translateX → `left:0;right:0;flex;justify-center`.
- **Caption trên photo frame:** caption wrapper compose `zIndex:110` (> frame 100).

## Completion Notes (Session 2 — 2026-06-15)
- Implemented via `fullstack-developer` subagent, verified độc lập (30/30 tests, build clean).
- **Weather contract PINNED:** `POST ${CONFIG.api.baseUrl}/api/weatherV2` (no auth) body `{lat,lon}` → `res.data.data.current{temp_c_rounded, icon (protocol-relative //cdn...), condition,...}`. `weather-services.getWeatherByCoords` trả `res.data.data.current`.
- **Hooks:** `use-weather` (geolocation→weatherV2), `use-location` (Nominatim reverse, debounce 300ms + module cache theo rounded lat/lon 1 decimal), `use-battery` (best-effort, `supported:false` khi thiếu API). Tất cả set `loading=true` đồng bộ đầu fetch → effect+flag pattern ở system-section chờ đúng (verified).
- **6 renderers** đăng ký vào dispatcher `caption-overlay.jsx` (additive switch cases): time/battery/weather/location/review/heart. Display-only, inline-style chip convention.
- **Picker:** `system-section.jsx` (grid Giờ/Thời tiết/Pin/Vị trí/Đánh giá/Tim) cắm vào `caption-picker-sheet.jsx` tại P3 slot; `review-form-sheet.jsx` (sao + text). Battery button ẩn khi unsupported; geolocation denied → SonnerError, không crash.
- **weatherData round-trip (review-catch):** compose set `weatherData`; gửi → `toOverlayData` → `payload-services:68` map sang `optionsData.payload` → feed trả `overlays.payload`. Sửa `weather-overlay` đọc `overlay.weatherData ?? overlay.payload` để render cả 2 path + test feed-shape. Các live type khác round-trip ổn qua caption/icon (đã trace: battery icon=charging bool, review icon=rating number, location/time/heart qua caption).
- Code review: manual review surfaces rủi ro (system-section async, hooks geolocation, renderers) — clean; P3 additive (regression thấp). Files: 15 created (services/hooks/renderers/section/form + 3 tests), 2 shared modified (dispatcher + picker-sheet, additive).

## Risk Assessment
- **Battery API deprecated** (desktop Chrome/Firefox/Safari bỏ) → `use-battery` trả null → ẩn nút; chỉ best-effort mobile Chromium.
- **Nominatim rate-limit** (1 req/s policy) → debounce + cache + User-Agent header; tránh gọi lặp.
- **Geolocation cần HTTPS + consent** → handle denied/timeout, fallback ẩn.
- **`/api/weatherV2` field khác kỳ vọng** → test parse; điều chỉnh mapper theo response thật.
