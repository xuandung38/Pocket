# Poll + Camera Upgrade: Parallel Port & Integration

**Date:** 2026-06-16 06:43
**Severity:** Low
**Component:** Caption overlays (poll), reaction effects, camera capture (iOS/Android)
**Status:** Resolved

## What Shipped

Ported 2 upstream branches from doi2523/Client-Locket-Dio into locket-love via parallel TDD:

1. **Poll overlay system**: `poll-overlay.jsx` (owner/friend variants) + `emoji-poll-modal.jsx` ("Gợi ý cặp" + "Chỉnh lẻ" tabs). Vote-to-reaction mapping. Client-side vote counts via `computePollCounts(moment.reactions)` — group by left/right emoji.
2. **Reaction effect**: Zustand `use-reaction-store` + `global-reaction-effect.jsx` floating emoji, mounted at App root.
3. **Camera refactor**: `camera-screen.jsx` 876→504 lines. Logic delegated to `camera-preview/{ios,android}` + `camera-toggle/{ios,android}` via `isIOS()`. Shared `use-camera-capture` hook. Android: deviceId selection, pinch-zoom, lens labels, frameRate:30.
4. **Backend payload builders**: Self-hosted API write path for poll overlays. `data.payload` + `overlay_id:"caption:poll"`.

## Technical Decisions

**UI migration:** Upstream used DaisyUI; locket-love is Tailwind v4. Ported logic, re-styled from scratch — no copy-paste.

**Reused infra:** `sendReactMoment(emoji,id,0)` already matched upstream signature. Existing `payload-services` already threaded `overlayData.payload` through write path. Backend read-path `normalizeMoment` already returned `overlays.payload`. Only new: poll write builder (~30 lines, mirrored weather builder pattern).

**Client-side vote aggregation:** Vote counts derived from reactions (left/right emoji grouping) instead of backend aggregation endpoint. Traded API call for client-side compute.

**Parallel execution architecture:** 3 independent tracks split by strict file ownership (no cross-track shared files). Each agent ran only its own test files in shared worktree. Lead ran full suite at integration. Result: 148/148 tests green, build clean. Eliminated merge conflicts.

**Code review findings fixed:**
- H1: Android camera used stale deviceId — lifted state to camera-screen
- L1: Dead `_pollProps` variant → poll now display-only via generic CaptionOverlay
- M1: Single-emoji tab was unused → wired with in-modal side selector + payload merge

## Outstanding

**Real-device QA not executed:**
- iOS Safari + Android Chrome: torch state, deviceId lens select, pinch-zoom, MediaRecorder mime fallback
- Poll roundtrip + vote on real Locket account
- jsdom cannot exercise hardware APIs

**`overlay_id:"caption:poll"` assumption:** Educated guess vs. actual Locket protocol. Must validate against real network capture. One-line-per-builder fix if wrong.

---

**Status:** DONE

**File written:** `/Volumes/DATA/Develop/tools/Pocket/apps/locket-love/plans/reports/journal-260616-poll-and-camera-upgrade-cook.md`

**Unresolved questions:**
1. What is the correct `overlay_id` value for poll captions in Locket's backend?
2. Will real-device QA (iOS Safari, Android Chrome, hardware features) surface breaking issues in poll or camera capture?
