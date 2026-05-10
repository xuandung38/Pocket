# Researcher-1 Report — Phase 01-03 Lovekit Scout

**Date**: 2026-05-11
**Branch**: feat/fix-selfhost
**Scope**: App shell, BottomTabBar, CameraScreen, FeedScreen, MomentsStoreV2, FriendStore V1+V2, CameraPreview, EmojiReactionBar

---

## 1. App.jsx

**Path**: `apps/self-hosted/lovekit/src/App.jsx`
**Line count**: 96

### Nav model
- State: `activeTab` (string, init from `readInitialTab()` reading `sessionStorage["lk:tab"]`).
- Tab keys: `["camera", "feed", "messages", "profile"]`. Default: `"feed"`.
- Persists active tab to `sessionStorage` on every change (effect at L43-45).
- **Screen switching**: ALL 4 screens always mounted; visibility toggled via `className={activeTab === "X" ? "block" : "hidden"}` passed as prop (L77-89).
- `<BottomTabBar active={activeTab} onChange={handleTabChange} />` rendered at L91 (fixed bottom).
- Outer wrapper: `h-[100dvh] flex flex-col bg-base-100 overflow-hidden`. `<main>` has `flex-1 overflow-hidden relative pb-16` (pb-16 = reserve space for tabbar).

### decodeJwtPayload (L11-21)
```js
function decodeJwtPayload(token) {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const padded = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded + "===".slice((padded.length + 3) % 4));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}
```
- Uses **deprecated `escape()`** (legacy global) — Phase 04A likely flags this. Replace with `decodeURIComponent(atob(padded).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join(""))` or use `TextDecoder` on raw bytes.
- `isTokenValid()` (L23-28): if no `payload.exp`, returns `true` (trust until refresh layer rejects) — comment in code.

### Logout (L51-59)
Wipes `localStorage` keys: `idToken`, `localId`, `refreshToken` + same in `sessionStorage`. Calls `setAuthed(false)`.

---

## 2. BottomTabBar.jsx

**Path**: `apps/self-hosted/lovekit/src/components/ui/BottomTabBar.jsx`
**Line count**: 68
**Props**: `{ active, onChange }`
**Tabs (TABS array L4-9)**:
- `camera` → Camera icon → "Capture"
- `feed` → Sparkles → "Feed"
- `messages` → MessageCircle → "Chats"
- `profile` → User → "You"

Fixed at `bottom-0 inset-x-0 z-40`, `pb-[env(safe-area-inset-bottom)]`, `bg-base-100/90 backdrop-blur-md`, `border-t border-base-200`. Height `h-16`. Active pill: `bg-primary` orange shadow.

**Phase 01 will REMOVE this file** in favor of swipe-engine.

---

## 3. CameraScreen.jsx

**Path**: `apps/self-hosted/lovekit/src/screens/CameraScreen.jsx`
**Line count**: 242

### Outer container
```jsx
<section
  role="tabpanel"
  aria-label="Capture"
  className={clsx(
    "absolute inset-0 bg-black text-white overflow-hidden",
    className, // ← "block" or "hidden" from App.jsx
  )}
>
```
- **Black bg fullscreen**, absolute positioning. Receives `className` for tab visibility toggling.

### Camera preview structure (L109-115)
```jsx
<div className="absolute inset-0">
  <CameraPreview ref={previewRef} active facingMode="user" />
</div>
```
- `previewRef` exposes `.video` getter via `useImperativeHandle`. Used by `getVideo()` callback at L41 → passed to `<CaptureButton>`.
- **`active` is hardcoded `true`**. CameraPreview's effect runs on mount/unmount only — does NOT pause when CameraScreen is hidden via `className="hidden"`.
- **Stream stays live** while user is on Feed/Messages/Profile tabs (no mount/unmount, just CSS hide).

### Phases (L24)
`phase: "preview" | "captured" | "posting"` — single state machine.

### Capture flow
1. `handleCapture(data)` (L43-46): stores `{type, file, url}` from CaptureButton, sets phase `"captured"`.
2. Captured overlay (L117-136): full-screen `<img>` or `<video autoPlay loop muted playsInline>` over preview.
3. `handlePost()` (L57-91): builds payload via `createRequestPayloadV5`, calls `enqueueUploadItem`, success → `resetToPreview()`.
4. `resetToPreview()` (L48-55): `URL.revokeObjectURL(shot.url)`, clear shot/caption, phase → `"preview"`.

### stopStream() — NOT CALLED ANYWHERE
- `CameraPreview` only exposes `{ video, stream }` getters via `useImperativeHandle` — **NO `stopStream()` / `startStream()` / `restart()` method**.
- `previewRef.current?.stopStream` would be undefined.
- Stream lifecycle entirely controlled by `active` prop's effect cleanup (L67-76) inside CameraPreview.
- Phase 05 polish item ("camera stream restart") needs to add imperative methods.

### Friend picker / audience
- `FriendPickerSheet` opened via Users button. State: `audience` (`"all"` | `"selected"`), `recipients` (array of uids).
- Loads friends via `useFriendStoreV2.loadFriends` if `friendDetailsMap` empty (L31-39).

---

## 4. FeedScreen.jsx

**Path**: `apps/self-hosted/lovekit/src/screens/FeedScreen.jsx`
**Line count**: 157

### Scroll model — Vertical list (NOT scroll-snap)
```jsx
<section className={clsx("h-full w-full overflow-y-auto", className)}>
  <div className="max-w-md mx-auto px-4 py-6 flex flex-col gap-5">
    <header>...</header>
    {moments.map((m, idx) => <MomentCard ... />)}
    <div ref={sentinelRef} className="h-12">...</div>
  </div>
</section>
```
- Standard `overflow-y-auto` vertical scroll, max-width `md` (~448px) centered, `gap-5` between cards.
- **Phase 03 will rewrite to fullscreen scroll-snap swiper** (TikTok-style).

### MomentCard usage (L110-119)
```jsx
<MomentCard
  key={m.id}
  moment={m}
  friend={friendMap[m.user]}
  isOwn={m.user === meUid}
  onOpen={() => setViewerIndex(idx)}
  onLongPress={handleLongPress}
/>
```

### Moment loading
- `bucket = useMomentsStoreV2((s) => s.momentsByUser?.all)` — selects "all" bucket only.
- `moments = bucket?.items ?? []`, `loading`, `hasMore`, `isLoadingMore` derived from bucket.
- Initial fetch effect (L45-49): `fetchMoments(user, null)` + `loadFriends()` if no friends.
- Infinite scroll: `IntersectionObserver` on `sentinelRef`, `rootMargin: "300px"`, calls `loadMoreOlder(null)` when sentinel visible (L51-64).

### MomentViewer (L135-144)
Opens when `viewerIndex !== null` — overlay viewer with delete callback.

### V1 friendStore (NOT V2!)
```js
const friends = useFriendStore((s) => s.friendDetails);          // V1 array
const loadFriends = useFriendStore((s) => s.loadFriends);        // V1
```
- Builds `friendMap` from `friendDetails` array, keyed by `f.uid`.
- **CameraScreen uses V2, FeedScreen uses V1** — inconsistency. Phase 04A normalization target.

---

## 5. useMomentsStoreV2.js

**Path**: `apps/self-hosted/lovekit/src/stores/useMomentsStoreV2.js`
**Line count**: 453

### State shape
```js
{
  momentsByUser: { [key]: bucket }
}
```

### Bucket structure (defaultBucket L17-23)
```js
{
  items: [],
  loading: false,
  hasMore: true,
  isLoadingMore: false,
  visibleCount: initialVisible,  // from MOMENTS_CONFIG
}
```

### momentsByUser keying
- **Key = friend uid OR `"all"`** (when `selectedFriendUid` is `null`/falsy).
- `addNewMoment` (L319-359) writes to BOTH `ownerUid` bucket AND `"all"` bucket simultaneously (`keys = [ownerUid ?? "all", "all"]`).
- `syncMomentsSnapshot` (L361-391) only manipulates `"all"` bucket.

### Methods (signatures)
- `ensureBucket(key)` — creates bucket if missing.
- `fetchMoments(user, selectedFriendUid = null)` — local-first then API sync.
- `reloadMoments(selectedFriendUid = null)` — same as fetch but no `user` param.
- **`loadMoreOlder(selectedFriendUid = null)`** — uses `bucket.items[last].createTime` as timestamp, calls `GetAllMoments({timestamp, friendId, limit: loadMoreLimit})`. Sets `hasMore: false` if `older.length === 0`. Dedupes by `id` Set. `hasMore = older.length === loadMoreLimit`.
- `addNewMoment(payload)` — realtime socket add.
- `removeMoment(momentId, ownerUid = null)` — only removes from key=ownerUid bucket (NOT from `"all"` if `ownerUid` is set!). **POTENTIAL BUG**: deleting own moment from feed passes `meUid`, but `addNewMoment` wrote to BOTH buckets — `removeMoment` only deletes one.
- `increaseVisibleCount`, `resetVisible`.

### Sort order
All sorts: `(a, b) => b.createTime - a.createTime` (newest first).

---

## 6. useFriendStore.js (V1)

**Path**: `apps/self-hosted/lovekit/src/stores/useFriendStore.js`
**Line count**: 41

### State
```js
{
  friendDetails: [],   // ARRAY
  loading: false,
}
```

### Field names
**Field names depend on what `getAllFriendDetails()` / `fetchAndSyncFriendDetails()` return.** Not directly visible here. Convention from Locket API typically: `uid`, `first_name`, `last_name`, `profile_picture_url` (snake_case from API). Need cross-check with V2 + actual cache adapter — **UNRESOLVED**.

### loadFriends flow (L14-31)
1. `set({ loading: true })`
2. Local IndexedDB → `getAllFriendDetails()` → `set({ friendDetails: localFriends })`.
3. Background → `fetchAndSyncFriendDetails()` → `set({ friendDetails: updated })`.
4. On error: `SonnerError`.
5. Finally: `set({ loading: false })`.

### Other methods
- `setFriendDetails(friends)`, `clearFriends()`, `addFriend(friend)`.

---

## 7. friendStore/index.js (V2)

**Path**: `apps/self-hosted/lovekit/src/stores/friendStore/index.js`
**Line count**: 137

### State
```js
{
  friendList: [],           // ARRAY (sorted celebrity-first)
  friendDetailsMap: {},     // { [uid]: friend }
  friendRelationsMap: {},   // { [uid]: { createdAt, hidden, ... } }
  loading: false,
}
```

### Differences from V1
| V1 (`useFriendStore`) | V2 (`useFriendStoreV2`) |
|---|---|
| `friendDetails: []` | `friendList: []` + `friendDetailsMap: {}` + `friendRelationsMap: {}` |
| Single array | Array + uid-keyed map (O(1) lookup) |
| No celeb sort | `sortCelebFirst()` — `isCelebrity` first |
| `addFriend` | `addFriendLocal` |
| no hidden state | `hiddenUserState(uid, hidden)` |
| no remove | `removeFriendLocal(uid)` + `addRemovedFriend` to diary |
| Calls `fetchAndSyncFriendDetails()` | Calls `syncFriendsWithServer()` returning `{details, friendRelationsMap}` |

### Field names visible in V2
`friend.uid`, `friend.isCelebrity`, `friend.createdAt`. Other fields opaque (relayed from sync).

### loadFriends (L27-57)
1. Local: `getAllFriendDetails()` → sort → set `friendList` + `friendDetailsMap`.
2. Server: `syncFriendsWithServer()` → returns `{details, friendRelationsMap}` → sort → set all 3 maps.
3. **No try/catch** — errors will propagate to caller (CameraScreen calls `loadFriends?.()` without await/catch).

---

## 8. CameraPreview.jsx

**Path**: `apps/self-hosted/lovekit/src/components/CameraPreview.jsx`
**Line count**: 111

### Ref forwarding (forwardRef)
```js
useImperativeHandle(ref, () => ({
  get video() { return videoRef.current; },
  get stream() { return streamRef.current; },
}), []);
```
- **Only 2 getters: `video`, `stream`.**
- **NO `stopStream()`, `startStream()`, `restart()` methods.**
- Phase 05 polish needs to ADD these for camera lifecycle control when tab swipes away.

### Stream lifecycle (effect L27-77)
- Runs on `[active, facingMode]` change.
- `start()` async: `getUserMedia({video: {facingMode}, audio: false})` → `streamRef.current = stream` → `videoRef.current.srcObject = stream`.
- Cleanup: `streamRef.current.getTracks().forEach(t => t.stop())` + `videoRef.current.srcObject = null`.
- Re-runs only if `active` toggles. Currently `active` always `true` from CameraScreen.

### Errors
`NotAllowedError` → "Bạn chưa cho phép truy cập camera." | `NotFoundError` → "Không tìm thấy camera." | else → "Không khởi tạo được camera." → renders `<EmptyState>` with `CameraOff` icon.

### Mirror
`facingMode === "user"` adds `scale-x-[-1]` Tailwind class.

---

## 9. EmojiReactionBar.jsx

**Path**: `apps/self-hosted/lovekit/src/components/EmojiReactionBar.jsx`
**Line count**: 63

### Props
```js
{ momentId, className, onReact, size = "md" }
```
- **NO `moment` prop** — only `momentId` (string).
- `onReact(emoji)` callback after successful react.
- `size`: `"md"` (size-9, text-xl) or `"lg"` (size-10, text-2xl).

### Emojis
`["❤️", "😂", "😮", "😢", "🔥", "👏"]`

### Behavior
- `handleTap(emoji, e)`: `e.stopPropagation()`, guards `!momentId || pending`, calls `SendReactMoment(emoji, momentId, 1)`, sets `active`.
- Local `pending` (which emoji is firing) and `active` (last selected) state.
- No optimistic count display, no remove-react UI.

---

## Phase 01-03 Implementation Hot Spots

### Phase 01 (Dev-1) — Swipe Engine + tab removal
- Replace `activeTab` state machine with horizontal swipe nav (camera/feed/messages or vertical 3-pane like Locket).
- Remove `BottomTabBar` import + render from App.jsx (L9, L91).
- Remove `pb-16` from `<main>` (L76) — no tabbar reserve.
- Fix JWT decode (L11-21): replace `decodeURIComponent(escape(json))` with modern UTF-8 decode.
- Add `pt-[env(safe-area-inset-top)]` somewhere top-level (currently CameraScreen handles its own L138).

### Phase 02 (Dev-2) — Camera redesign + FriendMomentRow
- Camera screen needs new layout per Locket clone.
- New component `FriendMomentRow` — likely horizontal scroll of friend avatars w/ latest moment thumb (above camera or top bar).

### Phase 03 (Dev-3) — Feed fullscreen scroll-snap swiper
- Replace `overflow-y-auto` + `max-w-md` card list with `snap-y snap-mandatory h-[100dvh]` per-moment slides.
- Each MomentCard becomes a fullscreen slide w/ media bg + caption overlay (Instagram Reels / Locket-style).
- Keep existing IntersectionObserver pagination but adapt to snap container.

---

## Cross-cutting Notes

1. **Store inconsistency**: FeedScreen uses V1 (`useFriendStore`), CameraScreen uses V2 (`useFriendStoreV2`). Phase 04A scoped to fix.
2. **`removeMoment` bug**: dual-bucket write (`addNewMoment` writes to ownerUid + "all") but single-bucket delete. Re-deleting may leave orphan in "all" bucket.
3. **Camera stream never pauses**: `active` hardcoded `true`, screen hidden via CSS only — Phase 05 needs `stopStream()` imperative method on tab change/swipe.
4. **`escape()` deprecated**: ESLint may warn. Modern Locket apps use `Buffer.from(b64, 'base64').toString('utf8')` (Node) or `TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)))` (browser).
5. **Tab persistence to sessionStorage**: With swipe-engine, decide whether to keep last-pane in sessionStorage or always default to feed/camera.

---

## Unresolved Questions

1. **V1 friendStore field names**: `getAllFriendDetails()` and `fetchAndSyncFriendDetails()` source files NOT in scout list — actual fields (`profilePic` vs `profile_picture_url` vs `firstName` vs `first_name`) require checking `apps/self-hosted/lovekit/src/cache/friendsDB.js` and `apps/self-hosted/lovekit/src/utils/SyncData/friendSyncUtils.js`. Phase 04A will need this.
2. **`removeMoment` dual-bucket**: Confirmed bug or intentional? Test by deleting own moment from feed and checking if it reappears via uid-key bucket.
3. **MOMENTS_CONFIG values**: `initialVisible` and `loadMoreLimit` not in scout — affects pagination UX in Phase 03 swiper.
4. **CaptureButton API**: signature of `onCapture(data)` — what does `data` look like? `{type, file, url}` confirmed used, but does CaptureButton support video duration/photo dimensions?
5. **Swipe nav target**: 3 panes (camera ⇄ feed ⇄ messages+profile) or 2 (camera ⇄ feed)? ProfileScreen disposition unclear post-tabbar removal.

**Status:** DONE
**Summary:** Scouted 9 files for Phase 01-03 lovekit rewrite. Documented App.jsx nav model + JWT decode quirk, BottomTabBar shape (to remove), CameraScreen 242-line state machine + missing imperative stream methods, FeedScreen V1/V2 store split, MomentsStoreV2 bucket keying, FriendStore V1 vs V2 field-shape diff, CameraPreview ref API (only video/stream getters), EmojiReactionBar props (`momentId` not `moment`).
**Concerns/Blockers:** None blocking. 5 unresolved questions listed (chiefly V1 friend field names and removeMoment dual-bucket bug verification).
