---
title: "Caption System Port — web → locket-love (TDD)"
description: "Port hệ thống caption/overlay phong phú từ apps/self-hosted/web sang locket-love: lớp render dùng chung (compose + feed), picker sheet nâng cấp, live-data types, image upload R2, music (defer). Tests-first mỗi phase."
status: completed
priority: P2
branch: "feat/fix-selfhost"
tags: [caption, overlay, port, tdd]
blockedBy: []
blocks: []
created: "2026-06-14T14:07:14.941Z"
createdBy: "ck:plan"
source: skill
---

# Caption System Port — web → locket-love (TDD)

## Overview

`locket-love` đã có đường ống dữ liệu overlay (store + payload) giống `web` nhưng render chỉ là 1 pill `{icon}{label}` đơn giản. Plan này port toàn bộ caption: **lớp render dùng chung** (dùng cả lúc soạn ở `captured-send-preview.jsx` lẫn khi xem feed ở `feed-screen.jsx`), **picker sheet nâng cấp** (sectioned), **live-data types** (time/battery/weather/location), **image caption upload** qua R2, và **music** (defer phase cuối, cần backend mới).

Caption là **metadata** (không bake canvas) — gửi qua `optionsData` trong payload, render lại client-side ở feed.

Thiết kế gốc: [`brainstorm report`](../reports/brainstorm-260614-2047-caption-port-web-to-locket-love-report.md).

**Bug phát hiện khi plan:** `captured-send-preview.jsx:209` truyền `overlayData: { sticker: sheetCaption }`, nhưng `payload-services.js:59-69` đọc các field phẳng `overlayData.overlay_id`, `.type`, `.color_top`… → overlay sticker hiện **KHÔNG** chảy vào payload (luôn về default). Phase 2 sửa mapping này.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Test Infra + Schema + Core Render](./phase-01-test-infra-schema-core-render.md) | ✅ Completed |
| 2 | [Picker Sheet Upgrade + Selection](./phase-02-picker-sheet-upgrade-selection.md) | ✅ Completed |
| 3 | [Live-Data Types (time/battery/weather/location)](./phase-03-live-data-types-time-battery-weather-location.md) | ✅ Completed |
| 4 | [Image Caption Upload (R2)](./phase-04-image-caption-upload-r2.md) | ✅ Completed |
| 5 | [Music (deferred backend + client)](./phase-05-music-deferred-backend-client.md) | ✅ Completed |

## Key Decisions (chốt ở brainstorm)
- Render cả compose + feed; caption = metadata (không bake).
- Picker: nâng cấp BottomSheet "Chú thích" hiện có thành sectioned (KHÔNG port nguyên modal CustomeStudio + DaisyUI).
- Preset themes: backend sẽ seed qua `/v1/public/themes` (nay trả `[]`); client lo render + picker.
- Music: defer phase 5 (cần endpoint backend mới).
- Image upload: dùng `uploadFileAndGetInfoR2` có sẵn, bỏ Cloudinary.
- Saved-captions (collab) **out of scope** — self-hosted không có collab platform.

## Overlay Schema (canonical — dùng xuyên suốt)
```js
// src/utils/caption-overlay-schema.js
export const defaultOverlay = {
  overlay_id: "standard",
  color_top: "",          // gradient top
  color_bottom: "",       // gradient bottom
  text_color: "#FFFFFF",
  icon: "",               // emoji | URL | (battery: charging boolean) | (review: rating)
  caption: "",
  type: "default",        // default|custome|background|special|image_icon|image_gif|time|battery|weather|location|review|heart|music
};
// Per-type extras: music:{title,artist,image,platform} · weatherData:{temp_c_rounded,icon,condition,...}
```

## Per-type render dispatch (web parity — `CaptionViews/index.jsx`)
`image_icon`/`image_gif` → icon+text · `music` → marquee · `weather`/`location`/`heart`/`battery`/`time` → live · `review` → sao+quote · `special` → snow · `default` → text · else → gradient/custome.

## Dependencies
- Phase 1 → nền tảng (schema + render + test infra). 2,3,4,5 đều blockedBy 1.
- Phase 2 (picker + selection mapping fix) → blockedBy 1. Phase 3,4 dùng picker sections của P2 → blockedBy 2.
- Phase 5 (music) → blockedBy 2 (client) + độc lập backend.
- Cross-plan: `260614-1130-photo-frame-picker-bake-and-library` đã **completed** — không phụ thuộc, chỉ chung file `captured-send-preview.jsx` (đã merge xong).

## Validation Log

### Session 1 — 2026-06-14 (validate)

**Verification (Full tier, 5 phases):**
- Claims checked: ~12 · Verified: 11 · Failed: 0 · Unverified: 1
- VERIFIED: `/weatherV2` (`apps/self-hosted/api/src/routes/api.route.js:7`), `uploadFileAndGetInfoR2` (`src/services/storage-services.js:127`), web `SnowEffect.jsx` + `CaptionViews/styles.css`, self-hosted api route/controller pattern, `CONFIG.api` (baseUrl/storage/extenApi — `src/config/webConfig.js:16`), `getInfoMusic` thiếu (đúng kỳ vọng), bug overlay payload (`captured-send-preview.jsx:209` vs `payload-services.js:59`), feed chỉ đọc `m.caption` (`feed-screen.jsx:30`).
- UNVERIFIED: moment fetch về có mang overlay metadata không — `overlays` không xuất hiện đâu trong locket-love src; `getMomentV2` read-shape chưa xác nhận trả `optionsData`/overlay.

**Decisions confirmed:**
1. **Feed data path** → Phase 1 điều tra `getMomentV2` response; nếu thiếu overlay metadata → **thêm backend mapping** ở self-hosted để trả `optionsData`/overlays. Giữ nguyên quyết định render-ở-feed (KHÔNG bake). ⚠️ Có thể mở rộng Phase 1 sang backend.
2. **Overlay shape** → `normalizeOverlay` hỗ trợ **cả hai**: flat `optionsData` (ta POST) + Locket-native `overlays` array (nếu feed trả về).
3. **Battery** → giữ, best-effort, ẩn khi `navigator.getBattery` thiếu (target mobile Chromium). Không đổi P3.
4. **Weather host** → `weather-services` gọi `${CONFIG.api.baseUrl}/api/weatherV2`.

**Propagation:** Phase 1 (feed-mapping contingency + dual-shape normalizeOverlay), Phase 3 (weather host pinned).

### Session 2 — 2026-06-14/15 (execution: all 5 phases ✅)
- **Tất cả 5 phase completed.** 38 unit tests xanh, `npm run build` pass, backend `node -c` pass.
- **Feed data-path resolved:** BE `normalizeMoment` (`getMoment.js:54`) surface `m.overlays`; POST-side `createImagePayload.js` có builder cho default/decorative/custome/icon/weather/time/battery/special/background → round-trip có hạ tầng. `location/review/heart/music` builder = follow-up BE.
- **Bug POST-mapping `{sticker}` FIXED** (Phase 2): `handleSend` → `overlayData: toOverlayData(activeOverlay)` (phẳng), verified end-to-end qua camera-screen `handlePost` → `createRequestPayloadV5` → `payload-services`.
- **Kiến trúc lệch plan (DRY):** Phase 2 dùng `caption-pill` + `picker-section` generic + `caption-picker-sheet` (SECTIONS array) thay 4 file section riêng. Phase 3-4-5 cắm section qua slot trong `caption-picker-sheet.jsx`.
- **Follow-ups cho user:**
  1. **M2:** `send-screen.jsx` (route `/send`, orphaned — không in-app nav) còn bug `{sticker}` + `normalizeTheme` cũ → migrate sang picker mới HOẶC gỡ route.
  2. **BE post-builders:** thêm builder `location/review/heart/music` trong `createImagePayload.js` để feed round-trip đầy đủ (compose+send đã đúng).
  3. **Backend music endpoint** cần deploy self-hosted API để verify runtime (oEmbed Spotify/Apple).

### Whole-Plan Consistency Sweep — Session 1
- Re-read plan.md + 5 phase files. Không có thuật ngữ stale / field đổi tên / quyết định mâu thuẫn.
- Đồng bộ: feed render mô tả nhất quán giữa plan.md + phase-01; weather host nhất quán phase-03; battery best-effort nhất quán.
- Bake-vs-metadata: xác nhận toàn plan dùng **metadata** (không bake) — không còn dấu vết "bake caption".
- 0 mâu thuẫn chưa giải quyết.
