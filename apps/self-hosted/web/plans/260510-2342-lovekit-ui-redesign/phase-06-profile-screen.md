---
phase: 6
title: "ProfileScreen (Streak Calendar + Friends + Rollcall + Settings)"
status: completed
priority: P2
effort: "4h"
dependencies: [2]
---

# Phase 06: ProfileScreen (Streak Calendar + Friends + Rollcall + Settings)

## Overview

Build `ProfileScreen` with user info header, streak calendar, friends list with rollcall status, and a settings bottom sheet (logout). Uses copied `useAuthStore`, `useFriendStore`, `useStreakStore`.

## Requirements

**Functional**
- Show current user avatar + display name + email (from `useAuthStore`)
- Streak calendar: current streak count + 7-day mini grid (copied `useStreakStore`)
- Friends list: avatar + name + last moment timestamp + rollcall status dot
- Rollcall section: friend cards waiting for response (MVP — list only, no camera trigger)
- Settings sheet: logout button (clears localStorage, sets `authed(false)`)

**Non-functional**
- Warm card layout throughout
- Streak number rendered large + amber colored
- Friends sorted by most-recently-active first

## Architecture

```
screens/ProfileScreen.jsx
components/
  StreakCalendar.jsx          ← 7-day grid + streak number
  FriendListItem.jsx          ← avatar, name, last moment, rollcall dot
  SettingsSheet.jsx           ← slide-up bottom sheet, logout
```

### Data Flow

```
ProfileScreen mounts
  → useAuthStore.currentUser (from localStorage, already hydrated)
  → useStreakStore.fetchStreak(user) → streak data
  → useFriendStore.fetchFriends(user) → friend list
  → tap gear icon → SettingsSheet opens
  → logout → localStorage.clear() → onLogout() callback → App re-renders LoginScreen
```

## Related Code Files

**Create**
- `apps/self-hosted/lovekit/src/screens/ProfileScreen.jsx`
- `apps/self-hosted/lovekit/src/components/StreakCalendar.jsx`
- `apps/self-hosted/lovekit/src/components/FriendListItem.jsx`
- `apps/self-hosted/lovekit/src/components/SettingsSheet.jsx`

**Read for reference (do not modify)**
- `apps/self-hosted/web/src/pages/LocketCameraBeta/BottomHomeScreen/ProfileView/` — existing profile pattern
- `apps/self-hosted/lovekit/src/stores/useAuthStore.js` (copied)
- `apps/self-hosted/lovekit/src/stores/useFriendStore.js` (copied)
- `apps/self-hosted/lovekit/src/stores/useStreakStore.js` (copied)

## Implementation Steps

1. **`StreakCalendar.jsx`** (≤80 lines):
   - Props: `streak` (number), `days` (array of 7 booleans for last 7 days)
   - Large amber number: `text-5xl font-bold text-primary`
   - 7-day row: `w-8 h-8 rounded-full` — filled amber if active, `bg-base-200` if not
   - Day labels: M T W T F S S below circles

2. **`FriendListItem.jsx`** (≤60 lines):
   - `FriendAvatar` (from phase 04) + friend name + `formatTimeAgo(lastMomentDate)`
   - Rollcall dot: `w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse` if rollcall pending
   - `onClick` prop (reserved — no action in MVP)

3. **`SettingsSheet.jsx`** (≤80 lines):
   - Bottom sheet `fixed inset-x-0 bottom-0 z-50`, slide-up transition
   - Overlay `fixed inset-0 bg-black/40` dismisses on tap
   - Logout button: amber, calls `localStorage.clear()` then `onLogout()`
   - Future: notification settings, theme toggle (out of scope for now)

4. **`ProfileScreen.jsx`** (≤120 lines):
   - Top section: `WarmCard` with avatar (large, 80px), display name, email
   - Gear icon button top-right → `setSettingsOpen(true)`
   - Streak section: `WarmCard` wrapping `StreakCalendar`
   - Friends section: scrollable list of `FriendListItem`
   - Rollcall section: filter friends with `rollcall_pending` → render as amber-bordered cards
   - `LoadingSkeleton variant="card"` × 3 while loading
   - `EmptyState` if no friends

5. **Wire logout back to `App.jsx`**: `ProfileScreen` receives `onLogout` prop; `App.jsx` sets `authed(false)` + `localStorage.clear()` in handler.

6. **Smoke test**: open Profile tab → see name/email → streak visible → friend list loads → tap gear → settings sheet → logout → back to login.

## Todo

- [x] StreakCalendar (7-day grid, streak number)
- [x] FriendListItem (avatar, last moment, rollcall dot)
- [x] SettingsSheet (logout, slide-up)
- [x] ProfileScreen (header, streak, friends, rollcall section)
- [x] Wire onLogout → App.jsx
- [x] Smoke test logout flow

## Success Criteria

- [ ] User avatar + name shown from stored auth
- [ ] Streak data displays (even 0 streak)
- [ ] Friend list shows real data
- [ ] Logout clears auth and returns to LoginScreen

## Risk Assessment

- **`useAuthStore` hydration**: store may need `rehydrate()` call on mount — check copied store's `persist` middleware config.
- **`useStreakStore` API shape**: verify `streak` object fields before mapping to calendar grid.
- **Rollcall data**: `useFriendStore` may not expose rollcall status directly — check `rollcall_pending` or `last_rollcall_at` field; if absent, skip rollcall section for MVP.
- **`onLogout` prop chain**: `ProfileScreen` → `App.jsx` needs explicit prop; ensure prop is passed in `App.jsx` where screens are rendered.

## Chrome MCP Testing Checklist

Activate `ck:chrome-devtools` after logging in with real credentials:

```
navigate http://localhost:5173
viewport 390x844
navigate to Profile tab (You)
screenshot → verify: user name/email, streak calendar, friend list
```

**Profile header:**
- [ ] User avatar (80px circle) + display name + email visible
- [ ] Gear icon visible top-right
- [ ] `console_errors` → zero errors on mount

**Streak calendar:**
- [ ] Large streak number visible (amber color)
- [ ] 7-day grid: filled/empty circles for each day
- [ ] Day labels (M T W T F S S) visible

**Friends list:**
- [ ] Real friends loaded (or EmptyState if no friends)
- [ ] Each item: avatar + name + last moment time

**Settings sheet:**
- [ ] Tap gear → SettingsSheet slides up from bottom
- [ ] Overlay (dim background) visible
- [ ] Logout button orange/amber colored
- [ ] Tap overlay → sheet dismisses
- [ ] Logout → localStorage cleared → LoginScreen visible

- [ ] Screenshot at 375×667: profile header not cut off

## Completion Protocol

**When this phase is done:**
1. Update frontmatter `status: pending` → `status: completed`
2. Check off all items in `## Todo` above
3. Open `plan.md` → update Phase 06 row Status column: `pending` → `completed`
4. Commit with message: `feat(lovekit): phase 06 — profile screen + streak + settings`
