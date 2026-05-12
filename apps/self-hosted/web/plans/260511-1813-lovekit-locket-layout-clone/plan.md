---
title: "Lovekit Locket Layout Clone — Swipe Nav + Critical Bug Fixes"
description: "Replace bottom-tab navigation with Locket swipe-gesture model. Bundle 7 critical bug fixes: SocketContext stale null, FriendStore field mismatch, JWT escape(), safe-area gaps, camera stream leak."
status: completed
priority: P1
effort: "15h"
branch: "feat/fix-selfhost"
tags: [ui, redesign, navigation, lovekit, bugfix]
blockedBy: []
blocks: []
created: "2026-05-11"
createdBy: "ck:plan"
source: skill
---

# Lovekit Locket Layout Clone — Swipe Nav + Critical Bug Fixes

## Overview

Rewrite Lovekit PWA navigation from bottom-tab-bar to Locket's swipe-gesture model: no chrome, center=camera, swipe-up=feed, swipe-left=messages, swipe-right=profile. Camera redesigned to rounded square + FriendMomentRow. Feed redesigned to fullscreen vertical scroll-snap. Bundles 7 CRIT/IMP bug fixes identified in code review.

**Brainstorm report:** `./reports/brainstorm-260511-locket-layout-clone.md`  
**Work context:** `apps/self-hosted/lovekit/src/`

## Phases

| # | Phase | Effort | Status | Blocked By |
|---|-------|--------|--------|------------|
| 01 | [App Swipe Engine + BottomTabBar Remove + JWT Fix + Safe-Area](./phase-01-app-swipe-engine-bottomtabbar-remove-jwt-fix-safe-area.md) | 3h | completed | — |
| 02 | [Camera Screen Redesign — Rounded Square + FriendMomentRow](./phase-02-camera-screen-redesign-rounded-square-friendmomentrow.md) | 4h | completed | — |
| 03 | [Feed Screen Redesign — Fullscreen Scroll-Snap Swiper](./phase-03-feed-screen-redesign-fullscreen-scroll-snap-swiper.md) | 3h | completed | — |
| 04 | [Bug Fixes — SocketContext + FriendStore + ChatDetail Safe-Area](./phase-04-bug-fixes-socketcontext-friendstore-chatdetail-safe-area.md) | 3h | completed | — |
| 05 | [Polish + Smoke Test](./phase-05-polish-smoke-test.md) | 2h | completed | 01,02,03,04 |

Phases 01–04 parallelizable (non-overlapping files). Phase 05 sequential after all.

## Success Criteria

- [ ] No bottom tab bar anywhere
- [ ] Swipe up/left/right from camera navigates correctly
- [ ] Camera: rounded square, bg-base-100, orange ring, FriendMomentRow
- [ ] Feed: fullscreen scroll-snap, friend overlays
- [ ] Zero JS console errors
- [ ] `npm run build` exits 0

## Dependencies

Successor to: `260510-2342-lovekit-ui-redesign` (completed)
