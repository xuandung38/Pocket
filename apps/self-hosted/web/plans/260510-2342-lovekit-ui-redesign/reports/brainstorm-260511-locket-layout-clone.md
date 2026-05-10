# Brainstorm: Locket Layout Clone — Full Navigation Redesign

**Date:** 2026-05-11  
**Status:** Agreed — ready for implementation plan  
**Scope:** `apps/self-hosted/lovekit/`

---

## Problem Statement

Current Lovekit PWA uses a bottom tab bar (4 tabs) + CSS `hidden/block` toggle. This deviates from Locket's core UX model:
- Locket has **no visible navigation chrome** on the camera screen
- Navigation is **gesture-driven** (swipe up/left/right from center camera)
- Camera screen is the **home** — friends' moments are a horizontal row, not a feed tab
- Feed is **fullscreen vertical swipe**, reachable by swiping up from camera

Decision: replicate Locket navigation model 100%. Lovekit orange-amber style stays.

---

## Agreed Design

### Navigation Architecture

**Remove:** `BottomTabBar.jsx` (deleted entirely)

**Replace App.jsx** with swipe-gesture navigation:

```
navState: "camera" | "feed" | "messages" | "profile"

Positions (CSS transform):
  feed      → translateY(-100%) at rest, translateY(0) when active
  messages  → translateX(-100%) at rest, translateX(0) when active  
  profile   → translateX(+100%) at rest, translateX(0) when active
  camera    → always center (translateX/Y: 0)
```

Swipe detection: `touchstart` / `touchend` delta threshold (~50px). All 4 screens remain mounted. `transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)`.

### Camera Screen (Full Redesign)

```
┌─────────────────────────┐  ← safe-area top
│  [Avatar] Lovekit  [⚙]  │  ← CameraHeader (bg-base-100)
│                         │
│  ┌─────────────────┐    │
│  │                 │    │
│  │   88vw square   │    │  ← aspect-square rounded-3xl
│  │   preview box   │    │     ring-4 ring-primary/40
│  │                 │    │     shadow-lg shadow-primary/30
│  └─────────────────┘    │
│                         │
│  [🖼] [● capture] [↻]   │  ← 3 control buttons
│                         │
│  ──── Friends ────────→  │  ← FriendMomentRow (horizontal scroll)
│  ↑ swipe up for feed    │  ← hint text, fade out after first use
└─────────────────────────┘  ← safe-area bottom
```

- Background: `bg-base-100` (cream), not black
- Preview box: `rounded-3xl overflow-hidden` with orange ring/glow
- Capture button: large orange pill, haptic feedback
- FriendMomentRow: horizontal scroll of friend avatars + their latest moment thumbnail

### Feed Screen (Full Redesign)

```
Fullscreen vertical swiper (one moment = one slide = 100dvh)
  - Friend avatar + name overlay (top-left, safe-area aware)
  - Timestamp overlay (top-right)
  - Reaction bar overlay (bottom, above safe-area)
  - Swipe down from first slide → back to camera
```

Implementation: CSS scroll-snap (`scroll-snap-type: y mandatory`, each slide `scroll-snap-align: start`). No external Swiper library needed.

### Messages / Profile Screens

Internal UI unchanged. Navigation behavior changes:
- Slide in from left (messages) / right (profile)
- Remove old `hidden`/`block` className toggling
- Add back-swipe gesture support

---

## Critical Bugs Bundled in Same Plan

All 7 items fixed in the redesign, not separately:

| # | Bug | Location | Fix |
|---|-----|----------|-----|
| 1 | SocketContext publishes stale `socket:null` | `context/SocketContext.jsx` | Move socket ref into state or use useMemo |
| 2 | FriendStore V1 `profile_picture_url` vs MomentCard `friend.profilePic` | `stores/useFriendStore.js` | Normalize to camelCase at store level |
| 3 | Two parallel friend stores (V1 + V2) — shape mismatch everywhere | stores/ | Consolidate to single store, V2 wins |
| 4 | App.jsx JWT decode uses removed `escape()` | `App.jsx` | Replace with `decodeURIComponent` |
| 5 | Camera mediaStream not torn down when leaving camera screen | `CameraScreen.jsx` | Stop tracks in cleanup effect |
| 6 | ChatDetail.jsx:127 header under iOS notch | `components/ChatDetail.jsx` | Add `pt-[env(safe-area-inset-top)]` |
| 7 | App.jsx pb-16 cuts off content behind tab bar remnant | `App.jsx` | Remove pb-16, add `pb-safe` per screen |

---

## Files Affected

### Delete
- `src/components/ui/BottomTabBar.jsx`

### Rewrite (majority of file changes)
- `src/App.jsx` — swipe navigation engine, remove tab switcher, fix JWT decode, fix safe-area
- `src/screens/CameraScreen.jsx` — full redesign to rounded square + FriendMomentRow
- `src/screens/FeedScreen.jsx` — fullscreen vertical scroll-snap swiper

### Modify (targeted fixes)
- `src/context/SocketContext.jsx` — fix stale socket
- `src/stores/useFriendStore.js` — normalize field names, consolidate V1/V2
- `src/components/ChatDetail.jsx` — safe-area top fix

### Create (new)
- `src/components/FriendMomentRow.jsx` — horizontal friend moments row for camera screen
- `src/hooks/useSwipeNav.js` — touch gesture logic extracted from App.jsx

---

## Implementation Phases (suggested)

1. **Phase A** — App.jsx swipe engine + delete BottomTabBar + fix JWT + fix safe-area
2. **Phase B** — Camera screen full redesign + FriendMomentRow + stream cleanup
3. **Phase C** — Feed screen full redesign (scroll-snap swiper)
4. **Phase D** — Bug fixes (SocketContext, FriendStore consolidation, ChatDetail safe-area)
5. **Phase E** — Polish + smoke test (Chrome DevTools, iPhone viewport)

Phases A+B+C+D can run in parallel (non-overlapping files). Phase E sequential after all.

---

## Success Criteria

- [ ] No bottom tab bar visible anywhere
- [ ] Swipe up from camera → feed (fullscreen)
- [ ] Swipe left from camera → messages (slide in)
- [ ] Swipe right from camera → profile (slide in)
- [ ] Camera preview: rounded square, bg-base-100, orange ring
- [ ] FriendMomentRow visible on camera screen
- [ ] Feed: scroll-snap fullscreen moments
- [ ] No JS errors in console (fix JWT decode)
- [ ] Friend avatars render in feed (fix field mismatch)
- [ ] Socket connected on mount (fix SocketContext)
- [ ] iOS notch: no content clipped behind safe areas
- [ ] Camera stream stops when leaving camera screen

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Swipe conflicts with native scroll in FeedScreen | Use `touch-action: pan-y` on feed, `touch-action: none` on swipe nav container |
| FriendStore consolidation breaks MessagesScreen | Audit all store consumers before switching |
| Scroll-snap momentum on iOS feels off | Add `-webkit-overflow-scrolling: touch` and test on real device |
| SocketContext fix may break reconnect logic | Preserve existing reconnect/disconnect effects, only fix publish timing |
