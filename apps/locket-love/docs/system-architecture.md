# System Architecture

Locket Love — React 18 ephemeral photo sharing frontend with interactive overlays and real-time reactions.

## Tech Stack

- **Framework:** React 18 + Vite (dev/prod build)
- **Styling:** Tailwind CSS v4 + inline styles (caption overlays)
- **State Management:** Zustand (reactions, camera state, UI modals)
- **Device Detection:** Utility functions (`is-ios.js`)
- **Video Capture:** MediaRecorder API + getUserMedia

## Core Layers

### Screens (User-facing)
- **FeedScreen** — moments grid with overlay rendering; computes poll counts from reactions
- **CameraScreen** — photo/video capture; refactored shell delegates to platform-specific preview + toggle modules

### Components

**Overlays (caption-overlay/)**
- `poll-overlay.jsx` — 2-option emoji poll (friend/owner variants)
- `default-overlay.jsx` and others — standard caption layers

**UI (ui/)**
- `global-reaction-effect.jsx` — floating emoji animation mounted at App root

**Camera (camera/)**
- `camera-preview/` — Platform-specific video stream (iOS facingMode vs Android deviceId)
- `camera-toggle/` — Platform-specific camera switch UI
- `use-camera-capture.js` — Shared capture hook (photo, video, torch)

**Modal Pickers (caption-picker/)**
- `emoji-poll-modal.jsx` — Poll creation/editing
- Other caption pickers

### Stores (Zustand)
- `use-reaction-store.js` — Manages reaction animations (triggerReaction global dispatch)

### Utils
- `is-ios.js` — Platform detection (evaluates once per render)
- `get-available-cameras.js` — Enumerates device cameras
- `caption-overlay-schema.js` — Schema and validators for overlay payloads

## Data Flow

### Poll Vote Lifecycle

1. Friend taps poll button in `poll-overlay.jsx`
2. `onVote(emoji)` → Host (FeedScreen) calls `sendReactMoment(emoji, momentId, 0)`
3. Network call sends reaction; `triggerReaction(emoji)` queues animation
4. Global animation fires via `global-reaction-effect.jsx`
5. Poll counts recomputed from `moment.reactions` via `computePollCounts()` (client-side)
6. Owner sees updated counts in owner-variant poll chip

### Camera Capture

1. CameraScreen renders shell
2. Platform dispatcher routes to iOS or Android preview component
3. Preview streams video from camera via `facingMode` (iOS) or `deviceId` (Android)
4. Capture button calls `use-camera-capture` hook → MediaRecorder or canvas photo
5. Result stored in component state, passed to upload flow

## Backend Integration (apps/self-hosted/api)

- **Poll Creation:** `imagePostPayloadPoll` / `videoPostPayloadPoll` builders write overlay with `overlay_id:"caption:poll"` and `payload.{left_emoji,right_emoji}`
- **Poll Reading:** API endpoint surfaces `overlays[].payload` for rendering on friend view
- **Reactions:** POST `/moments/:id/reactions` endpoint accepts emoji; stored in `moment.reactions` array

## Performance Considerations

- **Camera Frame Rate:** Set to `ideal:30, max:30` fps
- **Reaction Animation:** Memoized via Zustand to prevent full-tree re-renders
- **Poll Counts:** Computed once per feed render (not per poll chip)
- **Platform Detection:** Evaluated once at app init; `isIOS()` is static per session

## Accessibility

- Poll buttons: `aria-label` for screen readers (e.g., "👍" or "emoji vote count")
- Owner poll display: aria-label with vote count
- Camera toggle: platform-specific labeling

## Known Caveats

- **Overlay ID Format:** `caption:poll` is a working assumption; verify against Locket API
- **Device Testing:** iOS Safari + Android Chrome hardware compatibility pending QA
- **Video Constraints:** 30fps may need tuning on low-end devices
