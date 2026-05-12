---
phase: 7
title: "Empty States + Loading Skeletons + Polish"
status: completed
priority: P3
effort: "2h"
dependencies: [3, 4, 5, 6]
---

# Phase 07: Empty States + Loading Skeletons + Polish

## Overview

Final polish pass across all screens: consistent empty states, skeleton loading variants, error toasts, PWA manifest + icons, and a quick mobile device smoke test. Zero new features — only quality and consistency.

## Requirements

**Functional**
- `EmptyState` renders correctly in: Feed (no moments), Messages (no conversations), Profile (no friends)
- `LoadingSkeleton` `feed` variant renders stacked card-shaped pulses
- Error boundary or `sonner` toast on failed API calls
- PWA manifest with app name, icons, `display: standalone`, `theme_color: #F97316`

**Non-functional**
- Consistent 24px horizontal padding across all screens
- Font renders: Plus Jakarta Sans loaded (check via DevTools)
- No layout overflow on iPhone SE (375px wide)
- Bottom tab bar does not overlap content on Safari iOS

## Checklist by Screen

### Feed
- [ ] `EmptyState icon=Sparkles title="No moments yet" subtitle="Your friends haven't posted today"`
- [ ] Skeleton: 3× stacked card pulses (avatar row + square + caption row)
- [ ] Error toast if `fetchMoments` throws

### Messages
- [ ] `EmptyState icon=MessageCircle title="No conversations" subtitle="Send a moment to start chatting"`
- [ ] Skeleton: 4× conversation item pulses (circle + two lines)
- [ ] Error toast if `fetchConversations` throws

### Profile
- [ ] `EmptyState icon=Users title="No friends yet" subtitle="Add friends to see them here"` (friends section only)
- [ ] Skeleton: header card pulse + streak card pulse + 3× list item pulses

### Camera
- [ ] Error state if `getUserMedia` is denied: `EmptyState icon=CameraOff title="Camera access denied" subtitle="Enable camera in browser settings"`

## PWA Manifest

Create `apps/self-hosted/lovekit/public/manifest.json`:
```json
{
  "name": "Lovekit",
  "short_name": "Lovekit",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FFFBF0",
  "theme_color": "#F97316",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Icons: simple amber circle with white "L" lettermark. Generate with ImageMagick or place placeholder PNGs.

## Polish Items

1. **Spacing audit**: each screen's top padding must account for status bar (use `pt-safe` or `pt-4`).
2. **Tap targets**: all buttons ≥ 44×44px (iOS HIG minimum).
3. **Input zoom fix**: verify `maximum-scale=1` in `index.html` viewport meta prevents zoom on input focus.
4. **Sonner toaster**: add `<Toaster position="top-center" richColors />` to `App.jsx` root.
5. **Active tab persistence**: verify `sessionStorage.getItem("lk:tab")` survives page refresh.
6. **`npm run build` clean**: zero warnings, bundle < 500KB gzipped.

## Related Code Files

**Create**
- `apps/self-hosted/lovekit/public/manifest.json`
- `apps/self-hosted/lovekit/public/icons/icon-192.png` (placeholder)
- `apps/self-hosted/lovekit/public/icons/icon-512.png` (placeholder)

**Modify**
- `apps/self-hosted/lovekit/src/App.jsx` — add `<Toaster>`
- `apps/self-hosted/lovekit/src/components/ui/LoadingSkeleton.jsx` — verify `feed` + `avatar` variants complete
- `apps/self-hosted/lovekit/src/components/ui/EmptyState.jsx` — verify all icon props work

## Implementation Steps

1. Audit `EmptyState.jsx` — ensure it accepts any Lucide icon component, renders amber gradient blob behind it.
2. Audit `LoadingSkeleton.jsx` — add/verify variants: `feed` (3 stacked cards), `list` (4 rows), `avatar` (circle).
3. Add `<Toaster />` from `sonner` to `App.jsx`.
4. Wrap `fetchMoments`, `fetchConversations`, `fetchFriends` calls in try/catch → `toast.error(message)` on failure.
5. Create `public/manifest.json` + placeholder PNG icons (solid amber square).
6. `npm run build` → check output size, fix any remaining warnings.
7. Open on real iPhone Safari: check font, safe-area, tab bar, camera permission flow.

## Todo

- [x] EmptyState audit + fix all screens
- [x] LoadingSkeleton variants complete
- [x] Sonner toaster in App.jsx
- [x] Error toasts on all data fetches
- [x] PWA manifest + icons
- [x] `npm run build` green, < 500KB
- [ ] Mobile device smoke test (iPhone Safari) — deferred (manual test by QA)

## Success Criteria

- [ ] `npm run build` succeeds with zero errors
- [ ] All screens have empty state + loading state
- [ ] PWA installable (Add to Home Screen works on iOS)
- [ ] No content hidden behind bottom tab bar on any screen

## Risk Assessment

- **Icons missing blocks PWA install**: placeholder solid-color PNGs are sufficient for installability — no need for polished artwork.
- **`sonner` not in deps**: add to `package.json` if `npm run build` errors on it.
- **Safe-area on Android**: `env(safe-area-inset-bottom)` returns 0 on Android — bottom tab bar padding falls back to static `pb-4`, acceptable.

## Chrome MCP Testing Checklist

**Full regression sweep** — activate `ck:chrome-devtools`, test ALL 4 tabs:

```
navigate http://localhost:5173
viewport 390x844
screenshot each tab (Camera, Feed, Messages, Profile)
viewport 375x667
screenshot each tab (iPhone SE regression)
```

**Empty states:**
- [ ] Clear localStorage → reload → Feed shows EmptyState (Sparkles icon, warm message)
- [ ] Clear conversations → Messages shows EmptyState (MessageCircle icon)
- [ ] Profile with no friends → friends section shows EmptyState (Users icon)
- [ ] Revoke camera → Camera tab shows EmptyState (CameraOff icon)

**Loading skeletons:**
- [ ] On slow connection (DevTools throttle to "Slow 3G"): Feed shows card pulse skeletons
- [ ] Messages shows conversation item pulse skeletons
- [ ] Profile shows multi-section pulse skeletons

**Error toasts:**
- [ ] Simulate network failure (DevTools offline mode) → toast appears with error message
- [ ] Toast disappears after timeout (not permanent)
- [ ] `console_errors` → no uncaught errors during error state

**Final build check:**
- [ ] `npm run build` → zero errors, zero warnings
- [ ] Bundle size ≤ 500KB gzipped (check build output)
- [ ] PWA: Lighthouse PWA score ≥ 90 in Chrome DevTools

**Cross-viewport check:**
- [ ] 390×844 (iPhone 14): all tabs OK, no overflow
- [ ] 375×667 (iPhone SE): tab bar not overlapping content on any screen
- [ ] 414×896 (iPhone 11): no layout breaks

## Completion Protocol

**When this phase is done (final phase = project complete):**
1. Update frontmatter `status: pending` → `status: completed`
2. Check off all items in `## Todo` above
3. Open `plan.md` → update Phase 07 row Status column: `pending` → `completed`
4. Open `plan.md` → update top-level `status: in-progress` → `status: completed`
5. Commit with message: `feat(lovekit): phase 07 — polish + PWA + empty states complete`
6. Tag: `git tag lovekit-v1.0`
