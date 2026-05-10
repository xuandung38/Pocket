---
phase: 5
title: "Polish + Smoke Test"
status: pending
priority: P2
effort: "2h"
dependencies: [1, 2, 3, 4]
---

# Phase 05: Polish + Smoke Test

## Overview

Integration pass after phases 01–04. Fix any visual regressions, verify all swipe gestures, run Chrome DevTools smoke test at iPhone 14 (390×844) and iPhone SE (375×667) viewports.

## Requirements

**Functional**
- All 4 swipe directions work from camera
- Back gesture works from all 3 side screens
- Login → camera → swipe through all screens → no crashes

**Non-functional**
- No JS console errors on any screen
- No network 4xx/5xx on initial load
- No content hidden under safe areas on either viewport
- Transition animation feels smooth (no jank, no flash)

## Architecture

Polish targets identified during dev pass:
- Transition z-index stacking: active screen at z-10, inactive at z-5 — verify no flicker
- `will-change: transform` on all 4 screen containers (set in Phase 01's `screenStyle()`)
- FriendMomentRow horizontal scrollbar: add `scrollbar-none` utility (Tailwind plugin or manual `[&::-webkit-scrollbar]:hidden`)
- Swipe-up hint: verify localStorage dismissal works (appears once, gone on reload after first swipe)
- Camera stream on back-navigate: if user swipes to feed then back to camera, stream should resume. `CameraPreview` should restart on `isActive → true` transition.

## Related Code Files

- **Modify as needed**: any file from phases 01–04 based on smoke test findings
- **Read**: Chrome DevTools screenshots / console output

## Implementation Steps

1. Start dev server (`cd apps/self-hosted/lovekit && npm run dev`)
2. Open Chrome DevTools → set viewport 390×844
3. Run smoke test sequence:
   - Login screen → login
   - Camera screen: verify bg-base-100, rounded square preview, FriendMomentRow visible
   - Swipe up → feed: fullscreen slides, friend overlays, reactions
   - Swipe down → camera
   - Swipe left → messages: slide from left, back-swipe returns to camera
   - Swipe right → profile: slide from right, back-swipe returns to camera
   - Open a conversation → ChatDetail: verify header above notch
   - Check console: zero red errors
4. Repeat at 375×667 (iPhone SE):
   - FriendMomentRow scrolls horizontally without overflow
   - Camera preview rounded square fits within screen
   - No bottom overlap
5. Fix any issues found
6. Final commit

## Todo

- [ ] Dev server up and running
- [ ] Smoke test at 390×844: all swipes, all screens, no console errors
- [ ] Smoke test at 375×667: no overflow, no hidden content
- [ ] Fix FriendMomentRow scrollbar (add `[&::-webkit-scrollbar]:hidden`)
- [ ] Verify camera stream resumes after back-navigate from feed
- [ ] Fix any z-index/transition regressions found during smoke test
- [ ] Final build check: `npm run build` passes with no errors

## Success Criteria

- [ ] Zero console errors on any screen at both viewports
- [ ] All 4 navigation swipes work as designed
- [ ] `npm run build` exits 0
- [ ] FriendMomentRow horizontal scrollbar hidden
- [ ] Camera stream resumes after back-navigate

## Risk Assessment

- **Camera stream restart**: `CameraPreview` may need explicit restart logic when `isActive` flips from false→true. Check `CameraPreview.jsx` `useImperativeHandle` for `startStream()` method. If absent, add it alongside `stopStream`.
- **Transition flash on cold load**: first render, non-camera screens start at off-screen position. If JS loads slowly, user may see a flash of them. Mitigate: use `visibility: hidden` in addition to transform for inactive screens, flip to `visible` once mounted.
- **Firefox/Android**: swipe gestures use touch events — works on mobile Chrome/Safari. Firefox on Android may behave differently. Out of scope for PWA targeting iOS/Chrome-Android.

## Completion Protocol

1. Update frontmatter `status: pending` → `status: completed`
2. Check off all Todo items
3. Update `plan.md` Phase 05 row Status: `pending` → `completed`
4. Update `plan.md` top-level `status: pending` → `status: completed`
5. Commit: `feat(lovekit): phase 05 — polish and smoke test pass`
