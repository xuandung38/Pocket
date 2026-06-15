# Code Review — Port Poll + Camera Upgrade (3 tracks)

Date: 2026-06-16 · Reviewer: code-reviewer · Branch: feat/fix-selfhost
Scope: Track A (poll/reaction FE), Track B (poll BE), Track C (camera split). Unrelated working-tree changes (download-moment, moment-media, moment-share-sheet, api.route, frame-picker) excluded per scope.

## Verdict: SHIP (with one High to fix-soon)

Tests 143/143 green, build green (not re-run). Read→post→render poll chain verified end-to-end across FE schema, payload-services, BE builders, and BE read path. Camera refactor preserves all original behaviors. One genuine functional bug in the Android camera flip (conditional, pre-existing feature absent before refactor so not a regression of shipped behavior). Recommend SHIP and fast-follow the High.

---

## Critical
None.

## High

### H1 — Android camera flip uses stale deviceId after a zoom-lens switch
- `src/components/camera/camera-toggle/camera-toggle-android.jsx:60` computes `nextDeviceId` then calls `onDeviceId?.(nextDeviceId)`, but `src/screens/camera-screen.jsx:435-440` renders `<CameraToggle>` WITHOUT an `onDeviceId` prop. The callback is a no-op; the resolved deviceId is discarded.
- The `deviceId` state lives entirely inside `src/components/camera/camera-preview/camera-preview-android.jsx:31` and is only ever set by `cycleZoomLabel` (lens switch). There is no path from the toggle to that state.
- Failure mode: user does a zoom lens-switch (sets `deviceId` to e.g. back-tele), then taps flip → preview `acquireStream` reruns with the STALE `deviceId` via `buildConstraints(targetId, …) → { deviceId: { exact: <oldLens> } }` (camera-preview-android.jsx:74-76). getUserMedia honors the exact deviceId and ignores the new facingMode → flip to front silently fails / wrong lens.
- Not a regression of previously-shipped behavior (original camera-screen.jsx was facingMode-only, no deviceId), but it IS a real bug in the new Android feature.
- Fix: lift `deviceId` state to camera-screen.jsx and pass `deviceId` + `setDeviceId` into BOTH `<CameraPreview>` and `<CameraToggle onDeviceId={setDeviceId}>`, OR have the toggle reset deviceId on flip. Minimal fix: pass `onDeviceId` from the screen and move `deviceId` up one level so the toggle's resolved id reaches the preview. Without lifting, at minimum wire `onDeviceId={() => /* reset */}` so flip clears the stale lens and falls back to facingMode.

## Medium

### M1 — EmojiPollModal "Chỉnh lẻ" (single-emoji) tab is dead in the only integration
- `src/components/caption-picker/emoji-poll-modal.jsx:75-82` `handleSingle` returns early when `activeSide` is falsy. `caption-picker-sheet.jsx:101-104` mounts `<EmojiPollModal>` with only `open/onClose/onSelect` — no `activeSide`. So clicking any emoji in the single tab silently no-ops; only the "Gợi ý cặp" tab works.
- Impact: confusing dead UI, no crash. If it ever fired it would emit a partial `{left_emoji}` → `handlePollSelect` destructures `{left_emoji,right_emoji}` → `right_emoji` undefined → PollOverlay falls back to DEFAULT_RIGHT "👎" (acceptable degrade).
- Fix: either hide the single tab in this entry point, or have caption-picker manage `activeSide` and merge single picks into a pending pair before forwarding a complete `{left_emoji,right_emoji}`.

### M2 — Poll vote count over-counts normal reactions that match a poll emoji
- `src/screens/feed-screen.jsx:34-44` `computePollCounts` filters ALL `moment.reactions` by emoji equality. Votes and ordinary reactions share the same storage (poll vote IS a `sendReactMoment`). A normal reaction of "👍" on a poll whose left emoji is "👍" is counted as a vote.
- Inherent to the design (votes == reactions); not introduced incorrectly, but worth documenting. No crash; counts can read high.
- Fix (optional / future): tag poll-vote reactions distinctly (e.g. a power/source marker) so `computePollCounts` can filter, or accept the ambiguity and document it. Degrades gracefully today.

## Low

### L1 — `_pollProps` passthrough in CaptionOverlay is dead code with a misleading comment
- `src/components/caption-overlay/caption-overlay.jsx:51-55` renders `<PollOverlay overlayData={ov} {...(ov._pollProps ?? {})} />`. `_pollProps` is never set anywhere (`grep` confirms only this consumer). `normalizeOverlay` does not preserve it either. Both real callers (feed-screen, captured-send-preview) render `<PollOverlay>` DIRECTLY and never route polls through CaptionOverlay.
- The comment (lines 52-54) claims "callers forward onVote/pollVariant/pollCounts" — false; no caller does. If CaptionOverlay is ever invoked with a poll overlay it renders friend-variant buttons with `onVote=null` → tappable buttons that do nothing.
- Fix: drop the `_pollProps` spread (render a display-only owner variant as a safe default) and correct the comment, or remove the `case "poll"` from CaptionOverlay since no path uses it. Defensive-only today.

## Advisory (non-blocking)

- File size: `use-camera-capture.js` (232 LOC) and `camera-preview-android.jsx` (205 LOC) marginally exceed the 200-LOC guideline. Cohesive; splitting would add indirection. Leave as-is.
- Dual `useCameraCapture` instantiation: the hook is mounted once in camera-screen.jsx (for capture handlers) and once inside each preview (for torch/zoom + stream acquisition). Verified safe — refs (`streamRef`/`videoRef`) are shared so capture reads the preview-acquired stream; each instance has its own `mediaRecorderRef`, so unmount cleanup never double-stops another instance's recorder. The screen instance returns unused torch/zoom fields (only `handleCaptureDown/Up` are consumed) — harmless but slightly wasteful.
- `generateId()` crypto fallback in use-reaction-store.js is correct for HTTP/jsdom contexts.

---

## Acceptance-criteria verification

1. Poll FE — VERIFIED. Schema carries `payload.{left,right}_emoji` (caption-overlay-schema.js:101,122). CaptionOverlay `case "poll"` present (caption-overlay.jsx:51). PollOverlay renders owner counts vs friend vote buttons (poll-overlay.jsx:81-117). Compose sets `{type:"poll",payload}` (caption-picker-sheet.jsx:45-51 → captured-send-preview.jsx:202 toOverlayData). Feed vote calls `sendReactMoment(emoji, moment.id, 0)` (via sendReaction) + `triggerReaction` (feed-screen.jsx:700-702). `computePollCounts` groups by left/right emoji (feed-screen.jsx:34-44) and degrades safely on empty/missing reactions (returns isPoll:false or zero counts, no crash).
2. Reaction — VERIFIED. `triggerReaction` assigns unique id (use-reaction-store.js:27). GlobalReactionEffect mounted once at App root (App.jsx:103), `pointerEvents:"none"`, z-index 9999 (global-reaction-effect.jsx:94-95).
3. Camera — VERIFIED. `isIOS()` dispatch in both preview/index.jsx:25 and toggle/index.jsx:15. iOS keeps facingMode (camera-preview-ios.jsx:10-20, no deviceId). Android uses deviceId + pinch (use-android-pinch-zoom.js) + zoom labels (android-zoom-label-utils.js). `frameRate:{ideal:30,max:30}` present in both buildConstraints (ios:17, android:19). Record/photo/torch/upload/swipe-up/wheel/visibilitychange/gallery-fallback/composeFrame/revokeObjectURL all preserved in the 504-line shell + hook + preview components. EXCEPTION: see H1 (Android flip deviceId wiring).
4. BE — VERIFIED. `imagePostPayloadPoll` / `videoPostPayloadPoll` write `data.payload={left_emoji,right_emoji}` + `overlay_id:"caption:poll"` + `overlay_type:"caption"` + `data.type:"poll"` (createImagePayload.js:262-288, createVideoPayload.js:264-289). post*Moment switches route `case "poll"` in all upload branches. Read path getMoment normalizeMoment surfaces `overlays.payload` (getMoment.js:100) and `overlays.id="caption:poll"` (line 86) which FE `resolveType` maps back to `poll` — chain consistent. Read path otherwise untouched.

## Contract / regression checks
- payload-services.js UNMODIFIED (git diff empty). Poll payload rides the pre-existing generic `overlayData.payload` passthrough (line 69); ordered after `weatherData` spread but no conflict (poll has no weatherData). No signature/export changes.
- stores/index.js adds `export * from "./use-reaction-store"` only; no collision with existing store exports.
- Weather overlay unaffected by `payload` generalization — weather uses the separate `weatherData` key (schema.js:100,120); `payload` passthrough is additive.
- normalizeOverlay forward-compat: unknown types still fall through to GradientOverlay (caption-overlay.jsx:57). Poll moments are not dropped by feed `getMomentOverlay` hasOverlay gate (ov.type="caption" truthy).

## Unresolved questions
1. M1: is the single-emoji tab intended to be reachable from the caption-picker entry point, or only from a future "edit one side" affordance? If the former, it's broken; if the latter, ship as-is.
2. M2: is poll-vote vs free-reaction ambiguity acceptable for v1, or is per-vote disambiguation expected? Product call.

**Status:** DONE_WITH_CONCERNS
**Summary:** Poll+reaction+camera-split integration is correct end-to-end (schema↔payload↔BE write↔BE read↔render verified); one real Android-flip deviceId bug (H1, conditional on prior lens switch), plus a dead single-emoji tab (M1), vote/reaction count ambiguity (M2), and dead `_pollProps` code (L1).
**Verdict:** SHIP — H1 is conditional (only after a zoom-lens switch) and the Android facingMode fallback covers the common flip path; fix H1 as a fast-follow.
