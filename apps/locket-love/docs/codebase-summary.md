# Locket Love Codebase Summary

React 18 + Vite + Tailwind v4 + Zustand frontend application for ephemeral photo sharing with interactive overlays.

## Recent Shipped Features (2026-06-16)

### 1. Poll Overlay System

Emoji-based 2-option polls embedded as caption overlays.

**Components:**
- `src/components/caption-overlay/poll-overlay.jsx` — Poll chip renderer
  - `pollVariant="friend"` — two tappable buttons, fires `onVote(emoji)`
  - `pollVariant="owner"` — display-only with vote counts
  - Gradient background from overlay color metadata
  - Inline styles + `caption-chip` class for consistency

- `src/components/caption-picker/emoji-poll-modal.jsx` — Modal for poll creation/editing ("Gợi ý cặp" or "Chỉnh lẻ")

**Data Flow:**
- Schema: `src/utils/caption-overlay-schema.js` carries `payload.{left_emoji,right_emoji}`
- Dispatcher: `src/components/caption-overlay.jsx` has `case "poll"`
- Vote trigger: friend taps → `sendReactMoment(emoji, momentId, 0)` + `triggerReaction`
- Vote counts: computed client-side in `src/screens/feed-screen.jsx` via `computePollCounts(moment.reactions)`

**Backend Integration (apps/self-hosted/api):**
- Builders: `imagePostPayloadPoll` / `videoPostPayloadPoll` write `data.payload` with `overlay_id:"caption:poll"`
- Read path: overlays + payload already surfaced via API

**Status:**
- Overlay_id "caption:poll" unverified against live Locket — may need adjustment
- Real-device testing (iOS Safari + Android Chrome) pending

### 2. Reaction-Effect System

Floating emoji animation on moment reactions.

**Components:**
- `src/stores/use-reaction-store.js` — Zustand store for triggering reactions
- `src/components/ui/global-reaction-effect.jsx` — Floating emoji animation component (mounted once at App root)
- Keyframes: `src/index.css` (floating-emoji)

**Flow:**
- `triggerReaction(emoji)` dispatches animation globally
- Used by poll votes and manual reactions

### 3. Camera Full Platform Split

Refactored `src/screens/camera-screen.jsx` from 876 → 504 lines, delegating to platform-specific modules.

**Architecture:**
- iOS: `src/components/camera/camera-preview/camera-preview-ios.jsx` — uses `facingMode` constraint
- Android: `src/components/camera/camera-preview/camera-preview-android.jsx` — uses `deviceId` + pinch-zoom + lens labels (0.5x / 1x / 2x)
- Dispatcher: `src/components/camera/camera-preview/index.jsx` — routes via `isIOS()`

**Supporting Code:**
- `src/components/camera/camera-toggle/{index,camera-toggle-ios,camera-toggle-android}.jsx` — platform-specific camera switch UI
- `src/components/camera/use-camera-capture.js` — shared hook (MediaRecorder, photo capture, torch)
- `src/utils/is-ios.js` — platform detection
- `src/utils/get-available-cameras.js` — camera enumeration

**Video Constraints:**
- Added `frameRate:{ideal:30,max:30}` for consistent motion capture

**Status:**
- Real-device QA (iOS Safari + Android Chrome) pending
- Architecture verified; hardware behavior not yet tested

## File Structure

```
src/
├── components/
│   ├── caption-overlay/
│   │   └── poll-overlay.jsx
│   ├── caption-picker/
│   │   └── emoji-poll-modal.jsx
│   ├── camera/
│   │   ├── camera-preview/
│   │   │   ├── index.jsx
│   │   │   ├── camera-preview-ios.jsx
│   │   │   └── camera-preview-android.jsx
│   │   ├── camera-toggle/
│   │   │   ├── index.jsx
│   │   │   ├── camera-toggle-ios.jsx
│   │   │   └── camera-toggle-android.jsx
│   │   └── use-camera-capture.js
│   └── ui/
│       └── global-reaction-effect.jsx
├── screens/
│   ├── feed-screen.jsx (computePollCounts)
│   └── camera-screen.jsx (refactored)
├── stores/
│   └── use-reaction-store.js
├── utils/
│   ├── caption-overlay-schema.js
│   ├── is-ios.js
│   └── get-available-cameras.js
└── index.css (floating-emoji keyframes)
```

## Known Limitations

- **Poll Overlay ID:** `overlay_id:"caption:poll"` format unverified against production Locket API
- **Device Testing:** iOS Safari + Android Chrome hardware behavior not yet validated
- **Frame Rate:** 30fps target may require tuning based on device performance

## Next Steps

1. Real-device QA on iOS Safari and Android Chrome for camera hardware
2. Verify poll overlay_id format with production Locket API integration
3. Performance profiling on lower-end devices for frame rate constraints
