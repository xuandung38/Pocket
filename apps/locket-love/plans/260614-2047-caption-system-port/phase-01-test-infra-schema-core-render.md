---
phase: 1
title: "Test Infra + Schema + Core Render"
status: completed
priority: P1
effort: "1.5d"
dependencies: []
---

# Phase 1: Test Infra + Schema + Core Render

## Overview
Dựng test infra (Vitest + Testing Library — locket-love hiện CHƯA có test runner), định nghĩa overlay schema canonical, và xây lớp render dùng chung cho các type **tĩnh** (default/gradient/special-snow/image_icon/image_gif). Wire renderer vào compose preview (thay pill) và feed display (thay div caption phẳng).

## Requirements
- Functional: 1 component `<CaptionOverlay overlay={...} />` dispatch theo `overlay.type`, render đúng visual cho default + gradient (custome/background/decorative) + special (snow) + image_icon/image_gif. Dùng được ở cả `captured-send-preview.jsx` và `feed-screen.jsx`.
- Non-functional: mỗi file render <200 dòng (web gộp 616 → tách); không thêm dependency runtime ngoài (snow = CSS/JS thuần). Test chạy `npm test` xanh.

## Architecture
- **Schema** `src/utils/caption-overlay-schema.js`: export `defaultOverlay` + helper `normalizeOverlay(raw)` (gộp logic `normalizeTheme` ở `captured-send-preview.jsx:22` + map preset → overlay object) → trả object phẳng `{overlay_id,color_top,color_bottom,text_color,icon,caption,type,...extras}`. <!-- Updated: Validation Session 1 - dual-shape -->
  - **Dual-shape (validation):** `normalizeOverlay` nhận **cả hai** input: (a) flat `optionsData` shape ta POST (`{overlay_id,type,color_top,...}`), và (b) Locket-native `overlays` array shape (`overlays.background.colors` v.v.) nếu feed trả về. Detect shape → map về object phẳng canonical chung.
- **Dispatcher** `src/components/caption-overlay/caption-overlay.jsx`: switch `overlay.type` → component con. Fallback type lạ → `gradient-overlay`.
- **Renderers con** (mỗi file 1 type, style theo convention locket-love: inline `style`, CSS var, `.caption-chip`):
  - `default-overlay.jsx` — text + nền `rgba(0,0,0,0.45)` blur (giống pill hiện tại).
  - `gradient-overlay.jsx` — `linear-gradient(to bottom, color_top, color_bottom)` + icon + caption + `text_color`.
  - `image-icon-overlay.jsx` — icon (img URL) trái + caption phải; dùng chung cho `image_icon` và `image_gif` (gif chỉ là URL động).
  - `special-snow-overlay.jsx` + `snow-effect.jsx` — gradient + lớp tuyết rơi (port `web/src/components/Effects/SnowEffect.jsx`, đổi sang CSS/inline locket-love).
- **Compose wiring** `captured-send-preview.jsx`: thay block pill (dòng 420-432) bằng `<CaptionOverlay overlay={activeOverlay} />`. `activeOverlay` = `normalizeOverlay` của slot/sheet đang chọn. Giữ nguyên flow editable text (slot message + Aa).
- **Feed wiring** `feed-screen.jsx`: thêm `getMomentOverlay(m)` (đọc overlay metadata từ moment — xác định field ở Implementation Step 2), thay block `{caption && (...)}` (dòng 306-328) bằng: nếu có overlay metadata → `<CaptionOverlay overlay={normalizeOverlay(...)} />`, else giữ render caption phẳng (backward-compat moment cũ).
  - **Backend-mapping contingency (validation):** feed hiện chỉ đọc `m.caption` (`feed-screen.jsx:30`); `overlays`/`optionsData` CHƯA được xác nhận có trong moment fetch về. Step 2 PHẢI điều tra `getMomentV2` read-shape (`apps/self-hosted/api/.../locket.controller.js`). Nếu backend **không** trả overlay metadata → thêm map ở controller getMomentV2 để surface `optionsData`/overlays trong moment object. Đây là điều kiện để render-ở-feed hoạt động (không bake). <!-- Updated: Validation Session 1 - feed mapping -->

## Related Code Files
- Create:
  - `src/utils/caption-overlay-schema.js`
  - `src/components/caption-overlay/caption-overlay.jsx` (dispatcher)
  - `src/components/caption-overlay/default-overlay.jsx`
  - `src/components/caption-overlay/gradient-overlay.jsx`
  - `src/components/caption-overlay/image-icon-overlay.jsx`
  - `src/components/caption-overlay/special-snow-overlay.jsx`
  - `src/components/caption-overlay/snow-effect.jsx`
  - `vitest.config.js` (hoặc thêm `test` block vào `vite.config.js`)
  - `src/test/setup.js` (jest-dom matchers)
  - Tests: `src/utils/__tests__/caption-overlay-schema.test.js`, `src/components/caption-overlay/__tests__/caption-overlay.test.jsx`
- Modify:
  - `package.json` (devDeps: vitest, @testing-library/react, @testing-library/jest-dom, jsdom; script `"test": "vitest run"`, `"test:watch": "vitest"`)
  - `src/components/captured-send-preview.jsx` (thay pill render; reuse `normalizeOverlay`)
  - `src/screens/feed-screen.jsx` (thêm `getMomentOverlay` + mount CaptionOverlay)
- Read for context:
  - `web/.../CaptionViews/index.jsx` (per-type markup tham chiếu), `web/.../Effects/SnowEffect.jsx`
  - `web/.../MomentsView/CaptionOverlay.jsx` (cách feed web đọc overlay metadata)

## Tests (write FIRST — TDD)
1. `caption-overlay-schema.test.js`:
   - `normalizeOverlay({})` → trả `defaultOverlay` shape, type `"default"`.
   - `normalizeOverlay({color_top:"#000",color_bottom:"#fff",caption:"hi",type:"custome"})` → giữ gradient fields.
   - preset web shape (`preset_id`, `color_text`) map đúng sang (`overlay_id`, `text_color`).
2. `caption-overlay.test.jsx` (Testing Library):
   - render type `default` → thấy caption text.
   - type `custome` → element có `background` chứa `linear-gradient`.
   - type `image_icon` với `icon` URL → có `<img>` + caption.
   - type `special` → có node snow effect (data-testid="snow").
   - type lạ `"zzz"` → fallback gradient, không crash.
3. Chạy `npm test` phải đỏ trước khi implement (component chưa tồn tại) → xanh sau.

## Implementation Steps
1. Cài test infra: thêm devDeps, tạo `vitest.config.js` (`environment:"jsdom"`, `setupFiles:["src/test/setup.js"]`, alias `@`→`src` khớp `vite.config.js`), `src/test/setup.js` import `@testing-library/jest-dom`. Thêm scripts. Chạy `npm test` (0 test → pass) để xác nhận runner hoạt động.
2. **Điều tra field overlay trên moment**: grep `normalizeMoments`/`getMomentV2` response trong `src/services/` + `src/stores/use-moments-store-v2.js` để biết overlay nằm ở `moment.overlay` / `moment.options` / `moment.overlays`. Ghi field path vào code comment. (web đọc `overlays.background.colors` — locket-love có thể khác.)
3. Viết tests (mục Tests) — chạy, xác nhận đỏ.
4. Viết `caption-overlay-schema.js` (`defaultOverlay` + `normalizeOverlay`) → test schema xanh.
5. Viết dispatcher + 5 renderer con (default, gradient, image-icon, special-snow, snow-effect) → test component xanh.
6. Wire compose: thay pill ở `captured-send-preview.jsx`, dùng `normalizeOverlay`. Verify thủ công `npm run dev` (chọn theme → hiện gradient/icon đúng).
7. Wire feed: thêm `getMomentOverlay`, mount CaptionOverlay (fallback caption phẳng cho moment cũ).
8. `npm run build` + `npm test` xanh.

## Success Criteria
- [x] `npm test` chạy được, tất cả test Phase 1 xanh (12/12).
- [x] `<CaptionOverlay>` render đúng default/gradient/image_icon/special, fallback type lạ không crash.
- [x] Compose preview dùng CaptionOverlay (không còn pill cũ); flow gửi không vỡ (handleSend nguyên trạng).
- [x] Feed render overlay metadata khi có, fallback caption phẳng khi không.
- [x] `npm run build` pass.

## Completion Notes (Session 2 — 2026-06-14)
- **Feed data-path RESOLVED (UNVERIFIED item closed):** Backend đã trả `moment.overlays` đúng shape. Verified end-to-end: `locket.route.js:27` (`/getMomentV2` → `getMoments`) → `locket.controller.js:89` (`getLocketMoments`) → `getMoment.js:54` (`normalizeMoment` trả `overlays{id,type,text,textColor,background.colors[],icon{type,data},payload}`) → controller trả `res.data.data` (`:97-102`) → locket-love `moment-services.js:50` đọc `res.data.data`. **KHÔNG cần thêm backend mapping.** Quyết định khóa: nguồn 3 file trên.
- `normalizeOverlay` dual-shape: flat optionsData + feed `m.overlays` + theme preset (`preset_id/color_text`). Icon polymorphic (string/number/bool/{type,data}) giữ nguyên, non-mutating.
- Code review: `code-reviewer` → DONE_WITH_CONCERNS. M2 (empty icon-map → pill rỗng) + L2 (img 404) đã fix. M1 (reviewer cho rằng feed path unreachable) **bác bỏ** sau verify backend (reviewer chỉ xem client app). L1 (`_raw` vào payload) inert hôm nay → Phase 2 dùng `selectedOverlay` (không `_raw`) sẽ tự giải quyết.
- Files: created `src/utils/caption-overlay-schema.js`, `src/components/caption-overlay/{caption-overlay,default,gradient,image-icon,special-snow,snow-effect}.jsx`, `src/test/setup.js`, 2 test files; modified `package.json`, `vite.config.js`, `src/index.css` (`@keyframes fall`), `captured-send-preview.jsx`, `feed-screen.jsx`.

## Risk Assessment
- **Field overlay trên moment chưa rõ** (web khác locket-love; `overlays` không xuất hiện trong locket-love src) → Step 2 điều tra `getMomentV2` read-shape trước. Nếu BE chưa trả overlay metadata → **thêm backend mapping** ở `locket.controller.js` getMomentV2 (quyết định validation), đây là điều kiện render-ở-feed. Nếu chưa kịp làm backend trong P1, feed tạm fallback caption phẳng để không block compose; feed-render hoàn thiện sau khi backend trả metadata.
- **Snow effect perf** → giới hạn số hạt + `will-change`, chỉ render khi `type==="special"`.
- **Refactor compose có thể vỡ flow gửi** → giữ editable-text slot nguyên trạng, chỉ thay nhánh sticker.
