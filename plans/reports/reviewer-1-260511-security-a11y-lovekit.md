# reviewer-1 — Security + A11y + Performance audit (lovekit)

Scope: `apps/self-hosted/lovekit/src/**` on branch `feat/fix-selfhost`.

## Findings

### Security

[CRITICAL] Refresh token + idToken stored in `localStorage` indefinitely — `src/utils/storage/storage.js:47-61` (`saveToken` writes idToken/refreshToken/localId to `localStorage` when rememberMe=true; `LoginScreen.jsx:41-48` always passes `true`) — Any XSS yields full account takeover including offline impersonation. Move refresh token to HttpOnly+Secure+SameSite=Strict cookie (server already supports `withCredentials`); keep only short-lived idToken in JS-accessible memory.

[CRITICAL] `localStorage.clear()` in `SettingsSheet.jsx:23` wipes ALL localStorage entries (theme, deviceId, weather cache, friend caches, rememberMe) on logout — destructive cross-cutting side-effect. Use `removeToken()` + `clearAllDB()` (already exists in `useAuthStore.clearAndlogout`) instead. Also `App.jsx:51-58` already clears tokens — `SettingsSheet.handleLogout` runs before `onLogout`, double-handling.

[CRITICAL] `cachedExp` in `lib/axios.js:15` is a module-level global never reset on logout/login — first user's token expiry timestamp is reused after a different user logs in until app reload, producing stale `isTokenExpired()` decisions and potentially attaching prior user's bearer state. Reset `cachedExp = null` inside `saveToken` and on login success, or recompute every call (the cache micro-optimisation is not worth the bug surface).

[IMPORTANT] `decodeJwtPayload` in `App.jsx:11-21` uses `decodeURIComponent(escape(json))` — `escape` is deprecated and silently corrupts non-Latin1 token claims. `parseJwt` in `utils/auth/parseToken.js` already uses the correct percent-encoding pattern; reuse it instead of duplicating logic with broken legacy escape.

[IMPORTANT] `isTokenValid` in `App.jsx:23-28` returns `true` for tokens with no `exp` claim ("trust until refresh layer rejects"). Combined with the `cachedExp` global bug, a stale token can boot the app into an authed state while every API call 401s. Treat missing `exp` as invalid.

[IMPORTANT] Token leaked through socket query — `socket/socketClient.js:8-18` sends `idToken` in `auth: { token }` over WS. `console.log("Socket connected:", socketClient.id)` and `console.error("Connect error:", err.message)` are in production builds (no env guards) — token itself is not logged but reconnect loop with `Infinity` attempts means a revoked-token loop will spam logs forever. Cap `reconnectionAttempts` and gate console output behind `import.meta.env.DEV`.

[IMPORTANT] `x-api-key` shipped to client in `webConfig.js:26` and attached on every axios instance (`axios.auth.js:24`, `axios.main.js:24`, `axios.data.js:24`). Despite the `VITE_PUBLIC_*` prefix this is a shared secret embedded in the bundle — any user can extract and reuse it server-side. Confirm with backend whether this key gates anything privileged; if so, move auth enforcement to bearer-only.

[IMPORTANT] `handleLogout` in `lib/axios.js:89-92` does `window.location.href = "/login"` — but the app is a tab-switcher, not router-driven; there is no `/login` route. On 401 this triggers a full reload to a non-existent path served by static host as 404. Replace with `setAuthed(false)` via store hook.

[MODERATE] Console error logs throughout services include error messages from server (`AuthServices.js:62,71,83,92,117,135` and 169 total console statements across src) — minor info disclosure in browser devtools and may include PII in error bodies. Strip or DEV-gate before production.

[MODERATE] `forgotPassword` in `AuthServices.js:135` does `console.log(error)` printing full axios error including request config (which has `x-api-key` header). Remove.

[MODERATE] `useAuthStore.init` caches user profile in `localStorage` under key `userData` for 24h (`useAuthStore.js:11-87`). PII (email, displayName, profile picture URL) sits in localStorage; on shared-device logout that cache survives unless `clearAndlogout` runs — and `App.handleLogout` does NOT call `clearAndlogout`, only removes token keys, leaving `userData` and Dexie DB stale for the next user. Wire logout to `clearAndlogout` or delete `userData` explicitly in `App.handleLogout`.

[MODERATE] No `Content-Security-Policy` enforcement visible in client; user-supplied caption rendered directly inside JSX (`MomentCard.jsx:107`, `MomentViewer.jsx:148`, `MessageBubble.jsx:43`). React auto-escapes so XSS via text is mitigated, BUT thumbnail/video URLs (`MomentCard.jsx:88`, `MomentViewer.jsx:131-141`, `MessageBubble.jsx:38`) accept whatever the API returns into `src` — a malicious `javascript:` or `data:` URL would not execute in `<img src>` (browser ignores) but `<video src="data:text/html,...">` can be abused on some engines. Validate URL scheme is `https:` before rendering.

### Accessibility

[IMPORTANT] Color contrast — `--color-primary: #f97316` on `--color-base-100: #fffbf0` ≈ 2.74:1, FAILS WCAG AA (4.5:1 normal, 3:1 large). Affected: `BottomTabBar.jsx:56` (active tab `text-primary` 10px label), `StreakCalendar.jsx:48` ("ngày streak" 5xl), `FriendPickerSheet.jsx:14` initials, `ProfileScreen.jsx:73` avatar fallback, `EmptyState.jsx:22` icon. The 10px tab label is the worst — small text on cream is functionally unreadable at glance. Darken active label to `--color-neutral` (#431407) with primary background highlight, or use `text-primary-content` on a primary-bg pill.

[IMPORTANT] Tap targets below 44×44 — `BottomTabBar.jsx:34` outer `<button>` is `h-16 w-full` so OK, but inner active circle is `size-10` (40px). Headings: `ProfileScreen.jsx:97` settings button is `size-10` (40px). `MomentViewer.jsx:79,90` close/delete are `p-2` on a `size-6` icon ≈ 40×40. `LoginScreen.jsx:116-127` show-password is `p-1` on size-5 icon ≈ 28×28 — well below HIG 44pt. `ConversationItem.jsx` `<Avatar>` with `<img>` `onError` swallow errors; not a tap-target issue. Bring all primary icon-only buttons to ≥44×44 via padding.

[IMPORTANT] `BottomTabBar.jsx` missing `<section role="tabpanel" aria-labelledby="...">` linkage. Each tab in BottomTabBar is `role="tab"` but the screens (CameraScreen/FeedScreen/MessagesScreen/ProfileScreen) use `role="tabpanel"` without `aria-labelledby` pointing back to a tab id, and all four panels are mounted simultaneously (only `display:none` toggled) — screen readers will announce four tabpanels instead of one. Either add ids+aria-labelledby AND use `aria-hidden`/`hidden` on inactive panels, or render only the active screen.

[IMPORTANT] `ChatDetail.jsx` modal trap missing — `role="dialog" aria-modal="true"` set but no focus trap (`Tab` escapes to underlying tab bar), no initial focus to back button, no focus restoration on close. Same in `FriendPickerSheet.jsx:96-110`, `SettingsSheet.jsx:43-55`, `MomentViewer.jsx:67-83`, `ConfirmDialog.jsx:23-39`. All five modals fail keyboard a11y. Use `inert` on background or implement a focus trap (e.g. focus-trap-react).

[IMPORTANT] `EmojiReactionBar.jsx:38-58` — emoji buttons set `aria-label="React ❤️"` but the visible content is the emoji itself which screen readers also read; result is double-announce. Wrap emoji in `<span aria-hidden="true">` (already done) but the `aria-label` is redundant — better `aria-label="React with heart"` (translated emoji name). Currently the SR will say "React heart" then re-read the emoji label cluster.

[MODERATE] `MomentViewer.jsx` Swiper `direction="vertical"` has no keyboard navigation announcement; arrow-key support depends on Swiper config (not enabled). Users on keyboards cannot navigate moments. Add `keyboard: { enabled: true }` to Swiper modules.

[MODERATE] `LoginScreen.jsx` form submit error path uses `SonnerError` toasts only — visually-hidden assertive `<div role="alert">` for error messaging is missing, so screen readers may miss async failures depending on Sonner config.

[MODERATE] `FriendListItem.jsx:23-58` — `<button onClick={onClick}>` with `onClick` undefined when not provided (it is undefined in `ProfileScreen.jsx`), making the entire button a no-op interactive element. Remove the `<button>` wrapper when no handler, or use `aria-disabled`.

[MODERATE] `BottomTabBar.jsx:32` `aria-label={label}` redundant with visible text label below — duplicate announcement. Drop `aria-label`, the visible `<span>` is the accessible name.

[MODERATE] `CaptureButton.jsx:204` `aria-label="Chụp ảnh — giữ để quay video"` is good; but the press-and-hold record gesture has no keyboard equivalent. Keyboard users can't record video. Document or add keyboard shortcut.

### Performance / Concurrency

[CRITICAL] `useMessagesStore.removeMessage` at `useMessagesStore.js:184-195` is broken — calls `messages.filter` on an OBJECT (state shape: `messages: { [convId]: msg[] }`), `Object.entries(conversations).map(...)` against an ARRAY (state shape: `conversations: []`). Will throw `TypeError: messages.filter is not a function` if ever invoked. Currently no caller invokes it (rg confirms 0 hits), but it's a landmine. Either delete the dead code or fix to: `set(state => ({ messages: Object.fromEntries(Object.entries(state.messages).map(([k,v]) => [k, v.filter(m => m.id !== msgId)])) }))`.

[CRITICAL] `SocketContext.jsx:8` `const { user } = useAuthStore();` subscribes to ENTIRE auth store — `SocketProvider` re-renders on every auth state change (loading, isAuth, user mutations). Same in `MessagesScreen.jsx:21` (`useMessagesStore()`), `ChatDetail.jsx:36` (`useMessagesStore()`). These cause every child component subtree to re-render on any unrelated store mutation (e.g. typing in chat updates `messages` slice, which re-renders MessagesScreen's entire tree including the conversation list). Convert to selector form: `useAuthStore(s => s.user)` etc. — the codebase already uses selectors elsewhere correctly (see `App.jsx`, `LoginScreen.jsx`).

[IMPORTANT] `useMessagesStore.fetchConversations` at line 26 — local DB result is set THEN api result REPLACES it without dedup/merge. If API misses an item that exists locally (offline-first promise broken), it disappears from UI silently. Merge by uid like `addMessageWithUserV2` does for messages.

[IMPORTANT] `useMessagesStore.getMessagesByUser` at line 90 — caches keyed by conversationId but cache check at line 94 returns immediately on first hit, never refreshing. Pulling-to-refresh or new socket messages must invalidate. Combined with `ChatDetail.jsx:60-78` which always calls `getMessagesByUser` on open, the cache is effectively bypass; remove dead-cache shortcut or honor it consistently.

[IMPORTANT] `useMomentsStoreV2.syncMomentsSnapshot` at line 361-391 — runs `bulkAddMoments(snapshot)` after `Promise.all(deletedIds.map(deleteMomentById))` without awaiting both in a transaction. If the user closes the tab between deletes and bulkAdd, IndexedDB state diverges from server snapshot. Wrap in `db.transaction('rw', db.moments, async () => { ... })`.

[IMPORTANT] `cache/momentDB.js:9-33` `bulkAddMoments` cleanup deletes oldest by `date` — but the table `db.version(1).stores.moments = "id, user, date"` indexes `date` as a non-unique secondary; if `moments` lack a `date` field (older items) they get bumped first or not at all. Also race: count + delete is non-transactional, two concurrent `bulkAddMoments` calls double-delete. Wrap in `db.transaction('rw', db.moments, ...)`.

[IMPORTANT] `FeedScreen.jsx:51-64` IntersectionObserver effect deps include `moments.length` — recreates observer on every items change, which is correct but noisy; root cause is sentinel re-rendered when items length changes. Not broken, but `loadMoreOlder` itself reads `bucket.items[bucket.items.length - 1].createTime` non-atomically — if items change between the IO callback firing and `loadMoreOlder` running, fetches use stale timestamp. Read inside a single `get()` snapshot.

[IMPORTANT] `App.jsx:77-89` mounts ALL FOUR SCREENS simultaneously, only toggling `display`. CameraScreen's `CameraPreview` runs `getUserMedia` whenever `active` is true (`active` is hard-coded `active` literal at `CameraScreen.jsx:112`). This means the camera STAYS ON when user swipes to Feed/Messages/Profile — privacy concern + battery drain. Pass `active={activeTab === "camera"}` from App into CameraScreen and forward to CameraPreview, or unmount inactive tabs.

[IMPORTANT] `CameraScreen.jsx` — when shot is captured and user navigates away then back via tab change, blob URL is leaked (only revoked in `resetToPreview`). When component remounts (if conditional rendering added) `URL.revokeObjectURL` for in-flight blobs is missing; even today, abandoning a captured shot when logout fires never revokes. Add cleanup effect.

[MODERATE] `useMomentsStoreV2.fetchMoments` at line 49-136 + `reloadMoments` at line 138-222 are 90% duplicate — DRY violation, two slightly-different implementations risk drift. Extract shared core.

[MODERATE] Sort-on-every-mutation pattern in `useMomentsStoreV2` (lines 86, 109, 172, 195, 344) and `useMessagesStore` (lines 32-39, 62-66, 81-83, 137-139, 168-170) — O(n log n) on every add. For 5000 max items per `MOMENTS_CONFIG.maxDisplayLimit` this is 60k ops on each new moment. Insert in correct position (binary search) or sort once on display.

[MODERATE] `EmojiReactionBar.jsx:16-27` — `try/await SendReactMoment` lacks `.catch`; if API fails the `setActive(emoji)` runs only on success path BUT `setPending(null)` runs in `finally`. No user error feedback on failed reaction. Add catch with toast.

[MODERATE] Body-scroll lock — `MomentViewer.jsx:27-30` adds `overflow-hidden` to body class; `SettingsSheet.jsx:7-19` directly sets `document.body.style.overflow`. Two different mechanisms, can step on each other (close one and the other still has lock or vice versa). Centralize.

[MODERATE] `useMomentsStoreV2.removeMoment` at line 396-412 — deletes from store + IndexedDB but if user has the same moment in multiple bucket keys (e.g. `all` AND owner-specific) only `key` bucket is cleaned. The `addNewMoment` at line 319-359 writes to BOTH buckets. Symmetric removal needed.

[MODERATE] `axios.js:101-138` request interceptor — when not authed it `Promise.reject({status: 401, message: ...})` (raw object, not Error). The response interceptor at line 143 does `error.response?.status || error.status` and follows the 401 path which calls `handleLogout()` even though the user is just unauthenticated (initial app boot before login). Race: any background fetch firing before login completes triggers a redirect to `/login`. Throw a typed Error and short-circuit before logout.

### Camera / privacy

[IMPORTANT] `CameraPreview.jsx:39-42` requests video without `audio: false` documentation but does set `audio: false` correctly. However it requests on first render of CameraScreen even before user taps the tab if all four screens mount (see App.jsx finding above). The browser permission prompt will fire on app boot, not when user expects (privacy expectation violation). Lazy-mount CameraScreen.

## Summary by severity

- CRITICAL: 5
- IMPORTANT: 18
- MODERATE: 13

## Unresolved questions

- Is `VITE_PUBLIC_API_KEY` actually used as a secret server-side, or is it just a routing/version header? If the latter, demote to MODERATE.
- Is offline use a hard requirement? If yes, the localStorage-token tradeoff is partially defensible (HttpOnly cookie won't survive offline reload). Need product input.
- Does the deployed app sit behind a CSP? If yes, several XSS/url-scheme concerns are mitigated.
- Tester (#8) marked all builds passing — was actual lint/build run with these changes, or only test files? `useMessagesStore.removeMessage` would never be exercised by tests (no callers).
