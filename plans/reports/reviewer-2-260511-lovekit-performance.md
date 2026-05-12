# Reviewer-2 — Lovekit Locket Layout Performance Review

Date: 2026-05-11
Branch: feat/fix-selfhost
Reviewer: reviewer-2 (performance)
Scope: re-render audit, scroll/transform cost, Zustand selector hygiene, async effects.

---

## Findings

### [IMPORTANT] MessagesScreen re-emits `get_messages_with_user` on every conversation list mutation
- Evidence: `apps/self-hosted/lovekit/src/screens/MessagesScreen.jsx:59-67`
- Effect deps: `[socket, activeChatId, conversations]`. `conversations` reference changes on every `upsertConversation`/`addMessageWithUserV2` (socket events). Each change re-runs the effect and re-emits `socket.emit("get_messages_with_user", ...)` — so the server is hit (and the bucket re-fetched) on every incoming message while a chat is open.
- Recommendation: drop `conversations` from the dep array; resolve `conv?.with_user` either inside the effect via `useMessagesStore.getState().conversations` or once on open via `activeConversation` already computed below. Keep deps `[socket, activeChatId]`.

### [IMPORTANT] FeedScreen autoplays every video simultaneously
- Evidence: `apps/self-hosted/lovekit/src/screens/FeedScreen.jsx:34-43` — each `MomentSlide` renders `<video autoPlay muted loop playsInline>` unconditionally.
- With scroll-snap N moments, all N videos start decoding in parallel as soon as the slide DOM is inserted. On mobile this trashes battery/CPU and the network (range requests for N MP4s) even though only one snap is visible.
- Recommendation: use an `IntersectionObserver` (per-slide or shared) to `play()` only the slide whose `isIntersecting` is true and `pause()` the rest. The existing IO at line 136 only watches the sentinel — extend the pattern or add a separate observer for video playback control.

### [MODERATE] `will-change: transform` permanently applied to all 4 always-mounted screens
- Evidence: `apps/self-hosted/lovekit/src/App.jsx:41-59` — `screenStyle()` returns `willChange: "transform"` for camera, feed, messages, profile on every render.
- `will-change` reserves a dedicated compositor layer indefinitely. Holding 4 simultaneously inflates GPU memory and can backfire on low-end Android. The MDN/WICG guidance is to apply only while a transition is in flight, then remove.
- Recommendation: set `willChange: "transform"` only on the active screen and the screen it is transitioning to (or, simpler, only when `navState` differs from the previous tick), or drop it entirely — the transform itself already triggers a layer.

### [MODERATE] FriendMomentRow subscribes to the whole `momentsByUser` object
- Evidence: `apps/self-hosted/lovekit/src/components/FriendMomentRow.jsx:17` — `const momentsByUser = useMomentsStoreV2((s) => s.momentsByUser);`
- `useMomentsStoreV2` mutates `momentsByUser` with `{ ...state.momentsByUser, [key]: newBucket }` on every loading/paging/append per user (see `useMomentsStoreV2.js:38-113`). Every bucket touch — including unrelated users — produces a new top-level reference and re-renders FriendMomentRow plus its `friendMomentMap` memo recompute (O(friendList × allBucket)).
- Recommendation: derive only what the row needs. Two options:
  1. Subscribe to `s.momentsByUser?.all?.items` and `s.momentsByUser` with `shallow` equalityFn (`zustand/shallow`), or
  2. Move the `friendMomentMap` computation into a memoized selector keyed on `friendList` + the specific buckets actually consumed.

### [MODERATE] ChatDetail subscribes to the entire `messages` map
- Evidence: `apps/self-hosted/lovekit/src/components/ChatDetail.jsx:35` — `const messages = useMessagesStore((s) => s.messages);`
- `useMessagesStore` rebuilds `messages` with `{ ...messages, [conversationId]: updated }` on every send/incoming (see `useMessagesStore.js:141-177`). Every conversation's message activity re-renders ChatDetail even when a different chat is open.
- Recommendation: subscribe directly to the active bucket:
  ```js
  const list = useMessagesStore((s) =>
    conversationId ? s.messages[conversationId] : undefined,
  );
  ```
  Drop the local `messages` variable. This keeps ChatDetail idle when other chats receive traffic.

### [MODERATE] ChatDetail `list` fallback creates a new `[]` every render
- Evidence: `apps/self-hosted/lovekit/src/components/ChatDetail.jsx:40` — `const list = conversationId ? messages[conversationId] || [] : [];`
- When there are no cached messages yet, every render hands a brand-new array to the `useMemo` on line 42-48, so `sorted` recomputes and the scroll-to-bottom effect at line 82-86 fires on every parent update. Compounded with the whole-`messages` subscription above, this becomes a render-storm during socket traffic.
- Recommendation: hoist a module-level `const EMPTY = []` (or `useRef([])`) and use it as the fallback. Pair with the selector fix in the previous finding.

### [INFO] `screenStyle` is recomputed 4× per App render with fresh object identity
- Evidence: `apps/self-hosted/lovekit/src/App.jsx:41-59,106-117`
- Negligible cost in practice (4 small objects, shallow style diff), but flagging because the per-render alloc is avoidable. `useMemo` on `[navState]` returning `{ camera, feed, messages, profile }` styles is cleaner and removes any churn for the inactive 3 screens between renders triggered by socket updates.

### [INFO] FeedScreen `handleTouchStart`/`handleTouchEnd` not memoized
- Evidence: `apps/self-hosted/lovekit/src/screens/FeedScreen.jsx:148-166`
- Used inline on the root `<section>`; no child consumer benefits from referential stability. Safe to leave; only worth `useCallback` if these are lifted to a custom hook later.

### [INFO] FriendMomentRow subscribes to `friendDetailsMap` even when viewer is closed
- Evidence: `apps/self-hosted/lovekit/src/components/FriendMomentRow.jsx:16,90`
- `friendDetailsMap` is only consumed by `MomentViewer`. When viewer is closed the subscription still triggers re-renders on every `loadFriends` settle. Minor — push the subscription into `MomentViewer` or read it via `getState()` at click time.

### [INFO] `SocketContext` Provider value object not memoized
- Evidence: `apps/self-hosted/lovekit/src/context/SocketContext.jsx:33-37`
- Value `{ socket, isConnected }` is a fresh object each render of `SocketProvider`. The provider only re-renders on `user/socket/isConnected` state changes (rare), so impact is small, but every consumer re-renders on each of those. `useMemo(() => ({ socket, isConnected }), [socket, isConnected])` is the standard hardening.

### [INFO] `MomentSlide` not memoized
- Evidence: `apps/self-hosted/lovekit/src/screens/FeedScreen.jsx:17-97`
- When `moments.length` grows via `loadMoreOlder`, every existing slide re-evaluates props. React's keyed reconciliation preserves DOM (video element survives), so playback is unaffected, but JSX work is O(N). `React.memo(MomentSlide)` with cheap prop equality eliminates the rebuild.

---

## Targeted answers to the brief

1. **All-screens-mounted model / `will-change`** — `will-change: transform` is applied to all 4 screens unconditionally (App.jsx:54). This is the main always-on cost. No layout thrash observed: `transform` + `position: absolute; inset: 0` keep slides out of layout flow; `visibility: hidden` further skips paint of inactive subtrees. The remaining concern is permanent compositor-layer retention (see MODERATE finding above).
2. **Zustand selector hygiene** — Mostly clean. Three regressions: `FriendMomentRow` (whole `momentsByUser`), `ChatDetail` (whole `messages`), and `FriendMomentRow` (`friendDetailsMap` when viewer closed). MessagesScreen, FeedScreen, CameraScreen, SocketContext are selector-correct.
3. **FeedScreen IntersectionObserver cleanup** — Correct. `observer.disconnect()` returned (FeedScreen.jsx:145). No bare scroll-event listeners attached. Note: observer is rebuilt on every `moments.length` change because it's in the dep list; functionally fine, slightly wasteful — could be split into stable observer + ref callback. Pull-to-back uses `onTouchStart/End` JSX handlers, not addEventListener — no leak risk.
4. **`useSwipeNav` deps** — Correct. `onTouchStart` deps `[]` is sound (ref only). `onTouchEnd` deps `[navState, setNavState]` includes the closed-over `navState`. `setNavState` is stable but listing it is harmless. No stale closure risk.
5. **FriendMomentRow re-render profile** — 4 store subscriptions (`friendList`, `friendDetailsMap`, `momentsByUser`, `user`). Re-renders fire on (a) any friend mutation, (b) any moment bucket mutation across all users, (c) viewer open/close. (b) is the broad one — see MODERATE finding.
6. **`screenStyle` inline** — Cheap enough today; no urgent need to memoize. INFO-level cleanup only.
7. **FriendMomentRow ↔ CameraScreen coupling** — Verified clean. FriendMomentRow has its own subscriptions; updates there do not cause CameraScreen to re-render (React subscription model is per-component). CameraScreen only re-renders on its own selectors (`user`, `friendsLoaded` count, `enqueueUploadItem`).

---

## Positive observations

- `useSwipeNav` is correctly memoized and ref-based — no stale closures.
- FeedScreen's `IntersectionObserver` cleanup is correct; pull-to-back avoids scroll listeners.
- `CameraPreview` correctly stops `MediaStream` tracks on `active=false` and on facing-mode change (CameraPreview.jsx:67-76).
- `MessagesScreen` uses fine-grained selectors for all store reads (one per field/action).
- `useMomentsStoreV2` updates preserve unrelated bucket references via spread — selector for `momentsByUser?.all` does not over-fire for unrelated user buckets, so FeedScreen does not suffer the broad-subscription problem.

---

## Recommended fixes (in priority order)

1. Remove `conversations` from `MessagesScreen.jsx` chat-subscribe effect deps — stops re-emitting per incoming message.
2. Pause non-visible videos in `FeedScreen` via IntersectionObserver — battery/CPU win on mobile.
3. Narrow `ChatDetail` subscription to `s.messages[conversationId]` and use a stable empty-array fallback.
4. Narrow `FriendMomentRow` subscription to `momentsByUser?.all?.items` (or add `shallow`).
5. Drop or scope `will-change: transform` to only the screen(s) involved in an active transition.
6. Memoize SocketContext provider value and add `useMemo` for `screenStyle` (low-priority polish).

---

## Unresolved questions

- Is there a global navigation event for "transition started/ended" we can hook into to toggle `will-change` precisely? If not, a simple `useEffect`+timer of TRANSITION duration would suffice.
- `useMessagesStore` has no `messages` selector for a single conversationId — confirm Zustand's `shallow` import path used elsewhere in the repo before recommending it, or if the project prefers raw selectors only.

**Status:** DONE
**Summary:** Performance review complete — 2 IMPORTANT (chat-effect re-emit, video autoplay), 4 MODERATE (will-change, FriendMomentRow subscription, ChatDetail subscription, ChatDetail empty-array identity), 5 INFO, 5 positives.
