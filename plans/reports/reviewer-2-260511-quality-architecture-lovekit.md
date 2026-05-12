# reviewer-2 — Code Quality + Architecture + DX Audit (Lovekit)

Date: 2026-05-11
Branch: feat/fix-selfhost
Scope: apps/self-hosted/lovekit/src/**

## Summary by Severity

| Severity | Count |
|----------|-------|
| CRITICAL | 3 |
| IMPORTANT | 9 |
| MODERATE | 8 |

---

## CRITICAL

**[CRITICAL] SocketContext exposes stale `null` socket to consumers** — `apps/self-hosted/lovekit/src/context/SocketContext.jsx:9-39` — `socketRef.current = createSocket(...)` is set inside `useEffect`. The provider value object `{ socket: socketRef.current, isConnected }` is built at render time, so the FIRST render publishes `socket: null`. The effect then assigns `socketRef.current` but does NOT trigger a re-render — `useState` is only set on connect events. Consumers (`MessagesScreen.jsx:25`, `useChatSocket` callers) destructure `socket` from context and may read `null` even after connection. The `setIsConnected(true)` callback eventually flushes state and re-publishes the value, but anything that runs in useEffect dependent on `socket` after first render will silently no-op until reconnect. Fix: store `socket` in `useState` (not just ref), or memoize the value off `isConnected`/socket state.

**[CRITICAL] `useFriendStore` (legacy) returns snake_case fields, components mix camelCase/snake_case** — `apps/self-hosted/lovekit/src/stores/useFriendStore.js:14-30` returns raw `getAllFriendDetails()` data (snake_case `profile_picture_url`, `first_name`, `last_name`). But `FeedScreen.jsx:23` consumes from this store and passes friends through `friendMap[m.user]` to `MomentCard.jsx:74`/`MomentViewer.jsx:121`, both of which read `friend?.profilePic` (camelCase, normalized). Result: avatars never render in feed/viewer for friends loaded via legacy store. `FriendListItem.jsx:34` correctly reads `profile_picture_url`, but `ConversationItem.jsx:69`/`ChatDetail.jsx:136`/`FriendPickerSheet.jsx:21` (which use `useFriendStoreV2` with normalized data) read `profilePic`. Pick one shape and migrate all consumers — recommend `useFriendStoreV2` (normalized) everywhere and delete `useFriendStore`.

**[CRITICAL] Two parallel friend stores in production code** — `apps/self-hosted/lovekit/src/stores/useFriendStore.js` (V1) vs `apps/self-hosted/lovekit/src/stores/friendStore/index.js` (V2). FeedScreen + ProfileScreen consume V1; CameraScreen, MessagesScreen, FriendPickerSheet consume V2. Both call `loadFriends()` independently → duplicate network calls on app boot, two divergent caches, divergent shapes (V1 raw, V2 normalized). Bug-prone and confusing. Pick V2 (it has the better shape + map index), migrate the two screens, delete V1.

---

## IMPORTANT

**[IMPORTANT] `useMomentsStoreV2.js` 453 lines with near-duplicate `fetchMoments` and `reloadMoments`** — `apps/self-hosted/lovekit/src/stores/useMomentsStoreV2.js:49-222`. The two methods are ~95% identical (only diff: `fetchMoments` shows toast on error, `reloadMoments` swallows). Violates DRY + 200-line file rule. Extract a private helper `_loadAndSync(key, selectedFriendUid, { onError })` and have both methods call it.

**[IMPORTANT] Whole-store subscription causes unnecessary re-renders** —
- `MessagesScreen.jsx:15-21` — `const { conversations, loading, fetchConversations, upsertConversation, addMessageWithUserV2 } = useMessagesStore();` subscribes to entire store → re-renders on any field change including `messages` map mutations.
- `ChatDetail.jsx:35-36` — same pattern with `useMessagesStore()`. ChatDetail re-renders every time any conversation receives a message anywhere.
- `SocketContext.jsx:8` — `const { user } = useAuthStore();` re-runs Provider on any auth field change.
- `AppContext.jsx:14-17` — calls `useNavigation()`, `useCamera()`, `useLoading()`, `usePost()` without selectors.

Fix with selectors: `useMessagesStore((s) => s.conversations)` etc. Or use `useShallow` (zustand v5) for picking multiple fields.

**[IMPORTANT] `ProfileScreen` uses empty deps with `eslint-disable` in critical effect** — `apps/self-hosted/lovekit/src/screens/ProfileScreen.jsx:33-42`. Effect calls `hydrate`, `initAuth`, `initStreak`, `syncStreak`, `loadFriends` — but deps are silenced. If user logs out and re-logs in (component remounts in same session via `setAuthed(true/false)`), the `!user` guard makes hydrate re-run only when user resets. Fine for now, but the silenced lint hides a stale-closure foot-gun. Replace with explicit deps `[user, hydrate, initAuth, initStreak, syncStreak, loadFriends]` or use stable refs from store.

**[IMPORTANT] App.jsx tab persistence collides with login flow** — `apps/self-hosted/lovekit/src/App.jsx:32-45`. `readInitialTab()` reads from `sessionStorage` once at mount. If user logs out and re-logs in within the same tab, `useState(readInitialTab)` is NOT recomputed (it runs once per component instance) — but logout doesn't unmount App.jsx, only re-renders the LoginScreen branch. New auth users will land on the previous user's last tab. Acceptable, but worth flagging.

**[IMPORTANT] `App.jsx` `decodeJwtPayload` uses deprecated `escape()` and pads incorrectly** — `apps/self-hosted/lovekit/src/App.jsx:11-21`. `escape()` is removed from modern JS spec (still polyfilled in browsers but flagged). Padding logic: `padded + "===".slice((padded.length + 3) % 4)` — for length%4===0 this slices `"==="` leaving 3 trailing `=`, which is invalid base64. Use `atob` with proper padding: `padded.padEnd(Math.ceil(padded.length/4)*4, "=")`. Replace `escape(json)` with `decodeURIComponent(escape(json))` alternative: `new TextDecoder().decode(Uint8Array.from(atob(padded), c => c.charCodeAt(0)))` for unicode safety.

**[IMPORTANT] `useChatSocket.js` (deprecated) still in tree as dead code** — `apps/self-hosted/lovekit/src/hooks/useChatSocket.js:1-94`. Header comment says "Deprecated — do not consume in new code." If nothing imports it, delete it (verified: zero imports outside file). Otherwise it ships in the bundle as dead weight.

**[IMPORTANT] CameraPreview drops camera permission errors silently when `active=false`** — `apps/self-hosted/lovekit/src/components/CameraPreview.jsx:27-29`. `if (!active) return undefined;` skips effect — but parent CameraScreen passes `active={true}` always (line 112), so this isn't currently a bug. However, when CameraScreen is hidden via `display:none` (App.jsx:78-79 keeps all screens mounted), the camera stream stays alive on every other tab — no battery/privacy benefit. Pass `active={activeTab === "camera"}` from App.jsx and add proper teardown.

**[IMPORTANT] CameraScreen never tears down camera when tab switches away** — `apps/self-hosted/lovekit/src/screens/CameraScreen.jsx:110-115`. Always renders `<CameraPreview ref={previewRef} active facingMode="user" />`. Combined with App.jsx mounting all tabs at once (just toggling `block`/`hidden`), the camera mediaStream is held forever. Privacy + battery concern on mobile PWA. Same fix as above.

**[IMPORTANT] `useUploadPostStore.runQueue` race condition window** — `apps/self-hosted/lovekit/src/stores/useUploadPostStore.js:76-90`. Guard `if (get().isQueueRunning) return;` then `set({ isQueueRunning: true })` is two non-atomic operations. If two `enqueueUploadItem` calls happen in the same microtask (e.g., user double-taps post), both pass the guard, both set `isQueueRunning: true`, both enter the while loop. The DB-status filter `loadUploadItemsByStatus(QUEUED)` may protect against double-uploading, but the loop logic relies on `await` flushing one at a time — re-entrancy could still process the same item twice if DB write hasn't committed. Use a mutex flag set synchronously inside the same `set()` call: read+set in one `set((s) => ({...}))` callback.

---

## MODERATE

**[MODERATE] DRY: three inline `Avatar` components for friends/users** — `ConversationItem.jsx:5-40`, `ChatDetail.jsx:12-22` (`HeaderAvatar`), `FriendPickerSheet.jsx:6-27` (`Avatar`), plus inline `<div>` avatar in `ProfileScreen.jsx:73-86`. A canonical `FriendAvatar` already exists at `apps/self-hosted/lovekit/src/components/FriendAvatar.jsx` and is used by `FriendListItem`, `MomentCard`, `MomentViewer`. Replace all three inline implementations with `<FriendAvatar size="sm|md|lg" src={...} name={...} unread={...} />`. Add a `lg` variant if needed for the 56px conversation avatar (currently SIZE.lg = 56px ✓ already supported).

**[MODERATE] Files exceed 200-line project rule** —
- `useMomentsStoreV2.js` — 453 lines (see DRY finding above)
- `CameraScreen.jsx` — 242 lines
- `axios.js` — 228 lines (legacy, not in critical path)
- `useUploadPostStore.js` — 227 lines
- `CaptureButton.jsx` — 227 lines
- `useMessagesStore.js` — 207 lines
- `FriendPickerSheet.jsx` — 207 lines

CaptureButton can extract `pickMimeType`/`drawSquareFrame`/recording state into a `useMediaCapture(getVideo)` hook. CameraScreen can extract the bottom-control bar into `<CaptureControls phase=… />`.

**[MODERATE] Vietnamese comments + emoji decoration in stores** — `useAuthStore.js`, `useMomentsStoreV2.js`, `useStreakStore.js`, `useUploadPostStore.js`, `useMessagesStore.js`. `// 1️⃣ HYDRATE – sync, render ngay`, `// ❌ duplicate`, etc. Project comment language is already English elsewhere — pick one. The decorative emojis hurt diff readability and grep noise.

**[MODERATE] `usePost.js` is a legacy `useState` bag, not a Zustand store** — `apps/self-hosted/lovekit/src/stores/usePost.js:13-90`. Despite living in `/stores/`, it returns 30+ `useState` setters. Only `defaultPostOverlay` constant is consumed by CameraScreen (line 9). The hook itself is referenced only by `AppContext.jsx:17` — and `AppContext` itself doesn't appear to be wrapped around any tree (App.jsx mounts SocketProvider directly, not AppProvider). Likely dead code — verify and delete.

**[MODERATE] `AppContext.jsx` is dead code** — Provider is exported but never imported in `App.jsx` or `main.jsx`. `useApp()` consumer search returns zero hits. Delete `AppContext.jsx` along with `usePost.js` if confirmed unused.

**[MODERATE] DaisyUI v5 valid, but theme tokens bypassed in many places** — `EmojiReactionBar.jsx:52` (`bg-amber-100 ring-amber-400`), `SettingsSheet.jsx:75` (`bg-amber-500`), `FriendPickerSheet.jsx:131,145,176` (`border-amber-400`), `StreakCalendar.jsx:67` (`bg-amber-400`), `FriendListItem.jsx:53` (`bg-amber-400`). The DaisyUI theme already defines `--color-secondary: #fbbf24` (= amber-400) and `--color-warning: #f59e0b` (= amber-500). Use semantic tokens (`bg-secondary`, `bg-warning`, `ring-secondary`) so a future theme tweak propagates. No invalid v5 class names detected.

**[MODERATE] Hardcoded box-shadow rgba colors duplicate primary token** — Multiple files: `LoginScreen.jsx:80,134`, `BottomTabBar.jsx:44`, `CameraScreen.jsx:213`, `ProfileScreen.jsx` (none), `SettingsSheet.jsx:51,75`. All use literal `rgba(249,115,22,0.55)` — i.e., `--color-primary` rgba'd. Define a CSS custom property like `--shadow-primary: 0 8px 20px -6px rgba(249,115,22,0.55)` in app.css and reference once. Saves 6+ duplicates.

**[MODERATE] `console.log` left in production-bound cache files** — `cache/chatsDB.js:148`, `cache/friendsDB.js:151,165`, plus many commented-out logs throughout cache/ directory. Either remove or wire to a debug helper. Vite doesn't strip them in build by default.

**[MODERATE] `socket.off(eventName, fn)` cleanup pattern correct, but `get_messages_with_user` socket emit on activeChatId change has no off-counterpart** — `MessagesScreen.jsx:61-69`. Effect emits `get_messages_with_user`, but cleanup is empty. If conversation changes rapidly, multiple in-flight requests stack server-side; not a leak in this client but flag for backend pairing.

---

## Positive Observations

- Good use of `forwardRef` + `useImperativeHandle` in `CameraPreview.jsx` to expose video without prop-drilling.
- Proper cleanup in `CameraPreview` effect (line 67-76): cancellation flag, track stop, srcObject reset.
- `MomentViewer` correctly toggles body `overflow-hidden` and removes Escape key listener on unmount.
- Selector pattern correctly used in `FeedScreen.jsx:17-22`, `CameraScreen.jsx:31-35`, `UploadProgressChip.jsx:6` — proves the team knows the idiom; the whole-store subs in MessagesScreen + ChatDetail are likely oversights.
- `FriendAvatar` component is well-designed (size variants, error fallback, lazy loading, aria-label).
- Vite alias `@` configured correctly + zero broken imports detected (only one relative `../cache/...` in `useUploadPostStore.js:20`).
- `App.jsx` correctly switches tabs via display toggle (preserves state) — good UX choice.

---

## Recommended Action Order

1. Fix `SocketContext` stale null bug (CRITICAL).
2. Consolidate friend stores → `useFriendStoreV2` everywhere; delete V1 + normalize `MomentCard`/`MomentViewer` to read `profilePic` (CRITICAL).
3. Stop camera stream when not on Camera tab (privacy).
4. Replace inline avatars with `FriendAvatar` (3 sites).
5. Extract DRY helper from `fetchMoments`/`reloadMoments`.
6. Fix `runQueue` race window with synchronous flag check inside same `set()`.
7. Convert MessagesScreen/ChatDetail/SocketContext to selector form.
8. Delete `usePost.js` + `AppContext.jsx` + `useChatSocket.js` if confirmed unused.
9. Migrate `bg-amber-*` → semantic theme tokens.
10. Remove `console.log` from cache/ files.

---

## Unresolved Questions

- Is `AppContext`/`usePost`/`useChatSocket` actually wired anywhere outside src/? (Guessing no — search returned zero hits — but please confirm before deletion.)
- Is `useFriendStore` (V1) consumed by feature tests or storybook outside src/? Migration path depends.
- Should the camera stream pause when MessagesScreen/FeedScreen/ProfileScreen tabs are active, or fully stop? Pausing keeps reconnect fast; stopping releases the indicator light. Product call.
- Is the upload-queue intended to support concurrent uploads, or strict serial? `runQueue`'s `while` loop is serial; if concurrent is wanted, redesign.
