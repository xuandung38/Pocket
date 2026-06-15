---
phase: 5
title: "Music (deferred backend + client)"
status: completed
priority: P3
effort: "1.5d"
dependencies: [1, 2]
---

# Phase 5: Music (deferred backend + client)

## Overview
Type **music** (defer phase cuối — cần backend mới). User dán link Spotify/Apple Music → backend parse metadata → caption marquee hiển thị bài hát. Gồm endpoint backend `POST /api/getInfoMusic` ở `apps/self-hosted/api` + client service/hook/renderer/section.

## Requirements
- Functional: user nhập link Spotify/Apple → lấy `{title,artist,image,platform}` → overlay `{type:"music",caption:title,music:{...}}` → render marquee (ảnh bìa + tên cuộn). Gửi → `optionsData.music`.
- Non-functional: backend endpoint xác thực idToken (giống các route `/api`). Parse dùng oEmbed/`spotify-uri` (KISS, không cần OAuth Spotify nếu oEmbed đủ). Marquee CSS thuần.

## Architecture
- **Backend** `apps/self-hosted/api`:
  - Route `POST /api/getInfoMusic` body `{url,platform}` (thêm vào `api.route.js`).
  - Controller parse: Spotify oEmbed `https://open.spotify.com/oembed?url=...` (title,thumbnail) hoặc `spotify-uri`+Web API; Apple Music oEmbed / link scrape. Trả `{title,artist,image,platform}`.
  - Xử lý lỗi link sai → 400.
- **Client**:
  - `src/services/music-services.js` → `getInfoMusicByUrl(url,platform)` → POST `/api/getInfoMusic`.
  - `src/components/caption-overlay/music-overlay.jsx` — ảnh bìa + tên cuộn (marquee CSS, port keyframes `web/.../CaptionViews/styles.css`). Đăng ký dispatcher.
  - `src/components/caption-picker/music-section.jsx` + `music-link-sheet.jsx` (form dán link, port `FormMusicPoup`).
- Nối nút "🎵 Thêm nhạc" hiện có ở `captured-send-preview.jsx:642` (đang mở music sheet mock) → thay bằng form link thật.

## Related Code Files
- Create (client):
  - `src/services/music-services.js`
  - `src/components/caption-overlay/music-overlay.jsx`
  - `src/components/caption-picker/music-section.jsx`, `music-link-sheet.jsx`
  - Tests: `src/services/__tests__/music-services.test.js`, `src/components/caption-overlay/__tests__/music-overlay.test.jsx`
- Create (backend): controller `getInfoMusic` trong `apps/self-hosted/api/.../controllers/`
- Modify:
  - `apps/self-hosted/api/.../routes/api.route.js` (thêm route)
  - `src/components/caption-overlay/caption-overlay.jsx` (đăng ký type music)
  - `src/components/caption-picker/caption-picker-sheet.jsx` (cắm music-section)
  - `src/components/captured-send-preview.jsx` (thay music sheet mock dòng ~651 bằng form thật)
- Read for context: `web/.../GeneralThemes.jsx` (music flow), `web/.../services/ExtensionsServices/MusicServices.js`, `web/.../CaptionViews/styles.css` (marquee), `apps/self-hosted/api` route+controller pattern

## Tests (write FIRST — TDD)
1. Backend `getInfoMusic` (nếu test runner backend có): link Spotify hợp lệ → parse `{title,image,platform:"spotify"}`; link sai → 400.
2. `music-services.test.js`: mock axios → POST `/api/getInfoMusic` body `{url,platform}`.
3. `music-overlay.test.jsx`: render với `music:{title,image}` → có `<img>` bìa + title; có node marquee.
4. Đỏ trước implement.

## Implementation Steps
1. Viết tests (đỏ).
2. Backend: route + controller `getInfoMusic` (Spotify oEmbed trước, Apple sau). Test bằng curl/dev.
3. Client `music-services.js`.
4. `music-overlay.jsx` (marquee) + đăng ký dispatcher.
5. `music-section.jsx` + `music-link-sheet.jsx`; thay music sheet mock ở `captured-send-preview.jsx`.
6. Verify e2e dev: dán link → lấy info → preview marquee → gửi → `optionsData.music`={...}.
7. `npm test` + build (client) + backend chạy được.

## Success Criteria
- [x] `POST /api/getInfoMusic` parse Spotify (oEmbed) trả `{title,artist,image,platform}` (syntax verified `node -c`; runtime cần deploy).
- [x] Client lấy info, render marquee, gửi `optionsData.music`.
- [x] Apple Music: title+image best-effort qua OG tags.
- [x] Tests client xanh (38/38 toàn plan); build pass. Backend syntax OK.

## Completion Notes (Session 2 — 2026-06-15)
- **Backend** `apps/self-hosted/api/src/services/Music/music-service.js` + route `POST /api/getInfoMusic` (verifyIdToken, theo pattern weatherV2). Spotify oEmbed (`open.spotify.com/oembed`) → title+thumbnail, artist parse best-effort từ title separator. Apple Music → OG tags scrape (best-effort). Link sai/empty → 400. `node -c` pass; **runtime cần deploy self-hosted API để verify thật**.
- **Client:** `music-services.js` (`getInfoMusicByUrl` → POST `${CONFIG.api.baseUrl}/api/getInfoMusic`, tránh CORS), `music-overlay.jsx` (cover + marquee, keyframe `marquee-continuous` thêm vào index.css), `music-link-sheet.jsx` (form dán link + chọn platform). Đăng ký `music` vào dispatcher.
- **Thay mock:** gỡ music sheet mock (`musicServices` từ mock-data) trong `captured-send-preview.jsx` → `<MusicLinkSheet>` thật; submit → `handleSelectOverlay(overlay)`. Gỡ luôn import `BottomSheet` dead.
- Test: hoisting fix dùng `vi.hoisted` cho mock `api.post`.
- **⚠️ Round-trip feed:** BE POST-side (`createImagePayload.js`) đã có builder cho default/decorative/custome/icon/**weather**/**time**/**battery**/special/background → các type này round-trip compose→send→feed OK. `location/review/heart/music` chưa có builder riêng → có thể fallback caption-only ở feed (compose+send vẫn đúng). Bổ sung builder BE = follow-up ngoài scope client của plan.

## Risk Assessment
- **Apple Music khó parse** (không oEmbed chuẩn) → ưu tiên Spotify; Apple best-effort/defer.
- **oEmbed thiếu artist** → chỉ title+image; artist optional.
- **Backend pattern khác kỳ vọng** → đọc route/controller mẫu self-hosted trước khi viết; tuân theo middleware idToken hiện có.
- **CORS** nếu lỡ parse client-side → luôn parse qua backend (đã chọn), tránh CORS.
