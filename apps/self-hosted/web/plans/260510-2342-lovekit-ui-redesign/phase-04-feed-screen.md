---
phase: 4
title: "FeedScreen + MomentCard + MomentViewer + Reactions"
status: completed
priority: P2
effort: "6h"
dependencies: [2]
---

# Phase 04: FeedScreen + MomentCard + MomentViewer + Reactions

## Overview

Replace stub `FeedScreen` with a warm scrollable feed of friend moments. Stacked `MomentCard` layout (not grid), full-screen `MomentViewer` on tap, 6-emoji reaction bar. Uses copied `useMomentsStoreV2`.

## Requirements

**Functional**
- Fetch and display moments from `useMomentsStoreV2`
- Stacked card layout: one prominent card per friend moment
- Tap card → full-screen `MomentViewer` with swipe-up/down pagination
- 6-emoji quick reaction bar (reuse `SendReactMoment` service)
- Delete own moment (reuse `DeleteMoment` service from `LocketServices/moment.services.js`)
- Infinite scroll / load more

**Non-functional**
- Warm card design: rounded-3xl, soft amber shadow, friend avatar + name + timestamp
- Loading state: `LoadingSkeleton` variant `feed`

## Architecture

```
screens/FeedScreen.jsx
components/
  MomentCard.jsx             ← warm card: avatar, thumbnail, caption, reactions
  MomentViewer.jsx           ← full-screen overlay with swipe pagination
  EmojiReactionBar.jsx       ← 6 fixed emojis, tap sends reaction
  FriendAvatar.jsx           ← avatar + optional online ring
```

### Data Flow

```
FeedScreen mounts
  → useMomentsStoreV2.fetchMoments(user, null)  [all friends]
  → renders MomentCard list
  → tap card → setViewerMoment(moment)
  → MomentViewer opens with Swiper vertical
  → tap emoji → SendReactMoment(emoji, moment.id)
  → long-press own card → delete confirm → DeleteMoment(id)
```

## Related Code Files

**Create**
- `apps/self-hosted/lovekit/src/screens/FeedScreen.jsx`
- `apps/self-hosted/lovekit/src/components/MomentCard.jsx`
- `apps/self-hosted/lovekit/src/components/MomentViewer.jsx`
- `apps/self-hosted/lovekit/src/components/EmojiReactionBar.jsx`
- `apps/self-hosted/lovekit/src/components/FriendAvatar.jsx`

**Read for reference (do not modify)**
- `apps/self-hosted/web/src/pages/LocketCameraBeta/BottomHomeScreen/MomentsView/MomentSlide.jsx`
- `apps/self-hosted/lovekit/src/stores/useMomentsStoreV2.js` (copied)
- `apps/self-hosted/lovekit/src/services/LocketServices/moment.services.js` (copied)

## Implementation Steps

1. **`FriendAvatar.jsx`** (≤50 lines): avatar circle with `ring-2 ring-amber-400` for unread; fallback initials.

2. **`MomentCard.jsx`** (≤100 lines):
   - `WarmCard` wrapper, `rounded-3xl overflow-hidden`
   - Top: `FriendAvatar` + friend name + `formatTimeAgo(date)`
   - Media: `aspect-square` thumbnail (`<img>`) or video indicator badge
   - Bottom: caption text (truncated) + `EmojiReactionBar`
   - `onClick` → open `MomentViewer`

3. **`EmojiReactionBar.jsx`** (≤60 lines): 6 fixed emojis `["❤️","😂","😮","😢","🔥","👏"]`. Tap calls `SendReactMoment`. Active state shows count badge.

4. **`MomentViewer.jsx`** (≤120 lines): fullscreen `fixed inset-0 z-50` overlay. Swiper vertical for pagination across moments. Close button top-right. Delete button (own moments only) via `DeleteMoment`.

5. **`FeedScreen.jsx`** (≤100 lines):
   - `useEffect` → `fetchMoments(user, null)` on mount
   - Scroll container `overflow-y-auto` with `IntersectionObserver` for load-more
   - `LoadingSkeleton variant="feed"` while loading
   - `EmptyState` when no moments

6. **Smoke test**: open Feed tab → see real moments → tap card → viewer opens → tap emoji → reaction sent.

## Todo

- [x] FriendAvatar component
- [x] MomentCard (warm design, avatar, media, reactions)
- [x] EmojiReactionBar (6 emojis, send reaction)
- [x] MomentViewer (fullscreen, swipe, delete)
- [x] FeedScreen (fetch, scroll, empty/loading states)
- [x] Smoke test reaction + delete flows

## Success Criteria

- [ ] Real moments visible from backend
- [ ] Tap opens fullscreen viewer with swipe
- [ ] Reaction sends to backend without error
- [ ] Own moments can be deleted with confirmation

## Risk Assessment

- **`useMomentsStoreV2` signature**: verify exact `fetchMoments(user, friendId)` signature from copied file before calling.
- **Swiper not installed**: add `swiper` to `package.json` if not already included.
- **Reaction service name**: grep copied `LocketServices/moment.services.js` for exact export name (`SendReactMoment`).

## Chrome MCP Testing Checklist

Activate `ck:chrome-devtools` after logging in with real credentials:

```
navigate http://localhost:5173
viewport 390x844
navigate to Feed tab
screenshot → verify: moment cards visible, warm card design, friend avatars
```

**Moment cards:**
- [ ] Feed tab shows real moment cards (not empty state)
- [ ] Each card: friend avatar + name + timestamp + media thumbnail + caption
- [ ] Cards have `rounded-3xl` corners, amber shadow visible
- [ ] `network_errors` → no failed API calls on feed load

**MomentViewer:**
- [ ] Tap card → fullscreen overlay opens, image fills screen
- [ ] Close button (×) visible top-right
- [ ] Swipe/gesture navigation between moments works

**Reactions:**
- [ ] 6 emoji buttons visible on card: ❤️ 😂 😮 😢 🔥 👏
- [ ] Tap emoji → no JS error in `console_errors`
- [ ] Reaction sent successfully (check network tab for POST request)

**Delete (own moments only):**
- [ ] Long-press own card → confirm dialog appears
- [ ] Confirm → moment disappears from feed

- [ ] Screenshot at 375×667: emoji bar not cut off at bottom

## Completion Protocol

**When this phase is done:**
1. Update frontmatter `status: pending` → `status: completed`
2. Check off all items in `## Todo` above
3. Open `plan.md` → update Phase 04 row Status column: `pending` → `completed`
4. Commit with message: `feat(lovekit): phase 04 — feed + moment cards + viewer + reactions`
