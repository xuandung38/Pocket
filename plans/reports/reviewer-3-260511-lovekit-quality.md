---
title: Reviewer-3 Code Quality Review — Lovekit Locket Layout Clone
reviewer: reviewer-3
date: 2026-05-11
branch: feat/fix-selfhost
plan: apps/self-hosted/web/plans/260511-1813-lovekit-locket-layout-clone/plan.md
scope: 9 files, 1362 LOC total
---

# Reviewer-3 — Quality Review

Files reviewed (line counts):

| File | LOC | Over 200? |
|------|----:|-----------|
| App.jsx | 123 | — |
| hooks/useSwipeNav.js | 39 | — |
| screens/CameraScreen.jsx | **316** | YES |
| screens/FeedScreen.jsx | **240** | YES |
| components/FriendMomentRow.jsx | 96 | — |
| stores/useFriendStore.js | 56 | — |
| stores/useMessagesStore.js | **209** | borderline |
| components/ChatDetail.jsx | 172 | — |
| components/CameraPreview.jsx | 111 | — |

Plan top-level `status: completed` ✓ (plan.md:4).

---

## Findings

### [CRITICAL] Global swipe handler hijacks intra-screen scrolling on feed/messages/profile

**Evidence:** `hooks/useSwipeNav.js:26-33`, `App.jsx:103-105`

```js
if (navState === "camera") { /* swipe up/left/right */ return; }
setNavState("camera");   // <-- any swipe with |dx|>50 OR |dy|>50 returns to camera
```

The `<main>` wraps every screen and owns `onTouchStart`/`onTouchEnd`. Touch events bubble even during native pan-y scroll. Inside FeedScreen, scrolling between moments produces `touchend` with `|dy|>50` → branch falls through to `setNavState("camera")`. Same applies to MessagesScreen list scroll and ProfileScreen scroll: any meaningful swipe pops back to camera.

FeedScreen's local `handleTouchEnd` correctly gates on `scrollTop===0 && dy>60`, but App's global handler does not — and there is no `stopPropagation` on the inner handlers.

**Recommendation:** Constrain the non-camera branch to a single allowed direction per screen (feed → require `dy > THRESHOLD`, messages → `dx > THRESHOLD`, profile → `dx < -THRESHOLD`). Or, even simpler, only treat the swipe as nav when the touch lands directly on the camera surface (track currentTarget or check whether inner scrollable consumed it). Without this fix, the feed scroll-snap swiper is effectively unusable on touch devices.

---

### [CRITICAL] `touch-action: pan-y` on `<main>` blocks horizontal scrolling inside FriendMomentRow

**Evidence:** `App.jsx:102` (`touchAction: "pan-y"`), `FriendMomentRow.jsx:45-54` (`overflow-x-auto`, no `touch-action` override)

Per CSS spec, the effective touch-action is the intersection of the ancestor chain. With `<main>` set to `pan-y`, any descendant with `touch-action: auto` (default) is still restricted to vertical panning. The horizontal swipe needed to scroll the friend moment row will be either ignored or hijacked by the App-level swipe handler.

**Recommendation:** Add `style={{ touchAction: "pan-x" }}` to the FriendMomentRow container so horizontal panning is allowed within it (and vertical pan is suppressed inside the row — fine for a horizontal list).

---

### [CRITICAL] `isTokenValid` returns `true` for unparseable tokens

**Evidence:** `App.jsx:24-29`

```js
function isTokenValid(token) {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;          // <-- payload may be null
  return payload.exp > Date.now() / 1000;
}
```

When `decodeJwtPayload` returns `null` (malformed token), `payload?.exp` evaluates to `undefined`, the `!` makes it truthy, and the function returns `true`. A token that fails base64/JSON decode is treated as a valid session and the user lands on the authed branch with an idToken the API will reject.

**Recommendation:**
```js
if (!payload) return false;
if (!payload.exp) return true;
return payload.exp > Date.now() / 1000;
```

---

### [IMPORTANT] `readInitialNav` throws on disabled/locked sessionStorage (Safari private mode, embedded WebViews)

**Evidence:** `App.jsx:34-37` (read in `useState` initializer at `:65`), `App.jsx:67-69` (write in `useEffect`)

```js
function readInitialNav() {
  const saved = sessionStorage.getItem(NAV_STORAGE_KEY); // <-- can throw SecurityError
  ...
}
```

A thrown `SecurityError` inside the lazy initializer is uncaught and crashes the App render. The `setItem` in the effect is also unguarded.

**Recommendation:** Wrap both reads/writes:
```js
function readInitialNav() {
  try {
    const saved = sessionStorage.getItem(NAV_STORAGE_KEY);
    return NAV_KEYS.includes(saved) ? saved : "camera";
  } catch { return "camera"; }
}
// and similarly try/catch the setItem call
```

---

### [IMPORTANT] FeedScreen friend/owner join misses `userUid` fallback

**Evidence:** `FeedScreen.jsx:117-123, 207-208` vs `FriendMomentRow.jsx:31` vs `useMomentsStoreV2.js:331`

The moments upserter writes ownerUid as `m.userUid || m.user || m.owner`. FriendMomentRow correctly joins with `(m.user || m.userUid)`. **FeedScreen only checks `m.user`**:

```js
friend={friendMap[m.user]}
isOwn={m.user === meUid}
```

Moments that come from the API with only `userUid` (or `owner`) render with no friend overlay and lose the `isOwn` flag silently.

**Recommendation:** Add a small helper `getMomentOwnerUid(m) = m.user ?? m.userUid ?? m.owner` and use it in both places (DRY).

---

### [IMPORTANT] Two parallel friend stores load the same data through different sync paths

**Evidence:**
- `stores/useFriendStore.js` (V1) — `friendDetails: []`, used by `FeedScreen.jsx:105`, `ProfileScreen.jsx:23`.
- `stores/friendStore/index.js` (V2 `useFriendStoreV2`) — `friendList`, `friendDetailsMap`, used by `CameraScreen.jsx:36`, `MessagesScreen.jsx:21`, `FriendMomentRow.jsx:15`, `FriendPickerSheet.jsx:37`.

Both call independent `loadFriends()` that hit different sync utilities (`fetchAndSyncFriendDetails` vs `syncFriendsWithServer`). On a fresh login the app fires both — duplicate API calls and IndexedDB scans — and the two slices can drift (e.g., V2 adds a friend via `addFriendLocal`; V1's `friendDetails` remains stale until its own loader re-runs).

Also their shapes differ — V2 sorts by `isCelebrity` (`friendStore/index.js:12-16`); V1's `normalizeFriend` (`useFriendStore.js:7-18`) does not produce that field.

**Recommendation:** Consolidate on V2 and either delete V1 or have V1 derive from V2. Track as a follow-up phase; out of scope for this layout-clone landing, but flag clearly.

---

### [IMPORTANT] CameraScreen.jsx is 316 LOC — exceeds 200-line rule

**Evidence:** `screens/CameraScreen.jsx` (full file)

Suggested split boundaries:

1. `components/camera/CameraHeader.jsx` (header, lines 149–159 + `meName`/`meAvatar` derivation 133–137).
2. `components/camera/CapturePreviewBox.jsx` (the rounded ring + preview vs captured rendering, lines 165–220, plus `handleFlip`).
3. `components/camera/CaptureActionsBar.jsx` (the three-button rows for preview / captured / posting, lines 228–286).
4. `hooks/useCameraCapture.js` (phase, shot, caption, audience, recipients, `handleCapture`, `resetToPreview`, `handlePost`, `handleGalleryChange` — the entire reducer-like state machine).

After extraction `CameraScreen.jsx` becomes a thin layout shell well under 200 LOC.

---

### [IMPORTANT] FeedScreen.jsx is 240 LOC — exceeds 200-line rule

**Evidence:** `screens/FeedScreen.jsx` (full file)

Suggested split boundaries:

1. `components/feed/MomentSlide.jsx` (lines 17–97 — already a clean inner component).
2. `hooks/useInfiniteFeed.js` (lines 133–146 — IntersectionObserver + sentinel logic).
3. `hooks/usePullDownToClose.js` (lines 148–166 — pull-down gesture; reusable for ProfileScreen too).

---

### [MODERATE] `useMessagesStore.increaseVisibleCount` compares against `messages.length` on an object — always false

**Evidence:** `stores/useMessagesStore.js:201-208`

```js
increaseVisibleCount: () => {
    const { visibleCount, messages } = get();
    if (visibleCount < messages.length) {   // messages is { [uid]: [...] }, .length === undefined
      set({ visibleCount: ... });
    }
  },
```

`messages` is an object map; `messages.length` is `undefined`; the comparison is always false; the action is a no-op. Pre-existing bug surfaced by the file under review.

**Recommendation:** Decide scope: is `visibleCount` per-conversation (most likely)? Then it should live inside each conversation bucket, not at top-level. Otherwise, count total: `Object.values(messages).reduce((n, a) => n + a.length, 0)`. Short term, document or remove.

---

### [MODERATE] `removeMessage` correctly filters but leaves conversation `last_message` stale and skips local DB

**Evidence:** `stores/useMessagesStore.js:187-197`

The Object.fromEntries/Object.entries shape fix is **correct** for `{ [conversationId]: [msg,...] }`. Confirmed against shape comment at line 19 and writers at lines 117–122 / 141–146 / 168–177.

Two residual issues:

1. If the removed message was the conversation's `last_message`, the `conversations[]` row keeps a dangling preview. Consider re-computing or clearing the conversation's preview when its last message is removed.
2. The TODO at line 196 (`deleteMessageById(msgId) nếu muốn xoá local DB`) is unimplemented — the message reappears on reload from IndexedDB. Either implement it or document the limitation.

---

### [MODERATE] ChatDetail can double-display a sent message (optimistic + server echo)

**Evidence:** `components/ChatDetail.jsx:97-105`, `stores/useMessagesStore.js:151-181`

Optimistic message id is `local-${Date.now()}`. When the server's WebSocket echo lands via `addMessageWithUserV2`, the duplicate guard `current.some(m => m.id === msg.id)` doesn't match (different id). Both stay in the bubble list.

**Recommendation:** Either (a) on send response, replace the `local-…` id with the server id; or (b) include a `clientId` in the optimistic payload and have the dedup check both `msg.id` and `msg.clientId`.

---

### [MODERATE] useSwipeNav: stale `startRef.current` on `touchcancel` or detached touchEnd

**Evidence:** `hooks/useSwipeNav.js:8-17`

`touchcancel` is not handled. If the OS cancels the touch (call interruption, dialog, scroll fling), `startRef.current` persists and the NEXT `touchStart` simply overwrites it — benign. But if no further touch ever arrives, the ref leaks until the next interaction. No correctness issue, just hygiene.

`THRESHOLD = 0` would never trigger because `Math.abs(dx) < 0` is false and `Math.abs(dy) < 0` is false; the guard at line 23 would let through every touch including taps. Not a real concern since THRESHOLD is a hard-coded constant of 50.

Multi-touch: `e.touches[0]` and `e.changedTouches[0]` only look at finger #1. A two-finger gesture (pinch zoom in particular) is misread as a single swipe — could navigate unexpectedly during pinch. Low likelihood on a PWA, INFO only.

**Recommendation:** Add an `onTouchCancel` that clears `startRef.current = null`; bail early if `e.touches.length > 1`.

---

### [MODERATE] `useFriendStore.normalizeFriend` `displayName` falls back to space when both names missing

**Evidence:** `stores/useFriendStore.js:14-17`

```js
displayName: f.displayName ?? `${f.first_name ?? ""} ${f.last_name ?? ""}`.trim(),
```

If `displayName` is missing AND both `first_name` and `last_name` are missing, `displayName` becomes `""` (after trim). Idempotency holds (`?? ""` returns `""`, second call preserves it because `??` keeps non-null), but downstream code that does `friend.displayName || "?"` may stop working if anyone changes that to `friend.displayName ?? "?"`.

Idempotency verified ✓ (`??` only coalesces null/undefined, never re-writes a non-null result).

**Recommendation:** Return `null` instead of `""` when both names are absent, so consumers can apply their own fallback consistently.

---

### [MODERATE] FeedScreen `useEffect` deps include `friends?.length` but call `fetchMoments` every time it changes

**Evidence:** `FeedScreen.jsx:127-131`

```js
useEffect(() => {
  if (!user) return;
  fetchMoments(user, null);
  if (!friends?.length) loadFriends?.();
}, [user, fetchMoments, loadFriends, friends?.length]);
```

When `friends` loads asynchronously, `friends?.length` goes 0 → N, triggering `fetchMoments` again (it was already called once for `user`). Two API hits per feed mount. Splitting into two effects (one for `fetchMoments`, one for `loadFriends`) avoids the duplicate.

---

### [MODERATE] ChatDetail subscribes to entire `messages` object, re-renders for unrelated conversations

**Evidence:** `components/ChatDetail.jsx:35`

```js
const messages = useMessagesStore((s) => s.messages);
```

Any addMessage/removeMessage in any conversation triggers re-render in every open ChatDetail. Reviewer-2's territory but flagging for completeness.

**Recommendation:** `useMessagesStore((s) => s.messages[conversationId])` — selector pinned to a single bucket.

---

### [MODERATE] FriendMomentRow rebuilds `friendMomentMap` on any change to entire `momentsByUser`

**Evidence:** `FriendMomentRow.jsx:26-35`

`useMemo` depends on `momentsByUser` (whole object). Adding a moment for friend A invalidates the memo for friend B's row too. Minor performance only.

---

### [INFO] Code duplication — friend name + avatar derivation repeated across 4 files

**Evidence:**
- `FeedScreen.jsx:18-20` (`fullName` from firstName/lastName)
- `FriendMomentRow.jsx:57-60` (same pattern)
- `ChatDetail.jsx:111-112` (same)
- `CameraScreen.jsx:133-137` (variant with `displayName`/`picture` fallbacks)

Suggest extracting `utils/friendDisplay.js`:
```js
export function getFriendFullName(f, fallback = "?") { ... }
export function getFriendAvatar(f) { ... }
export function getMomentOwnerUid(m) { return m?.user ?? m?.userUid ?? m?.owner; }
```

---

### [INFO] FeedScreen empty/loading state logic verified

**Evidence:** `FeedScreen.jsx:168, 184-201`

- `loading && moments.length === 0` → render skeleton (overlay). ✓
- `!loading && moments.length === 0` → `isEmpty=true` → EmptyState. ✓
- Bucket-undefined branch: `bucket?.loading ?? false`, `bucket?.items ?? []` → behaves like empty + not-loading. ✓ Correct.

---

### [INFO] CameraPreview cleanup is race-safe

**Evidence:** `components/CameraPreview.jsx:27-77`

Verified: the `cancelled` closure variable is updated by the effect's own cleanup; a pending `getUserMedia()` resolves and short-circuits (stops its tracks) when it sees `cancelled === true`. A new effect run starts a fresh closure. Stream lifecycle is correct across `active` and `facingMode` flips. No further action.

---

### [INFO] FriendMomentRow MomentViewer shows only one moment per friend

**Evidence:** `FriendMomentRow.jsx:40` — `moments: [moment]` (single entry array)

Tapping a friend's avatar opens only their latest moment, not a carousel. Likely intentional for v1, but worth confirming with product.

---

### [INFO] CameraScreen.handleGalleryChange — URL leak if user never resets

**Evidence:** `screens/CameraScreen.jsx:77-89, 66-73`

`URL.createObjectURL` is revoked in `resetToPreview` but only when `phase` is reset. If the user navigates away (swipe to feed) while a captured shot is in state, the blob URL is not revoked until next reset. Minor leak; acceptable.

---

### [INFO] CameraScreen Settings button is a no-op

**Evidence:** `screens/CameraScreen.jsx:152-158`

The Settings icon button has no `onClick`. Either wire to SettingsSheet (the file exists) or remove from the header for now.

---

## Summary

- **3 CRITICAL** — global swipe hijacks scroll, touch-action blocks horizontal row, JWT validates malformed tokens.
- **5 IMPORTANT** — sessionStorage crash, missing `userUid` fallback in FeedScreen, dual friend stores, 2 files > 200 LOC.
- **7 MODERATE** — `increaseVisibleCount` no-op, removeMessage residual issues, ChatDetail duplicate-on-echo, useSwipeNav hygiene, normalizeFriend empty-name string, FeedScreen duplicate fetch, ChatDetail/FriendMomentRow selector breadth.
- **5 INFO** — duplication, empty state verified ✓, race-safe camera cleanup ✓, single-moment viewer, settings no-op.

Plan completion verified: `status: completed` in plan.md frontmatter, all 5 phases marked completed.

## Top 5 Recommended Actions (Before Ship)

1. Fix `useSwipeNav` to constrain non-camera screens to a single allowed direction per screen, or wire `stopPropagation` from inner scrollable elements.
2. Add `touch-action: pan-x` to FriendMomentRow scroller.
3. Patch `isTokenValid` to return `false` when payload is null.
4. Wrap `sessionStorage` access in try/catch.
5. Align FeedScreen moment-owner join with FriendMomentRow (`m.user ?? m.userUid ?? m.owner`).

## Unresolved Questions

- Is the FriendMomentRow tap meant to open a carousel of all the friend's recent moments, or just the latest single moment? Current code is single-moment.
- Is the dual `useFriendStore` / `useFriendStoreV2` situation intentional during migration, or is V1 supposed to be deleted? If migration, when is the cutoff?
- Should `removeMessage` propagate to IndexedDB (`deleteMessageById`) or is the in-memory removal sufficient for v1?
- Camera Settings button — wire up or remove?
