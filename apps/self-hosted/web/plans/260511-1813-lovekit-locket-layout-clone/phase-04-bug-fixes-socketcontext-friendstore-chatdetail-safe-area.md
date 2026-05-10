---
phase: 4
title: "Bug Fixes — SocketContext + FriendStore + ChatDetail + SettingsSheet + axios + useMessagesStore + Zustand selectors"
status: pending
priority: P1
effort: "4h"
dependencies: []
---

# Phase 04: Bug Fixes — 7 Critical Fixes

## Overview

Fix 7 critical bugs identified by reviewers (R2, R3, R1): (1) SocketContext stale socket, (2) FriendStore field mismatch, (3) ChatDetail safe-area, (4) SettingsSheet nukes localStorage on logout, (5) axios.js module-level `cachedExp` never resets between sessions, (6) `useMessagesStore.removeMessage` crashes (`.filter` on object), (7) Zustand whole-store subscriptions causing re-render storms.

## Requirements

**Functional**
- `useSocket()` returns live socket reference, not always-null
- Friend avatars render correctly in FeedScreen and MessagesScreen
- ChatDetail back button / header is not hidden under iOS notch
- Logout only clears auth keys, not all client caches
- `cachedExp` resets to 0 on logout so next session gets fresh token evaluation
- `removeMessage` does not crash when invoked
- Zustand subscriptions use selectors — no full-store re-renders

**Non-functional**
- `useFriendStore` V1 and V2 coexist in `stores/index.js` — no breaking changes to existing callers
- SocketContext change must not break reconnect/disconnect logic

## Architecture

### Fix 1 — SocketContext stale socket

**Root cause**: `SocketContext.Provider value={{ socket: socketRef.current }}` is computed at render time. `socketRef.current` is `null` at first render; after the `useEffect` sets it, React doesn't re-render `Provider` (ref mutations don't trigger re-renders).

**Fix**: Add a `socket` state alongside the ref:
```jsx
const [socket, setSocket] = useState(null);

useEffect(() => {
  const idToken = localStorage.getItem("idToken");
  if (!idToken || !user?.uid) return;

  const s = createSocket(idToken, {
    onConnect: () => setIsConnected(true),
    onDisconnect: () => setIsConnected(false),
    onError: () => setIsConnected(false),
  });
  socketRef.current = s;
  setSocket(s);  // ← triggers re-render, consumers get live reference

  return () => {
    s.disconnect();
    socketRef.current = null;
    setSocket(null);
  };
}, [user?.uid]);

// Provider value uses socket state (not socketRef.current):
<SocketContext.Provider value={{ socket, isConnected }}>
```

### Fix 2 — FriendStore field normalization

**Root cause**: `useFriendStore` V1 (at `src/stores/useFriendStore.js`) stores raw API fields (`profile_picture_url`, `first_name`, `last_name`, etc.). `useFriendStoreV2` (at `src/stores/friendStore/index.js`) stores normalized camelCase. `FeedScreen` uses V1; `MomentCard`/`FriendAvatar` read `friend.profilePic` (camelCase).

**Fix options**:
1. Normalize in V1 store at `setFriendDetails` call — add mapper `toNormalized(f)` that converts `profile_picture_url → profilePic`, `first_name → firstName`, etc.
2. Add normalization to `getAllFriendDetails()` in `friendsDB.js`

**Chosen**: Option 1 (minimal blast radius — only touches V1 store).

Normalization mapper:
```js
function normalizeFriend(f) {
  return {
    ...f,
    profilePic: f.profilePic ?? f.profile_picture_url ?? null,
    firstName: f.firstName ?? f.first_name ?? "",
    lastName: f.lastName ?? f.last_name ?? "",
    displayName: f.displayName ?? `${f.first_name ?? ""} ${f.last_name ?? ""}`.trim(),
  };
}
```
Apply in `loadFriends` after both local and server fetches: `set({ friendDetails: updated.map(normalizeFriend) })`.

### Fix 3 — ChatDetail safe-area top

**Root cause**: `ChatDetail.jsx:127` header div has `py-3` but no `pt-[env(safe-area-inset-top)]`. On iPhone with Dynamic Island or notch, the header is hidden behind the status bar.

**Fix**: Change header div className to include `pt-[max(0.75rem,env(safe-area-inset-top))]` (keeps at least 0.75rem padding, bumps up to safe-area on notched phones).

```jsx
// BEFORE:
<div className="shrink-0 flex items-center gap-3 px-3 py-3 border-b border-base-200 bg-base-100">

// AFTER:
<div className="shrink-0 flex items-center gap-3 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] border-b border-base-200 bg-base-100">
```

## Related Code Files

- **Modify**: `apps/self-hosted/lovekit/src/context/SocketContext.jsx`
- **Modify**: `apps/self-hosted/lovekit/src/stores/useFriendStore.js`
- **Modify**: `apps/self-hosted/lovekit/src/components/ChatDetail.jsx` (line ~127)
- **Modify**: `apps/self-hosted/lovekit/src/components/SettingsSheet.jsx` (line ~23)
- **Modify**: `apps/self-hosted/lovekit/src/lib/axios.js` (line ~15)
- **Modify**: `apps/self-hosted/lovekit/src/stores/useMessagesStore.js` (line ~184)
- **Modify**: `apps/self-hosted/lovekit/src/screens/MessagesScreen.jsx` — add selectors

## Implementation Steps

1. **Fix SocketContext** (`src/context/SocketContext.jsx`):
   - Add `const [socket, setSocket] = useState(null)`
   - In `useEffect`, after `createSocket(...)`, call `setSocket(s)`
   - In cleanup, call `setSocket(null)`
   - Change `Provider value` from `{ socket: socketRef.current, isConnected }` to `{ socket, isConnected }`
   - Keep `socketRef` for internal use (event handlers, cleanup)

2. **Fix useFriendStore V1** (`src/stores/useFriendStore.js`):
   - Add `normalizeFriend(f)` mapper above the store definition
   - In `loadFriends`, wrap both `set({ friendDetails: ... })` calls with `.map(normalizeFriend)`
   - In `addFriend(friend)`, normalize before pushing

3. **Fix ChatDetail safe-area** (`src/components/ChatDetail.jsx`):
   - Search for `flex items-center gap-3 px-3 py-3 border-b border-base-200`
   - Replace `py-3` with `pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]`

4. **Fix SettingsSheet logout** (`src/components/SettingsSheet.jsx:23`):
   - Replace `localStorage.clear()` with targeted key removal using `useAuthStore`'s `logout`/`clearAuth` action
   - Only remove: `idToken`, `localId`, `refreshToken`, `sessionStorage:lk:nav`
   - Do NOT clear: theme, deviceId, IndexedDB caches

5. **Fix axios.js cachedExp** (`src/lib/axios.js:15`):
   - Move `cachedExp` from module-level to inside the interceptor closure, OR
   - Export a `resetTokenCache()` function and call it from `useAuthStore.logout`
   - Preferred: export `resetTokenCache` + call on logout (minimal change)
   ```js
   let cachedExp = 0;
   export function resetTokenCache() { cachedExp = 0; }
   ```

6. **Fix useMessagesStore.removeMessage** (`src/stores/useMessagesStore.js:184`):
   - Read the actual current implementation to understand the shape mismatch
   - `messages` is stored as an object (map keyed by uid or msgId) but `removeMessage` calls `.filter` on it
   - Fix to use `Object.fromEntries(Object.entries(state.messages).filter(...))` pattern
   - Confirm the key structure before writing the fix

7. **Fix Zustand whole-store subscriptions** (3 files):
   - `SocketContext.jsx`: `useAuthStore()` → `useAuthStore((s) => s.user)` (already fixed in step 1, but confirm)
   - `MessagesScreen.jsx:21`: replace `useMessagesStore()` with `useMessagesStore((s) => s.conversations)`
   - `ChatDetail.jsx:36`: replace whole-store subscription with specific selectors for `messages`, `sendMessage`, `markRead`

## Todo

- [ ] Fix SocketContext: socket state + Provider value
- [ ] Fix useFriendStore V1: normalizeFriend mapper
- [ ] Fix ChatDetail: safe-area top padding
- [ ] Fix SettingsSheet: targeted key removal instead of localStorage.clear()
- [ ] Fix axios.js: export resetTokenCache(), call from logout
- [ ] Fix useMessagesStore.removeMessage: correct filter on messages object
- [ ] Fix MessagesScreen + ChatDetail: add Zustand selectors (stop whole-store subscriptions)
- [ ] Verify: logout → friend cache still in IndexedDB (not wiped)
- [ ] Verify: login as user A, logout, login as user B → no stale token decisions
- [ ] Verify: MessagesScreen no re-render storm (check React DevTools if available)

## Success Criteria

- [ ] `useSocket().socket` is non-null after login
- [ ] Friend avatars render in FeedScreen
- [ ] ChatDetail header visible above iOS notch
- [ ] Logout does not clear IndexedDB / theme / deviceId
- [ ] `cachedExp` resets on logout (no stale exp after re-login)
- [ ] `removeMessage` does not throw when invoked
- [ ] MessagesScreen / ChatDetail use selectors (no whole-store subscription)

## Risk Assessment

- **SocketContext state vs ref**: consumers re-render when socket created/destroyed — correct behavior. Verify `useChatSocket.js` handles `socket = null`.
- **FriendStore normalization double-apply**: `profilePic ?? profile_picture_url` is idempotent — safe.
- **ChatDetail line number drift**: search for exact string rather than trusting line number.
- **SettingsSheet logout**: check if `useAuthStore` already has a `logout` action that clears auth keys. If not, call the individual key removals listed in step 4.
- **axios.js resetTokenCache**: if `resetTokenCache` is not called from `useAuthStore.logout`, the fix is incomplete. Grep for all logout call sites and add the call.
- **useMessagesStore shape**: must read `useMessagesStore.js` before writing fix — messages object key structure varies by implementation.

## Completion Protocol

1. Update frontmatter `status: pending` → `status: completed`
2. Check off all Todo items
3. Update `plan.md` Phase 04 row
4. Commit: `fix(lovekit): phase 04 — socket, friend store, safe-area, logout, token cache, messages`
