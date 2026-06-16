---
phase: 1
title: Backend overlays proxy
status: completed
priority: P1
effort: 2h
dependencies: []
---

# Phase 1: Backend overlays proxy

## Overview
Self-hosted API endpoint trả dataset overlays v2 bằng cách proxy `data.locket-dio.com/v1/public/getAllOverlaysV2` (key public + app headers), cache in-memory TTL. Đây là nguồn data cho FE.

## Requirements
- Functional: `GET /v1/public/getAllOverlaysV2` (self-hosted) trả nguyên mảng sections v2 từ upstream. Fail upstream → trả `[]` (FE degrade), không 500.
- Non-functional: cache TTL ~10 phút (giảm gọi upstream); timeout 15s; không lộ key ra response.

## Architecture
- Tạo data client trỏ `https://data.locket-dio.com` (axios) với headers: `x-api-key: LKD-LOCKETDIO-AB02F55KYM55DD02MM03YY25-LKD`, `x-app-name`, `x-app-author`, `Content-Type`. (Key là public-frontend key của locket-dio, repo công khai.)
- Controller `overlays.controller.js`: fetch upstream, cache module-level `{data, ts}` với TTL; trả `res.json(data)`. CORS đã mở toàn cục (app.js).
- Route trong `public.route.js` (cùng nhóm `/v1/public/*`). Có thể giữ `/themes` cũ trả [] (không đụng) — FE sẽ chuyển sang endpoint mới ở Phase 2.

## Related Code Files
- Create: `apps/self-hosted/api/src/controllers/overlays.controller.js`
- Create: `apps/self-hosted/api/src/libs/instanceLocketDioData.js` (axios client) — hoặc inline axios trong controller (KISS)
- Modify: `apps/self-hosted/api/src/routes/public.route.js` (thêm route)

## Implementation Steps
1. Axios GET upstream với headers; map `res.data` (mảng sections hoặc `{data:[...]}`).
2. Cache TTL module-level; trả cache nếu còn hạn.
3. Route `router.get("/getAllOverlaysV2", overlaysController.getAll)`.
4. Test thủ công: `curl localhost:PORT/v1/public/getAllOverlaysV2` → 6 sections / 71 items.

## Success Criteria
- [ ] Endpoint trả đủ sections/items như upstream.
- [ ] Upstream lỗi → `[]`, không crash.
- [ ] Cache hoạt động (lần 2 không gọi upstream trong TTL).
- [ ] `node -c` controller/route OK.

## Risk Assessment
- Phụ thuộc uptime + key locket-dio (key có thể rotate). Mitigation: cache + fallback []; doc ghi rõ nguồn. Nếu cần tự chủ → Phase sau seed tĩnh từ 1 lần fetch.
- Upstream đổi shape → FE normalize (Phase 2) phải phòng thủ.
