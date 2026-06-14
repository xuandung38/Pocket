---
title: Photo Frame Picker — canvas bake + backend library
description: ''
status: completed
priority: P2
branch: feat/fix-selfhost
tags: []
blockedBy: []
blocks: []
created: '2026-06-14T05:21:50.537Z'
createdBy: 'ck:plan'
source: skill
---

# Photo Frame Picker — canvas bake + backend library

## Overview

Sau khi chụp ảnh, user chọn **khung (frame)** → khung được **bake vào ảnh** bằng client canvas trước khi upload (chỉ ảnh). 3 kiểu: PNG trang trí (vuông, giữa trong suốt), Polaroid (viền trắng + bake ngày/caption), khung user tự upload (PNG vuông trong suốt). Thư viện khung custom quản lý qua backend (Firestore + R2). Build client + backend cùng lúc.

Thiết kế gốc: [`brainstorm report`](../reports/brainstorm-photo-frame-260614-1124-canvas-bake-and-backend-library-report.md).

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Canvas Compositing Util](./phase-01-canvas-compositing-util.md) | Completed |
| 2 | [Backend Frame Library](./phase-02-backend-frame-library.md) | Completed |
| 3 | [Client Data Layer + Custom Upload](./phase-03-client-data-layer-custom-upload.md) | Completed |
| 4 | [Frame Picker UI + Integration](./phase-04-frame-picker-ui-integration.md) | Completed |

**Phase deps:** P3 cần P2 (endpoints); P4 cần P1 (compose) + P3 (data). P1, P2 độc lập (làm song song được).

## Key decisions (chốt từ brainstorm)
- **Bake canvas** (không overlay metadata) → khung là phần của file ảnh, hiện mọi nơi.
- Output **JPEG** vuông **1080²** cho cả PNG frame (q~0.9) lẫn Polaroid (q~0.95, ảnh inset + viền + dải chữ).
- **Tái dùng** luồng R2 `presignedV3` + `uploadFileAndGetInfoR2`; **không** đổi post-moment.
- Caption overlay cũ giữ nguyên (metadata display-only), độc lập khung.
- **Tất cả frame seed/lưu backend** (Firestore + R2) — built-in (global) + custom (per-user) chung 1 nguồn `GET /frames`. PNG built-in cũng ở R2 → load `crossOrigin` (R2 CORS GET `*` đã mở → không taint).
- Frame custom = PNG **vuông + có alpha**, validate client trước upload. Cap **50/user**.

## Constraints
React 18 + Vite + Zustand. Firestore per-user (pattern friend-request đã có). `img.crossOrigin="anonymous"` cho frame từ R2 (R2 CORS đã `*` GET). `document.fonts.ready` trước khi vẽ text Polaroid.

## Resolved (validate 2026-06-14)
- Built-in frames: **seed backend** (R2 + Firestore, global), không bundle app.
- Polaroid: **xuất vuông 1080²** (ảnh inset + viền + dải chữ trong canvas vuông) — moment giữ vuông.
- Polaroid text: **ngày = lúc đăng**, **caption = ô caption sẵn có** (tái dùng, không input mới).
- Cap **50 khung custom/user**.

## Open Questions
- Cần **bộ PNG khung built-in thật** (asset thiết kế) để seed — hiện chưa có; seed script dùng PNG mẫu trước, thay design sau.

## Dependencies

Không có cross-plan dependency (chỉ `plans/reports/` tồn tại, không plan dở nào overlap).
