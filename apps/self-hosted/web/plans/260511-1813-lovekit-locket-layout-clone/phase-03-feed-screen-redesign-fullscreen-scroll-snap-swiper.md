---
phase: 3
title: "Feed Screen Redesign — Fullscreen Scroll-Snap Swiper"
status: completed
priority: P1
effort: "3h"
dependencies: []
---

# Phase 03: Feed Screen Redesign — Fullscreen Scroll-Snap Swiper

## Overview

Redesign `FeedScreen.jsx` from a scroll list of MomentCards to a fullscreen vertical scroll-snap swiper. Each moment occupies 100dvh. Overlaid friend info (top-left) and reactions (bottom). Swipe-down on first slide → back to camera.

## Requirements

**Functional**
- Each moment = one fullscreen slide = 100dvh
- Vertical scroll-snap (native CSS, no library)
- Overlay: friend avatar + name (top-left, safe-area aware), timestamp (top-right), reaction bar (bottom)
- Load more: when last slide scrolls into view, fetch older moments
- Swipe-down from first slide triggers `onBack()` (back to camera)
- Empty state: if no moments, show centered empty state with message

**Non-functional**
- No external Swiper.js library — pure CSS `scroll-snap`
- `overflow-y: scroll; scroll-snap-type: y mandatory`
- Each slide: `scroll-snap-align: start; height: 100dvh; flex-shrink: 0`
- Reactions bar: uses existing `EmojiReactionBar` component

## Architecture

```
FeedScreen (position: absolute, inset: 0, overflow-y: scroll, scroll-snap-type: y mandatory)
  ├── [0] BackTriggerSlide (100dvh) — only visible if swipe-down on first real slide needed
  │      OR detect scroll position = 0 + downward pull
  ├── [N] MomentSlide per moment (100dvh, scroll-snap-align: start)
  │      ├── <img/video> fullscreen cover
  │      ├── overlay: friend avatar + name (top-left)
  │      ├── overlay: timestamp (top-right)
  │      └── overlay: EmojiReactionBar (bottom, pb-safe)
  └── [last] LoadMoreSentinel (1px div, IntersectionObserver)
```

Back-to-camera: use a `onScroll` handler — when `scrollTop === 0` and user pulls down further (touch delta > threshold), call `onBack()`.

```jsx
// FeedScreen receives onBack prop from App.jsx (Phase 01 sets this up)
// App.jsx: <FeedScreen onBack={() => setNavState("camera")} />
```

MomentSlide replaces full MomentCard. Simplified: only shows image + overlays. No card chrome.

## Related Code Files

- **Rewrite**: `apps/self-hosted/lovekit/src/screens/FeedScreen.jsx`
- **Read for context**: `apps/self-hosted/lovekit/src/components/EmojiReactionBar.jsx`
- **Read for context**: `apps/self-hosted/lovekit/src/stores/useMomentsStoreV2.js`
- **Read for context**: `apps/self-hosted/lovekit/src/stores/useFriendStore.js`
- **Keep (read-only)**: `apps/self-hosted/lovekit/src/components/MomentViewer.jsx` — still used for full-screen tap to expand

## Implementation Steps

1. **Rewrite `src/screens/FeedScreen.jsx`**:
   - Outer container: `absolute inset-0 overflow-y-scroll` with scroll-snap CSS via style or Tailwind arbitrary: `[scroll-snap-type:y_mandatory]`
   - Map `moments` to `MomentSlide` components (inline, no separate file needed unless > 80 lines)
   - Each `MomentSlide`:
     ```jsx
     <div style={{ height: "100dvh", scrollSnapAlign: "start", position: "relative", flexShrink: 0 }}>
       <img/video src={moment.thumbnailUrl} className="absolute inset-0 w-full h-full object-cover" />
       {/* Overlays */}
       <div className="absolute top-0 left-0 right-0 flex justify-between items-start p-4 pt-[env(safe-area-inset-top)]">
         <FriendBadge friend={friendMap[moment.uid]} />
         <span className="text-white/80 text-xs">{formatTimeAgo(moment.date)}</span>
       </div>
       <div className="absolute bottom-0 left-0 right-0 pb-[env(safe-area-inset-bottom)]">
         <EmojiReactionBar moment={moment} />
       </div>
     </div>
     ```
   - `FriendBadge`: inline mini-component (avatar circle + name text below), ~15 lines
   - Back trigger: add `onTouchStart`/`onTouchEnd` listener on the container; if `containerRef.current.scrollTop === 0 && dy > 50` → call `onBack()`
   - Load-more sentinel: `<div ref={sentinelRef} style={{ height: 1 }} />` at end, IntersectionObserver calls `loadMoreOlder()`
   - Accept `onBack` prop; pass from `App.jsx`
   - Empty state: if `moments.length === 0 && !loading` → `<EmptyState message="Chưa có khoảnh khắc" />`

2. Update `App.jsx` (Phase 01): pass `onBack={() => setNavState("camera")}` to `FeedScreen`

## Todo

- [x] Rewrite `src/screens/FeedScreen.jsx` — scroll-snap fullscreen slides
- [x] MomentSlide with friend avatar + name overlay, timestamp overlay, EmojiReactionBar overlay
- [x] Back-to-camera: pull-down gesture when scrollTop=0
- [x] Load-more sentinel via IntersectionObserver
- [x] Empty state when no moments
- [x] Coordinate with Phase 01: App.jsx passes `onBack` prop

## Success Criteria

- [ ] Each moment fills 100dvh, scroll-snap on vertical axis
- [ ] Friend avatar + name visible on each slide (no blank avatars — pending Phase 04 FriendStore fix)
- [ ] Swipe-down at top of feed → camera screen
- [ ] Load-more fires when reaching last slide
- [ ] No external Swiper library added to package.json
- [ ] Safe-area padding applied to overlays (no content under notch/home bar)

## Risk Assessment

- **FriendStore field mismatch (profilePic vs profile_picture_url)**: friend avatars may not render until Phase 04 fixes `useFriendStore`. FeedScreen should degrade gracefully — use `friend?.profilePic ?? friend?.profile_picture_url` as temporary fallback in Phase 03, Phase 04 cleans up.
- **iOS momentum scroll + snap**: `-webkit-overflow-scrolling: touch` (legacy) no longer needed on iOS 13+. Standard `scroll-snap` works. If snap feels loose, add `scroll-behavior: smooth`.
- **Video moments**: some moments may be video. Use `<video autoPlay muted loop playsInline>` for video thumbnails. Check `moment.mediaType` field in `useMomentsStoreV2`.
- **ConfirmDialog for delete**: currently in FeedScreen. Remove delete from fullscreen feed for now — defer to MomentViewer detail view. Simplifies this phase.

## Completion Protocol

1. Update frontmatter `status: pending` → `status: completed`
2. Check off all Todo items
3. Update `plan.md` Phase 03 row
4. Commit: `feat(lovekit): phase 03 — feed screen fullscreen scroll-snap swiper`
