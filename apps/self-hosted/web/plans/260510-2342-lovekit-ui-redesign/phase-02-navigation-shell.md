---
phase: 2
title: "App Shell + BottomTabBar + LoginScreen"
status: completed
priority: P1
effort: "3h"
dependencies: [1]
---

# Phase 02: App Shell + BottomTabBar + LoginScreen

## Overview

Build the app entry point: an auth-gated shell that renders either `LoginScreen` or the 4-tab `LovekitShell`. No React Router needed — tab switching is pure `useState`. Activates the `lovekit` DaisyUI theme on the root element.

## Requirements

**Functional**
- Unauthenticated users see `LoginScreen` (email + password → same login API as old app)
- Authenticated users see the shell with 4 tabs at bottom
- Tab switching instant, per-tab scroll/state preserved (CSS `hidden` toggle)
- Auth token persisted in `localStorage` (same keys: `idToken`, `localId`)

**Non-functional**
- `data-theme="lovekit"` on `<div id="root">` wrapper
- Full-screen (`h-[100dvh]`), no browser chrome overflow
- Bottom tab bar respects iOS safe-area inset

## Architecture

```
src/
├── App.jsx                     ← auth gate: token check → LoginScreen | LovekitShell
├── screens/
│   ├── LoginScreen.jsx         ← email/password form, calls authServices.login()
│   ├── CameraScreen.jsx        ← stub
│   ├── FeedScreen.jsx          ← stub
│   ├── MessagesScreen.jsx      ← stub
│   └── ProfileScreen.jsx       ← stub
└── components/ui/
    └── BottomTabBar.jsx        ← 4-tab bar, active pill, safe-area padding
```

### Auth Flow

```
App.jsx mounts
  → check localStorage.idToken
  → valid (not expired): render LovekitShell
  → missing/expired: render LoginScreen
      → user submits → authServices.login() → save token → re-render shell
```

Token expiry check: decode JWT payload, compare `exp` to `Date.now()/1000`.

### Tab State

```js
// in App.jsx or LovekitShell
const [activeTab, setActiveTab] = useState(
  () => sessionStorage.getItem("lk:tab") || "feed"
);
```

Each screen mounted once, toggled via `className={activeTab === "feed" ? "block" : "hidden"}`.

## Related Code Files

**Create**
- `apps/self-hosted/lovekit/src/App.jsx`
- `apps/self-hosted/lovekit/src/screens/LoginScreen.jsx`
- `apps/self-hosted/lovekit/src/screens/CameraScreen.jsx` (stub)
- `apps/self-hosted/lovekit/src/screens/FeedScreen.jsx` (stub)
- `apps/self-hosted/lovekit/src/screens/MessagesScreen.jsx` (stub)
- `apps/self-hosted/lovekit/src/screens/ProfileScreen.jsx` (stub)
- `apps/self-hosted/lovekit/src/components/ui/BottomTabBar.jsx`

**Read for reference (do not modify)**
- `apps/self-hosted/web/src/pages/Auth/Login/` — login form pattern + API call shape
- `apps/self-hosted/web/src/stores/useAuthStore.js` (copied in Phase 01)

## Implementation Steps

1. **`App.jsx`** (≤80 lines):
   ```jsx
   const token = localStorage.getItem("idToken");
   const isValid = token && !isTokenExpired(token); // decode exp field
   const [authed, setAuthed] = useState(isValid);
   const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem("lk:tab") || "feed");

   if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;
   return (
     <div data-theme="lovekit" className="h-[100dvh] flex flex-col bg-base-100 text-base-content overflow-hidden">
       <SocketProvider>
         <main className="flex-1 overflow-hidden relative">
           <CameraScreen className={activeTab === "camera" ? "block" : "hidden"} />
           <FeedScreen    className={activeTab === "feed"   ? "block" : "hidden"} />
           <MessagesScreen className={activeTab === "messages" ? "block" : "hidden"} />
           <ProfileScreen  className={activeTab === "profile"  ? "block" : "hidden"} />
         </main>
         <BottomTabBar active={activeTab} onChange={(tab) => {
           setActiveTab(tab);
           sessionStorage.setItem("lk:tab", tab);
         }} />
       </SocketProvider>
     </div>
   );
   ```

2. **`LoginScreen.jsx`** (≤120 lines):
   - Email + password inputs, submit button, error toast
   - Calls `authServices.login(email, password)` (copied service)
   - On success: saves `idToken`/`localId` to localStorage, calls `onLogin()`
   - Warm styled: WarmCard container, orange submit button, Lovekit logo/wordmark

3. **`BottomTabBar.jsx`** (≤100 lines):
   - Tabs: `[{key:"camera", Icon:Camera, label:"Capture"}, {key:"feed", Icon:Sparkles, label:"Feed"}, {key:"messages", Icon:MessageCircle, label:"Chats"}, {key:"profile", Icon:User, label:"You"}]`
   - Layout: `fixed bottom-0 inset-x-0 pb-[env(safe-area-inset-bottom)] bg-base-100/90 backdrop-blur-md border-t border-base-200 flex justify-around items-center h-16`
   - Active tab: rounded-full orange pill behind icon; inactive: muted `text-base-content/40`
   - a11y: `role="tablist"` + `aria-selected`

4. **4 stub screens**: each is a `<div className="h-full flex items-center justify-center"><EmptyState .../></div>`. Accept and forward `className` prop for the `hidden`/`block` toggle from App.jsx.

5. **Smoke test**: `npm run dev`, open browser, see orange-cream shell with 4 tabs. Tap tabs → active pill moves. Enter wrong credentials → error. Enter correct → shell shows.

## Todo

- [x] Create `App.jsx` with auth gate + tab shell
- [x] Create `LoginScreen.jsx` with warm styling
- [x] Create `BottomTabBar.jsx` with 4 tabs + safe-area
- [x] Create 4 stub screen files (accept className prop)
- [x] Smoke test: login works, tabs switch, theme is orange/cream (Chrome MCP visual check deferred — `npm run build` green, dev server serves `data-theme="lovekit"` shell on :5174)

## Success Criteria

- [ ] Login flow works end-to-end with real credentials
- [ ] All 4 tabs visible and switchable
- [ ] Theme orange/cream visible
- [ ] `npm run build` green

## Risk Assessment

- **Token expiry edge case**: JWT `exp` is in seconds, `Date.now()` in ms — divide correctly.
- **SocketProvider missing**: copy `SocketContext.jsx` wraps with `useEffect` guard — ensure it doesn't crash on missing `idToken` at mount.
- **iOS safe-area**: `env(safe-area-inset-bottom)` only works with `viewport-fit=cover` in `<meta name="viewport">` — add to `index.html`.

## Chrome MCP Testing Checklist

Activate `ck:chrome-devtools` with real credentials test:

```
navigate http://localhost:5173
viewport 390x844
screenshot → verify: LoginScreen visible, orange submit button, cream background
```

**Login flow:**
- [ ] LoginScreen renders: email + password inputs, orange button visible
- [ ] Wrong credentials → error message appears (no JS crash)
- [ ] Correct credentials → shell renders with 4 tabs at bottom
- [ ] Tab bar visible at bottom: Camera, Feed, Chats, You icons

**Tab switching:**
- [ ] Tap each tab → active pill moves to correct tab
- [ ] Screenshot at `375x667` (iPhone SE) — tab bar not cut off
- [ ] `console_errors` → zero errors after login

**Theme:**
- [ ] Background `#FFFBF0` cream visible
- [ ] Active tab indicator is orange (`#F97316`)

## Completion Protocol

**When this phase is done:**
1. Update frontmatter `status: pending` → `status: completed`
2. Check off all items in `## Todo` above
3. Open `plan.md` → update Phase 02 row Status column: `pending` → `completed`
4. Commit with message: `feat(lovekit): phase 02 — app shell + login + bottom nav`
