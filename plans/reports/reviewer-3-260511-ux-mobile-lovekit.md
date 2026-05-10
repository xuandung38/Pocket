# Reviewer-3 — UX, mobile layout, warm-design audit (lovekit PWA)

Branch: `feat/fix-selfhost`
Scope: `apps/self-hosted/lovekit/src/**`
Pass: code-only (no runtime browser test).

## Verdict

Foundations look solid: theme tokens registered, viewport-fit=cover present, all 4 empty states wired, loading-skeleton variants complete, CSS hidden-toggle works, ConfirmDialog has Esc + backdrop dismiss. The biggest gap is **iOS safe-area handling** (bottom + top) and **scattered hardcoded amber/red Tailwind classes** that bypass the warm theme tokens. None block ship, but they will read as "off-theme" and clip on real iPhones.

Counts: **CRITICAL 2 · IMPORTANT 5 · MODERATE 8**

---

## CRITICAL

`[CRITICAL] Tab-bar bottom overlap on home-indicator iPhones — apps/self-hosted/lovekit/src/App.jsx:76 + components/ui/BottomTabBar.jsx:18 — `<main>` reserves only `pb-16` (64px) for the tab bar, but BottomTabBar height = 64px **plus** `pb-[env(safe-area-inset-bottom)]` (~34px on notch devices). Last ~34px of FeedScreen / ProfileScreen / MessagesScreen content is hidden behind the home-indicator row. Fix: change main to `pb-[calc(4rem+env(safe-area-inset-bottom))]` (or add per-screen `pb-[env(safe-area-inset-bottom)]`).`

`[CRITICAL] ChatDetail header obscured by notch / status bar — apps/self-hosted/lovekit/src/components/ChatDetail.jsx:120-140 — Modal is `fixed inset-0` with `viewport-fit=cover`, but the header is `px-3 py-3` only. On notched iPhones the back button + name will sit under the status bar. Fix: wrap header (or container) with `pt-[max(env(safe-area-inset-top),0.75rem)]`.`

---

## IMPORTANT

`[IMPORTANT] Top safe-area inset missing on FeedScreen / ProfileScreen / MessagesScreen — screens/FeedScreen.jsx:92 (`py-6`); screens/ProfileScreen.jsx:70 (`pt-6`); screens/MessagesScreen.jsx:92 (sticky header without safe-area-top) — Because `viewport-fit=cover` is enabled, the H1 / sticky header runs under the iOS status bar (or notch on landscape). Fix: each top-level container should use `pt-[max(env(safe-area-inset-top),1.5rem)]` (CameraScreen.jsx:138 already does this — copy that pattern).`

`[IMPORTANT] Logout button bypasses theme tokens — components/SettingsSheet.jsx:75 — `bg-amber-500 hover:bg-amber-600 text-white ... rgba(245,158,11,0.55)`. The theme already exposes `--color-warning: #f59e0b` (= amber-500) and `--color-warning-content`. Fix: `bg-warning hover:bg-warning/90 text-warning-content`. Lets the warm palette stay coherent if theme is ever re-tuned.`

`[IMPORTANT] Upload-failed chip uses raw red palette — components/UploadProgressChip.jsx:30 — `bg-red-500/30 border-red-300/30 text-red-50`. Theme has `--color-error: #ef4444` (= red-500) and `--color-error-content`. Fix: `bg-error/30 border-error/30 text-error-content`.`

`[IMPORTANT] FriendPickerSheet selection state uses raw amber tints — components/FriendPickerSheet.jsx:131,145,176 — `border-amber-400`, `text-amber-400`, `border-amber-400 bg-amber-400 text-white`. Theme `--color-secondary: #fbbf24` (= amber-400) is the warm-palette equivalent. Fix: use `border-secondary` / `text-secondary` / `bg-secondary text-secondary-content`. Same pattern in `screens/ProfileScreen.jsx:114` (`border-amber-400/40 ring-amber-400/30`) and `components/EmojiReactionBar.jsx:52` (`bg-amber-100 ring-amber-400`).`

`[IMPORTANT] ChatDetail messages list bottom padding fragile — components/ChatDetail.jsx:145 — `pb-28` (112px) is hard-coded. ChatInputBar textarea grows up to `max-h-36` (144px) plus its own padding + safe-area inset. Last messages will hide behind the input when textarea is multi-line. Fix: either set the input bar to a fixed bottom and use a ResizeObserver to push padding, OR move ChatInputBar into the flex column (`shrink-0` after the scroll area) instead of `fixed bottom-0` so it pushes the scroll naturally.`

---

## MODERATE

`[MODERATE] StreakCalendar active dot uses raw amber — components/StreakCalendar.jsx:67 — `bg-amber-400 shadow-[0_0_10px_-2px_rgba(251,191,36,0.6)]`. Replace with `bg-secondary` and adjust shadow to use `--color-secondary` rgba.`

`[MODERATE] FriendAvatar unread ring uses raw amber — components/FriendAvatar.jsx:33 — `ring-2 ring-amber-400 ring-offset-2 ring-offset-base-100`. The offset uses theme token correctly; switch the ring color to `ring-secondary`.`

`[MODERATE] FriendListItem rollcall dot uses raw amber — components/FriendListItem.jsx:53 — `bg-amber-400`. Use `bg-secondary` for theme parity.`

`[MODERATE] MomentViewer top action buttons can be obscured by notch — components/MomentViewer.jsx:79,90 — `absolute top-4 right/left-4` on a `fixed inset-0` modal. Add `top-[max(env(safe-area-inset-top),1rem)]` to keep close + delete tappable on notched iPhones.`

`[MODERATE] MomentViewer destructive hover uses raw red — components/MomentViewer.jsx:90 — `hover:bg-red-500/40`. Use `hover:bg-error/40` to align with theme.`

`[MODERATE] FeedScreen pagination spinner is a daisyUI utility, not the warm palette — screens/FeedScreen.jsx:124 — `loading loading-dots loading-md text-primary` works but other screens use `Loader2` from lucide. Minor consistency nit; either pick one for "loading more".`

`[MODERATE] No PWA install/manifest checks for safe-area meta — index.html:9 sets `theme-color: #F97316` and apple-mobile-web-app-capable yes; status-bar-style is `default` (white text on white). For the warm/cream `bg-base-100` (#FFFBF0) consider `black-translucent` so status bar text stays legible against viewport-fit=cover content extending behind it.`

`[MODERATE] Tab labels `Capture/Feed/Chats/You` (English) but every other surface is Vietnamese (Tin nhắn, Cài đặt, Đăng xuất, Xoá, Huỷ, Bạn bè, etc.) — components/ui/BottomTabBar.jsx:5-9. Inconsistent voice. Pick a language and stick to it (the Vietnamese-leaning copy elsewhere suggests `Chụp / Bảng tin / Tin nhắn / Bạn`).`

---

## Verified OK

- `index.html:7` — `viewport-fit=cover` present.
- `components/ui/BottomTabBar.jsx:18` — `pb-[env(safe-area-inset-bottom)]` present.
- `components/ChatInputBar.jsx:48` — `pb-[calc(env(safe-area-inset-bottom)+0.5rem)]` present.
- `components/SettingsSheet.jsx:57` — `pb-[calc(env(safe-area-inset-bottom)+1.5rem)]` present.
- `components/FriendPickerSheet.jsx:106` — `pb-[env(safe-area-inset-bottom)]` present.
- `screens/CameraScreen.jsx:138` — top safe-area inset (`pt-[max(env(safe-area-inset-top),1rem)]`) present.
- All 4 screens accept and apply `className` for the hidden toggle (`App.jsx:78-87`).
- Empty states: Feed (Sparkles), Messages (MessageCircle), Profile friends (UserPlus), Camera denied (CameraOff). All present.
- LoadingSkeleton variants: `card / line / avatar / feed / list` — all 5 wired (`components/ui/LoadingSkeleton.jsx`).
- ConfirmDialog: Esc handler (`ui/ConfirmDialog.jsx:14-19`) + backdrop click dismiss (`:29`). Warm shadow `rgba(249,115,22,0.35)`. OK.
- WarmCard primitive consistent: `rounded-3xl bg-base-100 border border-base-200 shadow rgba(249,115,22,0.18)` — used in LoginScreen, ProfileScreen, MomentCard.
- Radii consistent: cards `rounded-3xl`, pills/buttons `rounded-full`, inputs/secondary buttons `rounded-2xl`.
- LoginScreen, MomentCard, MessageBubble, ConversationItem use only theme tokens (`primary`, `base-*`).

---

## Unresolved questions

1. Is the Vietnamese / English mix on tab labels intentional (e.g. branding wants English nav)? If yes, ignore the language MODERATE finding.
2. ChatInputBar "fixed bottom" pattern — is the design spec for iOS keyboard pushing the input above the keyboard already validated? On real-device test, `position: fixed` + viewport-fit=cover often jumps under the keyboard on iOS Safari. May need `position: sticky` inside the chat column instead.
3. Does the team want to keep `daisyUI` `loading loading-dots` utility or standardize on `Loader2` from lucide for all spinners?

**Status:** DONE
**Summary:** UX/mobile audit complete. 2 CRITICAL (tab-bar bottom overlap, ChatDetail header notch overlap), 5 IMPORTANT (top safe-area on 3 screens, theme-token bypass on logout/upload-fail/picker/chat-pb). Theme primitives, empty states, skeletons, ConfirmDialog, hidden toggle all verified OK.
