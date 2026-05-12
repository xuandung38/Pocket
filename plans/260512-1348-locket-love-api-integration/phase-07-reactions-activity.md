---
phase: 7
title: "Reactions + activity"
status: pending
priority: P2
effort: "4h"
dependencies: [4, 6]
---

# Phase 7: Reactions + activity

## Overview
Wire reactions and replies on the friend's feed to real backend; wire the "Hoạt động" (Activity) sheet on own moments to show real reaction list. Also wire the friend-search input in FriendsSheet to a real friend-search/invite API.

## Requirements
**Functional:**
- Click emoji on friend's moment → POST reaction → toast "Đã gửi {emoji}" (existing UI)
- Click "+" → emoji picker → on pick → POST reaction → toast
- Reply overlay text input → POST reply (becomes a chat message in that 1-1 conv)
- Own moment "Hoạt động {N}" pill → opens sheet with real reactionList from `momentStore.getReactions(momentId)` (lazy fetch on open)
- FriendsSheet search → typing >2 chars → debounced API call → render results from real user-search endpoint
- "+ Thêm" button on a search result → sends friend request → optimistic "Đã gửi"

**Non-functional:**
- Reactions arrive via socket on the receiver's side → "Hoạt động" badge count updates without manual refresh
- Search debounced to 300ms; cancellable on input change

## Architecture
```
Reaction send (friend's moment):
  user click → ActionMoments.sendReaction(momentId, emoji)
            → socket emits to author
            → author's momentStore receives event → bumps reactionList

Reply send (friend's moment):
  user submit → ChatServices.sendMessage(convWithFriend, text)
            → conversation upserted, message appears in chat history

Activity sheet:
  open → momentStore.fetchReactions(momentId) → render list

Friend search:
  query → FriendsServices.searchUsers(query) → results
  add  → FriendsServices.sendFriendRequest(userId)
```

## Related Code Files
**Create:**
- `apps/locket-love/src/services/ActionMoments.js` (copy from `apps/main` — sendReaction, deleteReaction)

**Modify:**
- `apps/locket-love/src/screens/feed-screen.jsx`
  - `sendReaction(emoji)` from MomentCard → call `ActionMoments.sendReaction(moment.id, emoji)` instead of just toasting
  - On success: toast (existing) + optimistic increment of `reactionList` if own moment cached
  - On failure: toast error
  - `ReplyOverlay` send button:
    - Resolve or create 1-1 conv with the moment's author (`ChatServices.getOrCreateConv(authorId)`)
    - `ChatServices.sendMessage(convId, text)` → close overlay → toast
- `apps/locket-love/src/stores/moment-store.js`
  - Add `fetchReactions(momentId)` — calls backend reaction endpoint, caches in moment record
  - Socket handler for `reaction:new` → bump reactionList on matching moment
- `apps/locket-love/src/components/sheets/friends-sheet.jsx`
  - Replace `searchableUsers` mock with `useFriendSearch(query)` hook (debounced internally)
  - "+ Thêm" → `FriendsServices.sendFriendRequest(userId)` → mark added in local state (already implemented for UI)
- `apps/locket-love/src/services/FriendsServices.js`
  - Add `searchUsers(query)` and `sendFriendRequest(userId)` if not already in copied file

## Implementation Steps
1. Copy `ActionMoments.js` from `apps/main`
2. Wire `MomentCard.onSendQuickReaction` and emoji picker pick → `await ActionMoments.sendReaction(moment.id, emoji)`; toast on success/failure
3. Wire `ReplyOverlay` send button:
   - On submit text → `const conv = await ChatServices.getOrCreateConv(moment.author.id)`
   - `await ChatServices.sendMessage(conv.id, text)`
   - Close overlay, toast "Đã gửi"
4. Add `momentStore.fetchReactions(momentId)`:
   - Call backend → `[{ user, emoji, createdAt }]`
   - Patch the moment in store with the list
   - On open of "Hoạt động" sheet → `momentStore.fetchReactions(reactionMoment.id)` if not loaded
5. Add socket handler `reaction:new` → bump reactionList of the matching moment in store
6. Build `useFriendSearch(query)`:
   - Debounce input to 300ms
   - Cancel previous request when query changes (AbortController)
   - Returns `{ results, loading, error }`
7. Wire FriendsSheet:
   - Replace `searchResults` derivation with `useFriendSearch(query)`
   - "+ Thêm" handler → `FriendsServices.sendFriendRequest(user.id)` → on success update `addedIds`; on failure show toast
8. Smoke-test: react on friend's moment in browser A → verify it appears in author's "Hoạt động" panel in browser B without manual refresh; reply → message appears in chat list

## Success Criteria
- [ ] Reaction tap fires real API call (verify Network)
- [ ] Reaction received via socket bumps "Hoạt động" count without refresh
- [ ] Reply overlay sends a real chat message; appears in ChatList for both sides
- [ ] Activity sheet shows real list of reactors with avatar, time, emoji
- [ ] FriendsSheet search returns live results from API
- [ ] "+ Thêm" sends real friend request; "Đã gửi" persists across reload
- [ ] Errors surface as toasts, never silent

## Risk Assessment
- **Risk:** Reaction endpoint may not allow same-emoji-twice → spam tap creates errors.
  **Mitigation:** rate-limit at UI level (300ms debounce per emoji); if backend returns 409, swallow and dedupe.
- **Risk:** `getOrCreateConv` may not exist; backend might require explicit `createConversation` first.
  **Mitigation:** scout `apps/main`'s reply flow; if missing, build the two-step in `ChatServices`.
- **Risk:** Friend-search endpoint may rate-limit aggressively.
  **Mitigation:** debounce at 300ms; show "..." while loading; cancel previous request on each keystroke.
- **Risk:** Socket reaction event arrives before the moment is in cache (e.g. very new moment).
  **Mitigation:** fall back to refetching the moment if not found in cache.
