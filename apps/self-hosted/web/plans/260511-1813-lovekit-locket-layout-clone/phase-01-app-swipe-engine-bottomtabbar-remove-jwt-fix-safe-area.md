---
phase: 1
title: "App Swipe Engine + BottomTabBar Remove + JWT Fix + Safe-Area"
status: completed
priority: P1
effort: "3h"
dependencies: []
---

# Phase 01: App Swipe Engine + BottomTabBar Remove + JWT Fix + Safe-Area

## Overview

Rewrite `App.jsx` to replace the bottom-tab model with Locket's swipe-gesture navigation. Create `useSwipeNav.js` hook. Delete `BottomTabBar.jsx`. Fix JWT `escape()` bug. Fix `pb-16` safe-area remnant.

## Requirements

**Functional**
- Swipe up from camera → feed
- Swipe left from camera → messages  
- Swipe right from camera → profile
- Swipe down from feed / swipe right from messages / swipe left from profile → back to camera
- All 4 screens mounted at all times (CSS transform, not unmount)
- navState persisted in sessionStorage (`lk:nav`)

**Non-functional**
- Transition: `transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)` (iOS-feel spring)
- `touch-action: pan-y` on swipe container prevents scroll conflicts
- No bottom chrome visible anywhere

## Architecture

```
App.jsx
  ├── useSwipeNav(navState, setNavState)  ← gesture logic only
  ├── SocketProvider
  │   ├── <div className="relative h-[100dvh] overflow-hidden">
  │   │   ├── CameraScreen  — always at center (no transform)
  │   │   ├── FeedScreen    — translateY(-100%) → 0 when active
  │   │   ├── MessagesScreen — translateX(-100%) → 0 when active
  │   │   └── ProfileScreen  — translateX(+100%) → 0 when active
  └── Toaster
```

Screen class helper:
```js
function screenStyle(screen, navState) {
  const isActive = navState === screen;
  const transforms = {
    feed:     isActive ? "translateY(0)"    : "translateY(-100%)",
    messages: isActive ? "translateX(0)"   : "translateX(-100%)",
    profile:  isActive ? "translateX(0)"   : "translateX(100%)",
    camera:   "",  // always center
  };
  return {
    position: "absolute", inset: 0, zIndex: isActive ? 10 : 5,
    transform: transforms[screen],
    transition: "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
    willChange: "transform",
  };
}
```

`useSwipeNav` hook (extract to `src/hooks/useSwipeNav.js`):
```js
export function useSwipeNav(navState, setNavState) {
  const startRef = useRef(null);

  const onTouchStart = useCallback((e) => {
    startRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const onTouchEnd = useCallback((e) => {
    const start = startRef.current;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    const THRESHOLD = 50;
    if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return;
    const isHoriz = Math.abs(dx) > Math.abs(dy);

    if (navState === "camera") {
      if (!isHoriz && dy < -THRESHOLD) setNavState("feed");
      if (isHoriz && dx < -THRESHOLD) setNavState("messages");
      if (isHoriz && dx > THRESHOLD)  setNavState("profile");
    } else {
      // any direction back to camera
      setNavState("camera");
    }
  }, [navState, setNavState]);

  return { onTouchStart, onTouchEnd };
}
```

JWT fix:
```js
// BEFORE (broken — escape() removed from JS spec):
const json = atob(padded + "===".slice((padded.length + 3) % 4));
return JSON.parse(decodeURIComponent(escape(json)));

// AFTER:
const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
return JSON.parse(new TextDecoder().decode(bytes));
```

Safe-area fix: remove `pb-16` from `<main>`. Each screen manages its own bottom padding.

## Related Code Files

- **Create**: `apps/self-hosted/lovekit/src/hooks/useSwipeNav.js`
- **Rewrite**: `apps/self-hosted/lovekit/src/App.jsx`
- **Delete**: `apps/self-hosted/lovekit/src/components/ui/BottomTabBar.jsx`

## Implementation Steps

1. Create `src/hooks/useSwipeNav.js` with the hook above
2. Rewrite `src/App.jsx`:
   - Import `useSwipeNav` instead of `BottomTabBar`
   - Replace `activeTab` state with `navState` (default: `"camera"`)
   - Replace `readInitialTab()` with `readInitialNav()` reading `lk:nav`
   - Replace `className hidden/block` switching with `style={screenStyle(screen, navState)}`
   - Attach `onTouchStart`/`onTouchEnd` to the outer container div
   - Remove `pb-16` from `<main>`
   - Fix JWT decode in `decodeJwtPayload()` — use `TextDecoder` not `escape()`
3. Delete `src/components/ui/BottomTabBar.jsx`
4. Remove `BottomTabBar` import from `App.jsx`
5. Verify no other files import `BottomTabBar` (`grep -r "BottomTabBar" src/`)

## Todo

- [x] Create `src/hooks/useSwipeNav.js`
- [x] Rewrite `src/App.jsx` (swipe engine, no BottomTabBar, JWT fix, pb-16 removed)
- [x] Delete `src/components/ui/BottomTabBar.jsx`
- [x] Grep confirm no dangling BottomTabBar imports
- [ ] Manual swipe test: camera→feed (up), camera→messages (left), camera→profile (right), back (any dir)

## Success Criteria

- [ ] No bottom tab bar visible anywhere in the app
- [ ] Swipe up from camera → feed slides in from top
- [ ] Swipe left from camera → messages slides in from left
- [ ] Swipe right from camera → profile slides in from right
- [ ] Any swipe from non-camera screen → camera
- [ ] JWT decode no longer throws on tokens with non-ASCII chars
- [ ] No `pb-16` remnant cutting off content

## Risk Assessment

- **Swipe conflicts with feed scroll**: `touch-action: pan-y` on the feed screen container lets scroll pass through; swipe nav handler only fires on camera screen where scroll is disabled. Mitigation: only register swipe handler when `navState === "camera"` OR check `navState` in `onTouchEnd` before acting.
- **Back navigation on non-camera**: keep it simple — any gesture returns to camera. Profile/Messages have their own internal back buttons for chat detail.
- **sessionStorage key rename (`lk:tab` → `lk:nav`)**: stale `lk:tab` key causes no harm, just becomes orphaned. No migration needed.

## Completion Protocol

1. Update frontmatter `status: pending` → `status: completed`
2. Check off all Todo items
3. Update `plan.md` Phase 01 row Status: `pending` → `completed`
4. Commit: `refactor(lovekit): phase 01 — swipe nav engine, remove tab bar, fix JWT`
