# Brainstorm — Port hệ thống Caption từ `web` sang `locket-love`

**Date:** 2026-06-14 20:47 · **Branch:** feat/fix-selfhost · **Status:** Design approved, sẵn sàng plan

## 1. Problem statement

Web self-hosted (`apps/self-hosted/web`) có hệ thống caption/overlay phong phú (~10 type, picker `CustomeStudio`, renderer `AutoResizeCaption` 616 dòng). `locket-love` mới chỉ có *đường ống dữ liệu* tương đương (cùng store schema, payload đã hỗ trợ overlay) nhưng render rất đơn giản (1 pill `{icon}{label}` + gradient). Mục tiêu: port toàn bộ caption sang locket-love, render cả lúc soạn lẫn khi xem feed.

## 2. Scout findings

### Web caption inventory
- Picker: `ModalViews/CustomeStudio/` (modular `CaptionItems/*`).
- Renderer: `MainHomeScreen/Layout/CaptionViews/index.jsx` (616 dòng, gộp ~12 overlay type).
- Display feed: `BottomHomeScreen/MomentsView/CaptionOverlay.jsx`.
- Store: `stores/useOverlayStore.js` (API cache + localStorage), `stores/postStore/` (`defaultOverlay.js` schema).

### locket-love hiện trạng
- `src/stores/use-overlay-store.js`: fetch `GET /v1/public/themes`, group đúng 6 type như web. **Backend trả `[]`** (chờ seed).
- `src/components/captured-send-preview.jsx:420`: render caption = pill đơn giản. Picker = carousel vuốt + BottomSheet "Chú thích" chỉ hiện custome+decorative.
- `src/services/payload-services.js`: đã map overlay fields vào `optionsData`.
- Music sheet hiện là **mock** (nút "Connect" vô tác dụng).

### Feasibility matrix (self-hosted)
| Type | Nguồn | Tình trạng |
|---|---|---|
| text/gradient (custome/decorative/background) | preset `/v1/public/themes` | ✅ plumbing xong, chờ backend seed |
| special (snow) | preset + `SnowEffect` | ✅ tự chứa |
| image_icon / image_gif | preset | ✅ tự chứa |
| time | `new Date()` | ✅ trivial |
| battery | `navigator.getBattery()` | ✅ best-effort (deprecated desktop → ẩn nếu thiếu) |
| review / heart | form / static | ✅ tự chứa |
| location | Nominatim OSM (free, no key) | ✅ port hook + geolocation |
| weather | `POST /api/weatherV2` | ✅ **endpoint đã có**, chỉ thiếu service wrapper |
| image caption upload | web hardcode Cloudinary | 🟡 đổi sang R2 (`uploadFileAndGetInfoR2`) |
| music | `/api/getInfoMusic` | ❌ endpoint chưa có → **defer** |
| saved captions (collab) | collab platform + localStorage | ⛔ out of scope (self-hosted không có collab) |

## 3. Decisions (chốt với user)
- **Phạm vi:** port tất cả nhóm type (trừ saved-captions/collab — không có hạ tầng).
- **Render:** cả compose preview lẫn feed/display; caption là metadata (không bake canvas).
- **Picker:** nâng cấp BottomSheet "Chú thích" hiện tại thành sectioned picker (KHÔNG port nguyên modal CustomeStudio + DaisyUI).
- **Preset data:** backend sẽ cung cấp qua themes API; client lo render + picker.
- **Music:** defer sang phase cuối (cần backend endpoint mới).
- **Image upload:** dùng R2 upload có sẵn, bỏ Cloudinary.

## 4. Recommended architecture

**Block 1 — Lớp render dùng chung** `src/components/caption-overlay/`
- Dispatcher `caption-overlay.jsx` switch theo `overlay.type`.
- Per-type (tách <200 dòng): `default`, `gradient`, `special-snow` (+`snow-effect`), `image-icon` (dùng chung image_gif), `time`, `battery`, `weather`, `location`, `review`, `heart`, `music-marquee` (phase cuối).
- Dùng ở compose (thay pill `captured-send-preview.jsx:420`) + feed viewer.

**Block 2 — Picker nâng cấp** `src/components/caption-picker/`
- Sections nhỏ: `system-themes` (time/weather/battery/location/music/review/heart), `gradient-themes`, `special-captions`, `icon-captions`, `gif-captions`, `image-caption`.
- State: tổng quát hóa `sheetCaption` → `selectedOverlay` object đầy đủ field.

**Block 3 — Hooks/services live-data**
- `services/weather-services.js` → `/api/weatherV2`; `hooks/use-weather.js`.
- `hooks/use-location.js` (Nominatim), `hooks/use-battery.js`, time inline.
- `hooks/use-image-caption.js` reuse R2 upload.

**Block 4 — Music (phase cuối)**
- Backend mới `apps/self-hosted/api`: `POST /api/getInfoMusic` (oEmbed/spotify-uri parse).
- Client `services/music-services.js` + `music-overlay` marquee + section.

**Display feed:** mount `<CaptionOverlay overlay={moment.overlay} />` vào component xem moment (xác định file chính xác khi implement).

## 5. Build order (phasing đề xuất)
1. **Schema + render layer** (default, gradient, image_icon/gif, special-snow) — thay pill ở compose + thêm vào feed.
2. **Picker sheet nâng cấp** + selection state + edit text/review form.
3. **Live-data** (time, battery, weather, location) + hooks/services.
4. **Image caption upload** qua R2.
5. **Music** (backend endpoint + client) — phase cuối.

## 6. Risks
- Themes API trả `[]` hôm nay → sections theme/special/icon/gif rỗng đến khi backend seed (render layer vẫn sẵn sàng).
- Battery API deprecated desktop → ẩn type nếu `navigator.getBattery` không có.
- Geolocation cần user consent; Nominatim có rate-limit (thêm cache/debounce).
- Refactor render path compose có thể vỡ flow gửi hiện tại → giữ backward-compat selection.
- payload `optionsData` phải tải đủ field riêng từng type (music/weatherData/location...).

## 7. Open questions
- File feed/moment-viewer chính xác để mount display renderer? (xác định ở phase 1).
- Backend seed preset themes theo lịch nào? (ảnh hưởng thời điểm test các section theme).
- Music phase cuối: chấp nhận chỉ Spotify+Apple hay cần thêm platform?
