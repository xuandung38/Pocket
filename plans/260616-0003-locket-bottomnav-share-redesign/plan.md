---
title: Locket bottom-nav + feed share redesign
description: ''
status: completed
priority: P2
branch: feat/fix-selfhost
tags: []
blockedBy: []
blocks: []
created: '2026-06-15T17:21:08.412Z'
createdBy: 'ck:plan'
source: skill
---

# Locket bottom-nav + feed share redesign

## Overview

Khớp bottom-nav `apps/locket-love` với Locket gốc. Menubar nền 3 icon (Memory · Shutter · Chat). Vào Feed mới hiện 2 nút rời hai bên: Lưới (trái → /grid) + Share (phải → bottom-sheet). Share sheet: targets IG/Snap/Tin nhắn/TikTok (best-effort deep-link + fallback Web Share) + Lưu (tải ảnh) + Xóa (chỉ moment của mình).

Nguồn: [brainstorm report](../reports/brainstorm-260616-0003-locket-bottomnav-share-redesign-report.md).

**Out-of-scope:** wire `/memories` sang data thật (vẫn mock); luồng camera/capture; Activity (giữ ở megaphone).

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Bottom-nav 3-icon base](./phase-01-bottom-nav-3-icon-base.md) | Completed |
| 2 | [Feed side buttons + active moment](./phase-02-feed-side-buttons-active-moment.md) | Completed |
| 3 | [Moment share sheet](./phase-03-moment-share-sheet.md) | Completed |

## Dependencies

<!-- Cross-plan dependencies -->
