# Researcher-2: Phase 04 Codebase Scout

**Branch:** feat/fix-selfhost
**Date:** 2026-05-11
**Scope:** 8 files for Phase 04A/04B/04C bug-fix implementation

---

## 1. SocketContext.jsx (44 lines)

**Path:** `apps/self-hosted/lovekit/src/context/SocketContext.jsx`

**Provider value (line 31-36):**
```jsx
<SocketContext.Provider
  value={{
    socket: socketRef.current,
    isConnected,
  }}
>
```
**BUG:** `socket: socketRef.current` is read at render time. When socket is created inside `useEffect`, the ref mutation does NOT trigger a re-render, so consumers always see `socket: null` on first render. Even after `isConnected` flips and re-render happens, the value is stale across StrictMode double-mount. Need state-backed socket OR memoized value tied to `isConnected`.

**useEffect deps (line 28):** `[user?.uid]` — only re-runs on uid change. OK in principle, but cleanup nullifies `socketRef.current` and returning early when `!idToken || !user?.uid` skips the create path.

**useAuthStore subscription (line 8):**
```js
const { user } = useAuthStore();
```
**ISSUE:** Whole-store destructure → component re-renders on ANY zustand state change (loading, isAuth, etc.), not just `user`. Should use selector: `useAuthStore((s) => s.user)`.

**Token source:** `localStorage.getItem("idToken")` (line 13) — read once inside effect, not reactive to refresh.

---

## 2. useFriendStore.js (41 lines)

**Path:** `apps/self-hosted/lovekit/src/stores/useFriendStore.js`

**State shape:** `friendDetails: []` (array, not map).

**Friend object field names:** Source = `getAllFriendDetails()` (IndexedDB) + `fetchAndSyncFriendDetails()` (server). Field names NOT defined inline — depend on `friendsDB.js` cache + sync util. Likely `{ uid, firstName, lastName, profilePic, ... }` based on usage in `ChatDetail.jsx` lines 92, 110-111, 136 (`friend.uid`, `friend?.firstName`, `friend?.lastName`, `friend?.profilePic`).

**MessagesScreen mismatch:** `MessagesScreen.jsx` imports `useFriendStoreV2` from `@/stores/friendStore` (different store, see line 9, 23-24), accessing `friendDetailsMap` (object/map). So there are TWO friend stores:
- `useFriendStore` (this file) → array `friendDetails`
- `useFriendStoreV2` from `stores/friendStore/` directory → map `friendDetailsMap`

**loadFriends flow (line 14-31):**
1. Set `loading: true`
2. Read IndexedDB via `getAllFriendDetails()` → setState
3. Sync server via `fetchAndSyncFriendDetails()` → setState updated
4. catch → SonnerError, finally → `loading: false`

**addFriend signature (line 35-40):**
```js
addFriend: async (friend) => {
  await addFriendToCache(friend);
  set((state) => ({
    friendDetails: [...state.friendDetails, friend],
  }));
}
```
Single arg: `friend` object. Appends to array. No deduplication check.

**Other actions:** `setFriendDetails`, `clearFriends`.

---

## 3. ChatDetail.jsx (171 lines)

**Path:** `apps/self-hosted/lovekit/src/components/ChatDetail.jsx`

**Header div className (line 127):**
```jsx
<div className="shrink-0 flex items-center gap-3 px-3 py-3 border-b border-base-200 bg-base-100">
```
**BUG:** No safe-area inset padding. iOS notch/dynamic-island will cover header. Needs `pt-[env(safe-area-inset-top)]` or wrapping `pt-safe`.

**Zustand subscription (line 35-36):**
```js
const { messages, getMessagesByUser, addMessageWithUserV2 } =
  useMessagesStore();
```
**ISSUE:** Whole-store destructure. Component re-renders on every store change including `conversations`, `loading`, `hasMore`, `visibleCount`, `isLoadingMore`. Should use selectors:
```js
const messages = useMessagesStore((s) => s.messages);
const getMessagesByUser = useMessagesStore((s) => s.getMessagesByUser);
const addMessageWithUserV2 = useMessagesStore((s) => s.addMessageWithUserV2);
```

**Fields used from store:** `messages`, `getMessagesByUser`, `addMessageWithUserV2` (3 fields out of ~13).

**Container fixed positioning (line 119-125):**
```jsx
className={clsx(
  "fixed inset-0 z-40 flex flex-col bg-base-100",
  "transition-transform duration-300 ease-out",
  open && animate ? "translate-x-0" : "translate-x-full",
  className,
)}
```
Full-screen modal, slides from right. Header inside this fixed container — no top safe-area inset on container either.

**myId helper (line 10):** `const myId = () => localStorage.getItem("localId");` — called per render in `me` const + per send.

---

## 4. SettingsSheet.jsx (84 lines)

**Path:** `apps/self-hosted/lovekit/src/components/SettingsSheet.jsx`

**Logout handler (line 21-29):**
```jsx
const handleLogout = () => {
  try {
    localStorage.clear();
  } catch (err) {
    console.error("localStorage.clear failed:", err);
  }
  onLogout?.();
  onClose?.();
};
```
**BUG:** `localStorage.clear()` is nuclear — wipes ALL keys including non-auth keys (e.g., theme prefs, app config, third-party libs). Then calls `onLogout?.()` AFTER wipe. Should:
1. Use `useAuthStore.getState().clearAndlogout()` OR
2. Selectively remove auth keys: `idToken`, `localId`, `userData`, plus `removeToken()` / `clearAllDB()` from `useAuthStore`.

**Logout flow:** Clears localStorage → calls `onLogout` prop callback → calls `onClose`. Doesn't await any async cleanup. Doesn't clear IndexedDB (`clearAllDB`), doesn't clear zustand state, doesn't redirect.

**Side effects useEffect (line 7-19):** Body scroll lock + Escape key handler. OK.

---

## 5. axios.js (228 lines)

**Path:** `apps/self-hosted/lovekit/src/lib/axios.js`

**cachedExp location (line 15):** Module-level: `let cachedExp = null;` — singleton across all imports of the module.

**Token caching logic (line 16-36):**
```js
function isTokenExpired(token) {
  if (!token) return true;

  const now = Math.floor(Date.now() / 1000);

  if (!cachedExp) {
    const payload = parseJwt(token);
    if (!payload) return true;
    cachedExp = payload.exp;
  }

  const timeLeft = cachedExp - now;

  return timeLeft < 300; // < 5 phút thì coi là sắp hết hạn
}
```

**BUG:** `cachedExp` is keyed implicitly to whichever token was first parsed. If a different token is passed (e.g., post-refresh, multi-account, or just a new login), `cachedExp` retains the OLD exp because the `if (!cachedExp)` guard skips re-parse. Must:
- Cache by token string (e.g., `if (cachedToken !== token) { cachedToken = token; cachedExp = payload.exp; }`) OR
- Always parse fresh (KISS, no cache — JWT parse is cheap).

**Reset points:**
- Line 56: `cachedExp = null;` after successful refresh in `refreshIdToken()`.
- Line 81: `cachedExp = null;` in `handleLogout()`.

But no reset on initial login (other paths set `idToken` directly).

**Other concerns:**
- `isRefreshing` + `refreshPromise` race-conditioned: lines 121-128 set `isRefreshing=true`, `await refreshPromise`, then set `isRefreshing=false` and `refreshPromise=null` BEFORE checking result — concurrent requests after first awaiter completes will see `isRefreshing=false` and start ANOTHER refresh. (Out of scope for Phase 04C? Flag for review.)

---

## 6. useMessagesStore.js (207 lines)

**Path:** `apps/self-hosted/lovekit/src/stores/useMessagesStore.js`

**State shape:**
- `conversations: []` (array of conv objects, line 18)
- `messages: {}` (object/map, keyed by userId/conversationId → array of msgs, line 19)
- `loading`, `hasMore`, `visibleCount`, `isLoadingMore`

**`messages` is OBJECT/MAP**, not array. Confirmed by:
- Line 91-95: `if (messages[conversationId]?.length)` — bracket access
- Line 100-102: `messages: { ...messages, [conversationId]: local }` — spread + dynamic key
- Line 142-145: same pattern in `addMessageWithUser`

**`conversations` is ARRAY**, not map. Confirmed by:
- Line 31-33: `[...localData].sort(...)` 
- Line 53: `new Map(conversations.map((c) => [c.uid, c]))` — converts to map locally

**`removeMessage` (line 184-195) — BROKEN:**
```js
removeMessage: (msgId) => {
  const { messages, conversations } = get();
  const updatedMessages = messages.filter((m) => m.id !== msgId);
  const updatedConversations = Object.fromEntries(
    Object.entries(conversations).map(([uid, msgs]) => [
      uid,
      msgs.filter((m) => m.id !== msgId),
    ])
  );
  set({ messages: updatedMessages, conversations: updatedConversations });
},
```

**BUGS:**
1. `messages.filter(...)` — `messages` is OBJECT not array → `messages.filter is not a function` runtime crash.
2. `Object.entries(conversations).map(...)` — `conversations` is ARRAY of conv objects, not a map of `uid → msgs`. Iterating `[uid, msgs]` makes no sense; `Object.entries` of array yields `["0", convObj], ["1", convObj], ...`, then `convObj.filter` fails (no filter on plain conv).
3. State shapes are SWAPPED in author's mental model. The function appears to assume both are maps.

**Correct implementation (per actual shape):**
```js
removeMessage: (msgId) => {
  const { messages } = get();
  const next = {};
  for (const [convId, list] of Object.entries(messages)) {
    next[convId] = list.filter((m) => m.id !== msgId);
  }
  set({ messages: next });
},
```
(Conversations array is not message-bearing — just metadata. No need to touch.)

**Line 184 context:** Start of `removeMessage` function definition. Comment header `// ==== 5️⃣ Remove message ====` on line 183.

**Other actions:**
- `fetchConversations` (line 26)
- `upsertConversation` (line 52)
- `addConversation` (line 72)
- `getMessagesByUser` (line 90)
- `addMessageWithUser` (line 131)
- `addMessageWithUserV2` (line 151) — preferred, batched
- `resetVisible` / `increaseVisibleCount` (line 198, 199)

---

## 7. MessagesScreen.jsx (128 lines)

**Path:** `apps/self-hosted/lovekit/src/screens/MessagesScreen.jsx`

**Zustand subscription (line 15-21):**
```js
const {
  conversations,
  loading,
  fetchConversations,
  upsertConversation,
  addMessageWithUserV2,
} = useMessagesStore();
```
**ISSUE:** Whole-store destructure → re-render on every change including `messages` map mutations (which happen on every incoming message). Heavy. Use selectors:
```js
const conversations = useMessagesStore((s) => s.conversations);
const loading = useMessagesStore((s) => s.loading);
const fetchConversations = useMessagesStore((s) => s.fetchConversations);
const upsertConversation = useMessagesStore((s) => s.upsertConversation);
const addMessageWithUserV2 = useMessagesStore((s) => s.addMessageWithUserV2);
```

Adjacent V2 friend store DOES use selectors correctly (line 23-24):
```js
const friendDetailsMap = useFriendStoreV2((s) => s.friendDetailsMap);
const loadFriends = useFriendStoreV2((s) => s.loadFriends);
```
So pattern is established — just inconsistent.

**Fields used:** `conversations`, `loading`, `fetchConversations`, `upsertConversation`, `addMessageWithUserV2` (5 of ~13).

**Socket usage:** `useSocket()` line 25 → `{ socket }`. Effects on line 34-58 register `new_on_list_message`, `new_message_with_user` listeners and emit `get_list_message`. Will break if `socket` is null on initial render (see SocketContext bug above) — effect re-runs only on socket identity change.

**Line ~21 exact code:** `} = useMessagesStore();` (closing of destructure on line 21 + 22).

---

## 8. useAuthStore.js (125 lines)

**Path:** `apps/self-hosted/lovekit/src/stores/useAuthStore.js`

**Logout action — EXISTS as `clearAndlogout` (line 115-124):**
```js
clearAndlogout: async () => {
  await logout();
  removeToken();
  await clearAllDB();
  localStorage.removeItem(CACHE_KEY); // xóa cache khi logout
  set({
    user: null,
    isAuth: false,
  });
},
```
**Naming note:** lowercase `l` in `logout` mid-name (`clearAndlogout`, not `clearAndLogout`). Likely typo, but search-and-replace risk.

**Flow:**
1. `await logout()` — server-side logout (from `@/services`)
2. `removeToken()` — utility
3. `await clearAllDB()` — IndexedDB wipe
4. `localStorage.removeItem("userData")` — cache wipe (note: only `userData` key, NOT `idToken`/`localId` — those rely on `removeToken()`)
5. `set({ user: null, isAuth: false })`

**No `clearAuth` action.** No standalone `logout` action. Only `clearAndlogout`.

**Other actions:**
- `hydrate` (line 22) — sync init from localStorage
- `init` (line 50) — async init w/ cache + GetUserLocket
- `fetchUserData` (line 100) — partial impl (sets loading but doesn't store result)

**State:** `user`, `isAuth`, `loading`. No `clearAuth` setter.

**Recommendation for SettingsSheet logout:** Pass `useAuthStore.getState().clearAndlogout` as `onLogout` prop, OR call directly inside `handleLogout` and remove the manual `localStorage.clear()`.

---

## Summary of bugs + targeted fixes

| File | Bug | Fix |
|------|-----|-----|
| SocketContext.jsx | `socket: socketRef.current` not reactive | Hold socket in `useState`; whole-store destructure → selector |
| useFriendStore.js | (Note) `MessagesScreen` uses different `useFriendStoreV2` w/ map shape | Confirm intent — keep both? consolidate? |
| ChatDetail.jsx | No safe-area top padding; whole-store destructure | Add `pt-[env(safe-area-inset-top)]` to header or container; use selectors |
| SettingsSheet.jsx | `localStorage.clear()` nukes everything | Call `clearAndlogout` from auth store |
| axios.js | `cachedExp` keyed implicitly to first token | Track `cachedToken` alongside `cachedExp`, or skip cache |
| useMessagesStore.js | `removeMessage` assumes wrong shapes; crashes | Rewrite per actual `messages: object` shape |
| MessagesScreen.jsx | Whole-store destructure → over-render | Use selectors |
| useAuthStore.js | `clearAndlogout` typo + name | (Optional) rename to `clearAndLogout` w/ codebase grep |

---

## Unresolved questions

1. **Friend store split:** Why two stores (`useFriendStore` array vs `useFriendStoreV2` map)? Migration in progress, or different concerns? Phase 04A says "useFriendStore field normalization" — does that mean unify into V2, or normalize fields inside V1?
2. **`clearAndlogout` typo:** Rename to `clearAndLogout`? Risk: any other callers in codebase. Out of scope?
3. **axios refresh-token race:** `isRefreshing=false` set BEFORE result check (lines 127-131) — concurrent requests after first awaiter resolves can re-trigger refresh. Fix scope = Phase 04C, or defer?
4. **SocketContext StrictMode:** Effect cleanup nullifies `socketRef.current = null`, then re-mount creates new socket — but provider already memoized stale `null` on first render. Fix needs `useState` for socket. Confirm.
5. **MessagesScreen `addMessageWithUserV2` from socket:** if `messages` map is a selector, dependency array on line 58 keeps current ref stable across re-renders — verify no listener-leak after selector refactor.

**Status:** DONE
**Summary:** Scouted all 8 files; documented exact bug locations, line numbers, code snippets, and field shapes for Phase 04A/04B/04C devs.
