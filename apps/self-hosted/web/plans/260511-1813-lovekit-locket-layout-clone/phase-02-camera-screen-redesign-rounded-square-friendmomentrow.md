---
phase: 2
title: "Camera Screen Redesign — Rounded Square + FriendMomentRow"
status: completed
priority: P1
effort: "4h"
dependencies: []
---

# Phase 02: Camera Screen Redesign — Rounded Square + FriendMomentRow

## Overview

Redesign `CameraScreen.jsx` to match Locket's exact layout: `bg-base-100` background, rounded square camera preview with orange ring/shadow, 3-button controls row, horizontal `FriendMomentRow` at bottom. Create `FriendMomentRow.jsx`. Fix camera stream teardown on nav away.

## Requirements

**Functional**
- Camera preview: `aspect-square` centered, `~88vw` width, `rounded-3xl`, orange ring + glow shadow
- 3-button controls: gallery (left), capture (center, large orange pill), flip (right)
- FriendMomentRow: horizontal scroll of friend avatars + their latest moment thumbnail, below controls
- Swipe-up hint text below FriendMomentRow (fades after first use)
- Camera stream stops when user swipes away (navState ≠ "camera")
- Captured/posting phases retain current flow but styled on `bg-base-100`

**Non-functional**
- No fullscreen black overlay — `bg-base-100` throughout
- `safe-area-inset-top` padding on header

## Architecture

```
CameraScreen
  ├── CameraHeader  — avatar (user's own), title "Lovekit", settings icon
  ├── Preview area
  │   ├── phase=preview → <CameraPreview ref> in rounded-3xl box
  │   ├── phase=captured → captured image in same rounded-3xl box
  │   └── phase=posting → overlay spinner on same box
  ├── Controls row
  │   ├── GalleryButton (file input trigger)
  │   ├── CaptureButton (large orange circle)
  │   └── FlipButton (RotateCcw icon)
  ├── FriendMomentRow  — NEW component
  └── SwipeUpHint  — "↑ swipe for feed", localStorage flag 'lk:swipe-hint-seen'
```

`FriendMomentRow.jsx` (new file):
```jsx
// Reads from useFriendStoreV2 (friendList) and useMomentsStoreV2
// Each avatar: friend profile pic in circle, orange ring if they have a new moment
// Tap → open MomentViewer for that friend's latest moment
```

Stream teardown: `CameraScreen` receives `isActive` prop (or reads navState from context). On `isActive → false`, call `previewRef.current?.stopStream?.()`. CameraPreview already has `stopStream` via `useImperativeHandle`.

## Related Code Files

- **Create**: `apps/self-hosted/lovekit/src/components/FriendMomentRow.jsx`
- **Rewrite**: `apps/self-hosted/lovekit/src/screens/CameraScreen.jsx`
- **Read for context**: `apps/self-hosted/lovekit/src/components/CameraPreview.jsx`
- **Read for context**: `apps/self-hosted/lovekit/src/stores/friendStore/index.js` (useFriendStoreV2)
- **Read for context**: `apps/self-hosted/lovekit/src/stores/useMomentsStoreV2.js`

## Implementation Steps

1. **Create `src/components/FriendMomentRow.jsx`**:
   - Read `useFriendStoreV2` for `friendList`
   - Read `useMomentsStoreV2` to get latest moment per friend uid
   - Render horizontal `overflow-x-auto` flex row
   - Each item: 52px circle avatar, orange `ring-2 ring-primary` if `hasNewMoment`
   - Tap → `setViewerMoment(latestMoment)` → open `MomentViewer` (or null MomentViewer if no moment)
   - Keep under 80 lines; extract avatar item to inline sub-component

2. **Rewrite `src/screens/CameraScreen.jsx`**:
   - Remove `absolute inset-0 bg-black` wrapper
   - Add `pt-[env(safe-area-inset-top)]` to outer container (`bg-base-100 flex flex-col h-full`)
   - Add `CameraHeader`: user avatar (from `useAuthStore`), "Lovekit" text, settings gear icon
   - Center `CameraPreview` in a `w-[88vw] aspect-square mx-auto rounded-3xl overflow-hidden ring-4 ring-primary/40 shadow-lg shadow-primary/30` container
   - Styling for captured phase: same container, `<img>` instead of video
   - Controls row: `flex items-center justify-around px-8 py-4`
     - Gallery: `size-12 rounded-full bg-base-200` with image icon
     - Capture: `size-20 rounded-full bg-primary shadow-lg shadow-primary/40` — existing `CaptureButton` or inline
     - Flip: `size-12 rounded-full bg-base-200` with RotateCcw icon
   - Add `<FriendMomentRow />` below controls
   - Add swipe-up hint: `localStorage.getItem('lk:swipe-hint-seen')` → hide if true, else show + set flag on first render
   - Accept `isActive` prop; `useEffect([isActive]) → if (!isActive) previewRef.current?.stopStream?.()`

3. Update `App.jsx` (Phase 01 deliverable) to pass `isActive={navState === "camera"}` to `CameraScreen`

## Todo

- [x] Create `src/components/FriendMomentRow.jsx`
- [x] Rewrite `src/screens/CameraScreen.jsx` — bg-base-100, rounded square preview, orange ring, CameraHeader
- [x] Add 3-button controls row (gallery, capture, flip)
- [x] Add FriendMomentRow below controls
- [x] Add swipe-up hint with localStorage dismissal
- [x] Add `isActive` prop → stream teardown effect
- [x] Test: preview renders, capture works, posting works, stream stops on nav away

## Success Criteria

- [ ] Camera screen shows `bg-base-100` background (no black)
- [ ] Preview is a rounded square with orange ring
- [ ] CameraHeader visible with user avatar and title
- [ ] FriendMomentRow renders friend avatars horizontally
- [ ] Capture → posting flow still works end-to-end
- [ ] Camera stream stops when swiping away to another screen
- [ ] Safe-area top padding prevents header from going under notch

## Risk Assessment

- **FriendMomentRow — no moments yet**: some friends may have zero moments. Show plain avatar circle, no ring. Tap noop or show empty toast.
- **CameraPreview stopStream API**: check `CameraPreview.jsx` for the exact `useImperativeHandle` method name before calling it.
- **Posting phase UX**: current `absolute inset-0` spinner overlay. On bg-base-100, keep spinner centered over the preview box only, not full-screen black.
- **FriendMomentRow data join**: moments are keyed by user bucket (`momentsByUser`). May need to filter/find `latestMoment` per friend uid. Use `useMomentsStoreV2`'s `momentsByUser` map — check key structure before writing join logic.

## Completion Protocol

1. Update frontmatter `status: pending` → `status: completed`
2. Check off all Todo items
3. Update `plan.md` Phase 02 row
4. Commit: `feat(lovekit): phase 02 — camera screen redesign, FriendMomentRow`
