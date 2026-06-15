---
title: "Locket Dio v2 caption overlays (full dataset)"
description: ""
status: pending
priority: P2
branch: "feat/fix-selfhost"
tags: []
blockedBy: []
blocks: []
created: "2026-06-15T18:35:38.834Z"
createdBy: "ck:plan"
source: skill
---

# Locket Dio v2 caption overlays (full dataset)

## Overview

Cấp đầy đủ caption/overlay cho locket-love bằng dataset v2 của Locket Dio. Backend self-hosted proxy `GET https://data.locket-dio.com/v1/public/getAllOverlaysV2` (key public + app headers, cache TTL); FE thích ứng shape v2 sectioned, render đủ 6 loại item, map vào tier VIP/General/Decorative; thêm chip Streak 🔥 client-side. Zodiac (`star_sign`) đến từ data — không tính client.

**Nguồn:** [researcher-locket-dio-captions](../260616-0003-locket-bottomnav-share-redesign/reports/researcher-260616-client-locket-dio-captions-report.md), [researcher-overlay-api](../260616-0003-locket-bottomnav-share-redesign/reports/researcher-260616-0100-locket-caption-overlay-api-report.md).

**Shape v2 (verified):** sections `[{section_id,name,order_id,items:[...]}]`. Item: `{overlay_id, type, text, text_color, icon:{data,type:"emoji"|"image",source}, background:{colors:[...]}, effect, max_lines, is_editable}`. Types: `custom`(gradient text), `decorative`/`template`(emoji+text+gradient), `caption_image`(PNG badge), `caption_gif`(GIF), `star_sign`(zodiac image+text).

**Ràng buộc:** KHÔNG phá render overlay cũ đang chạy (feed dùng normalizeOverlay/CaptionOverlay). Ảnh hiển thị qua `<img>` (cdn.locket-dio/storage.googleapis) — không cần CORS. Fetch fail → degrade về [].

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Backend overlays proxy](./phase-01-backend-overlays-proxy.md) | Pending |
| 2 | [FE data layer v2 shape](./phase-02-fe-data-layer-v2-shape.md) | Pending |
| 3 | [Render v2 types + sectioned picker](./phase-03-render-v2-types-sectioned-picker.md) | Pending |
| 4 | [Streak chip + polish](./phase-04-streak-chip-polish.md) | Pending |

## Dependencies

<!-- Cross-plan dependencies -->
