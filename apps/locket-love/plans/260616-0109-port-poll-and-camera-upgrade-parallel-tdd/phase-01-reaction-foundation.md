---
phase: 1
title: Reaction foundation
status: completed
priority: P1
effort: 3h
dependencies: []
---

# Phase 1: Reaction foundation

**Track A (Agent A) · không phụ thuộc · chạy song song với Phase 4, 5.**

## Overview
Thêm hệ thống reaction-effect: zustand store `useReactionStore` + component animation emoji bay (`GlobalReactionEffect`) mount ở root. Là nền tảng cho poll-vote (Phase 3) và mọi nút react hiện có.

## Requirements
- Functional: `triggerReaction(emojiOrArray)` set 1 reaction mới có `id` duy nhất; `GlobalReactionEffect` lắng nghe store → spawn emoji bay lên rồi tự dọn theo `id`; mount 1 lần toàn app.
- Non-functional: không phụ thuộc DaisyUI; animation bằng CSS keyframes trong `index.css`; `crypto.randomUUID` có fallback (môi trường non-HTTPS).

## Architecture
- Store (zustand v5, giống pattern `src/stores/*`): `{ reaction: null, triggerReaction }`. `triggerReaction` chuẩn hoá input → mảng string hợp lệ → `set({ reaction: { id, reactions } })`.
- `GlobalReactionEffect`: subscribe `reaction`; mỗi `id` mới → render burst emoji (vị trí random, animation float-up + fade), setTimeout dọn DOM sau animation. Restyle từ upstream `ReactionEffect/index.jsx` (bỏ class DaisyUI, dùng inline style + class trong index.css).
- Mount: trong `src/App.jsx`, đặt `<GlobalReactionEffect />` bên trong `<AppProvider>` cạnh `<Routes>` (overlay toàn cục, `position:fixed`, `pointer-events:none`, z-index cao).

## Related Code Files
- Create: `src/stores/use-reaction-store.js`
- Create: `src/components/ui/global-reaction-effect.jsx`
- Create: `src/stores/__tests__/use-reaction-store.test.js`
- Create: `src/components/ui/__tests__/global-reaction-effect.test.jsx`
- Modify: `src/stores/index.js` (export `useReactionStore`)
- Modify: `src/App.jsx` (mount effect bên trong `AppProvider`)
- Modify: `src/index.css` (keyframes `reaction-float`)
- Reference: upstream `feature/camera-upgrade:.../stores/PostStores/useReactionStore.js`, `.../Effects/ReactionEffect/index.jsx`, `.../Widgets/GlobalReactionEffect.jsx`

## Implementation Steps (TDD)
1. **RED — store test** (`use-reaction-store.test.js`): `triggerReaction("👍")` → `reaction.reactions === ["👍"]`, `reaction.id` là string; gọi lần 2 → `id` khác lần 1; input mảng `["🔥","❄️"]` giữ cả 2; input không hợp lệ (number/null) → bỏ qua (state không đổi hoặc lọc rỗng → no set).
2. **GREEN — store**: viết `use-reaction-store.js` (port từ upstream, thêm fallback UUID nếu `crypto.randomUUID` undefined). Export trong `stores/index.js`.
3. **RED — effect test** (`global-reaction-effect.test.jsx`): render `<GlobalReactionEffect/>`, gọi `useReactionStore.getState().triggerReaction("🎉")` trong `act()` → có phần tử chứa "🎉" xuất hiện; sau khi advance timers → phần tử bị gỡ (cleanup).
4. **GREEN — effect**: viết `global-reaction-effect.jsx` (subscribe store, render burst, setTimeout cleanup). Thêm keyframes `reaction-float` vào `index.css`.
5. **Mount**: thêm `<GlobalReactionEffect/>` vào `App.jsx` trong `AppProvider`.
6. Chạy `npm run test` — xanh; không vỡ test cũ.

## Success Criteria
- [ ] `use-reaction-store.test.js` xanh (id duy nhất, lọc input, mảng).
- [ ] `global-reaction-effect.test.jsx` xanh (render + cleanup).
- [ ] Effect mount toàn cục, `pointer-events:none`, không chắn UI.
- [ ] `npm run test` toàn bộ xanh; không lỗi build.

## Risk Assessment
- `crypto.randomUUID` thiếu trên HTTP → fallback generator (đã có mẫu trong `moment-services.js`).
- Fake timers cho cleanup test: dùng `vi.useFakeTimers()`.
- Mount sai vị trí (ngoài Provider) → store context vẫn OK vì zustand global, nhưng đặt trong Provider để nhất quán.
