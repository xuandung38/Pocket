---
title: Memories screen API integration (SWR + localStorage)
description: ''
status: completed
priority: P2
branch: feat/fix-selfhost
tags: []
blockedBy: []
blocks: []
created: '2026-06-15T16:56:16.327Z'
createdBy: 'ck:plan'
source: skill
---

# Memories screen API integration (SWR + localStorage)

## Overview

Ghép data thật vào `memories-screen.jsx` (tab "Kỷ niệm") — hiện 100% mock. **Không cần backend mới**: tái dùng `getAllMoments({friendId:meUid})` cho own moments + thêm 1 service `getLatestMoment()` cho streak (api đã whitelist `getLatestMomentV2`).

Pattern: **stale-while-revalidate qua localStorage** — `useMemoriesStore` hydrate cache đồng bộ (render tức thì) → fetch own moments + streak **ngầm** → chỉ update nếu có data mới (mirror `useStreakStore.syncStreak` của lovekit).

Thiết kế gốc: [`brainstorm report`](../reports/brainstorm-260615-2348-memories-screen-api-integration-report.md).

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Data layer — service + store (TDD)](./phase-01-data-layer-service-store-tdd.md) | Completed |
| 2 | [Screen rewire + lazy load + edge cases](./phase-02-screen-rewire-lazy-load-edge-cases.md) | Completed |

## Key Decisions (chốt ở brainstorm)
- **Data scope**: own moments, cửa sổ gần (`friendId=meUid`, `limit≈200`; tháng cũ lazy khi cuộn lên).
- **Store**: `useMemoriesStore` (zustand) riêng — đúng convention `useMomentsStoreV2`; KHÔNG reuse feed store (own+friends/recent, lẫn concern).
- **Cache**: localStorage SWR — chỉ lưu **metadata** (không blob).
- **Stats**: streak thật (`getLatestMomentV2` `fetch_streak`) + lockets count (tổng own moments đã load).
- **Galaxy header**: giữ, 3 thumbnail own gần nhất.
- **Day-click**: giữ `navigate('/feed?date=')` (đã chạy); ngày cũ ngoài cửa sổ feed = edge, day-viewer riêng OUT of scope.
- **TDD**: logic store thuần (group-by-date, SWR merge/diff, cache hydrate/persist) test trước.

## Dependencies
- Phase 2 blockedBy Phase 1 (screen consume store).
- Cross-plan: `260614-2047-caption-system-port` đã **completed**, không overlap file (memories dùng `memories-screen.jsx` + store mới; caption dùng feed/compose). Không phụ thuộc.
- Verified infra: Vitest + Testing Library đã có (từ caption-port); `getAllMoments` (`moment-services.js:42`), `getToken().localId`, `use-auth-store` user.
