---
title: Locket Dio v2 caption overlays (full dataset)
description: ''
status: completed
priority: P2
branch: feat/fix-selfhost
tags: []
blockedBy: []
blocks: []
created: '2026-06-15T18:35:38.834Z'
createdBy: 'ck:plan'
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
| 1 | [Backend overlays proxy](./phase-01-backend-overlays-proxy.md) | Completed |
| 2 | [FE data layer v2 shape](./phase-02-fe-data-layer-v2-shape.md) | Completed |
| 3 | [Render v2 types + sectioned picker](./phase-03-render-v2-types-sectioned-picker.md) | Completed |
| 4 | [Streak chip + polish](./phase-04-streak-chip-polish.md) | Completed |

## Dependencies

<!-- Cross-plan dependencies -->

## Validation Log

### Session 1 (260616)

**Verification (Standard tier, 4 phases) — 0 failed:**
- VERIFIED: overlay-services.js, use-overlay-store.js, caption-overlay-schema.js (`normalizeOverlay` @74), caption-overlay.jsx, system-section.jsx, picker-section.jsx, BE controllers dir + instanceLocket.js.
- VERIFIED: upstream `GET data.locket-dio.com/v1/public/getAllOverlaysV2` → 200 (key + app headers).

**Decisions confirmed:**
1. **Tier map** — VIP = photo frame **+ caption_image + caption_gif** (early access); General = `suggest`(custom gradient, editable) + SystemSection(weather/time/location/music/**streak**); Decorative = decorative + template + star_sign(zodiac).
2. **custom/suggest (is_editable)** — chọn preset → áp **gradient bg + text_color vào ô nhập tin nhắn**, user tự gõ nội dung (đúng Locket).
3. **caption_image / caption_gif** — đưa vào ngay; render client-side qua **overlay metadata** (icon.data url); KHÔNG bake cứng vào file ảnh gửi (chấp nhận).
4. **Backend** — proxy + cache TTL + fallback `[]` (KHÔNG snapshot tĩnh).

**[CRITICAL] Concurrency finding (NEW):**
- Touchpoints `caption-picker-sheet.jsx`, `caption-overlay-schema.js`, `feed-screen.jsx`, `camera-screen.jsx` đang bị **một luồng khác sửa song song** ("port poll + camera upgrade", plan `apps/locket-love/plans/260616-0109-...`): đã thêm `EmojiPollModal`/Poll section vào picker, `PollOverlay`/`computePollCounts` vào feed, `getMomentOverlay` đã unwrap icon `{type,data}` (v2-aware một phần), camera tách `components/camera/*`.
- ⇒ Plan này PHẢI rebase trên baseline đó; cook khi luồng poll/camera đã land + commit để tránh clobber. normalizeOverlay có thể đã v2-aware một phần → Phase 2 cần đọc lại baseline trước khi sửa.
