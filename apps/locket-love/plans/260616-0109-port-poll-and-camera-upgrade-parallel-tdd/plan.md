---
title: 'Port Poll + Camera Upgrade → locket-love (parallel, TDD)'
description: >-
  Port poll (overlay+modal+vote), reaction-effect animation, camera full-split
  Android/iOS + video frameRate từ upstream Client-Locket-Dio vào locket-love.
status: pending
priority: P1
branch: feat/fix-selfhost
tags:
  - poll
  - reaction
  - camera
  - tdd
  - parallel
blockedBy: []
blocks: []
created: '2026-06-15T18:15:25.374Z'
createdBy: 'ck:plan'
source: skill
---

# Port Poll + Camera Upgrade → locket-love (parallel, TDD)

## Overview

Port 2 branch upstream `github.com/doi2523/Client-Locket-Dio` (`feature/poll-emoji-picker`, `feature/camera-upgrade`) vào locket-love. Nguồn: `plans/reports/brainstorm-260616-0059-port-poll-and-camera-upgrade-to-locket-love-report.md`.

Upstream dùng `apps/main` + DaisyUI; locket-love là bản viết lại Tailwind v4 → **port có chọn lọc + restyle**, không copy-paste. 4 nhóm net-new: Poll, Reaction-effect, Camera full-split, Video frameRate.

**Phương pháp:** TDD (test trước mỗi phase, vitest + @testing-library/react). Thực thi **song song** theo 3 track tách rời ranh giới file.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Reaction foundation](./phase-01-reaction-foundation.md) | Completed |
| 2 | [Poll overlay & schema](./phase-02-poll-overlay-schema.md) | Completed |
| 3 | [Poll compose & vote wiring](./phase-03-poll-compose-vote-wiring.md) | Completed |
| 4 | [Poll backend builders](./phase-04-poll-backend-builders.md) | Completed |
| 5 | [Camera utils & capture hook](./phase-05-camera-utils-capture-hook.md) | Completed |
| 6 | [Camera platform split & video](./phase-06-camera-platform-split-video.md) | Completed |
| 7 | [Integration & regression QA](./phase-07-integration-regression-qa.md) | Pending |

## Parallel Execution Map (multi-agent)

3 track độc lập theo **file ownership** — không chồng file → chạy song song an toàn.

| Track / Agent | Phases (tuần tự trong track) | File ownership (độc quyền) |
|---|---|---|
| **Agent A — Poll+Reaction (FE)** | 1 → 2 → 3 | `src/stores/use-reaction-store.js`, `src/stores/index.js`, `src/components/ui/global-reaction-effect.jsx`, `src/App.jsx`, `src/index.css`, `src/components/caption-overlay/poll-overlay.jsx`, `src/components/caption-overlay/caption-overlay.jsx`, `src/utils/caption-overlay-schema.js`, `src/components/caption-picker/emoji-poll-modal.jsx`, `src/components/caption-picker/caption-picker-sheet.jsx`, `src/components/captured-send-preview.jsx`, `src/screens/feed-screen.jsx` (+ tương ứng `__tests__`) |
| **Agent B — Poll BE** | 4 | `apps/self-hosted/api/src/services/LocketPayload/createImagePayload.js`, `createVideoPayload.js`, `LocketMoment/postImageMoment.js`, `postVideoMoment.js` |
| **Agent C — Camera** | 5 → 6 | `src/utils/get-available-cameras.js`, `src/utils/is-ios.js`, `src/components/camera/**`, `src/screens/camera-screen.jsx` (+ `__tests__`) |

**Build order:** (A: 1→2→3) ∥ (B: 4) ∥ (C: 5→6) → **Phase 7 (integration)** sau khi cả 3 track xong.

## Dependencies

- Phase 3 blockedBy [1, 2] (vote cần reaction-store + overlay render).
- Phase 6 blockedBy [5] (split cần util + shared hook).
- Phase 7 blockedBy [1,2,3,4,5,6].
- Cross-plan: nền tảng overlay từ `plans/260614-2047-caption-system-port` (đã completed) — kế thừa, không block.

## Upstream reference (cho cook agents)
Re-fetch khi cần: `git clone https://github.com/doi2523/Client-Locket-Dio.git` →
- Poll: `feature/poll-emoji-picker:apps/main/src/features/EditorCaption/Modal/EmojiPollModal.jsx`; PollOverlay: `feature/camera-upgrade:apps/main/src/components/Overlay/overlays/PollOverlay.jsx`.
- Reaction: `feature/camera-upgrade:apps/main/src/stores/PostStores/useReactionStore.js` + `pages/LocketCameraBeta/Widgets/GlobalReactionEffect.jsx` + `components/Effects/ReactionEffect/index.jsx`.
- Camera: `feature/camera-upgrade:apps/main/src/utils/device/{getInfoCamera.js,onlyIOS.js}` + `.../MediaPreview/{Android,IOS}.jsx` + `CameraToggle/{Android,IOS}.jsx`.
