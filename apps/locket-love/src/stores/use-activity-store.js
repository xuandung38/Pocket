// useActivityStore
// In-memory activity feed store. Aggregates "incoming reactions on own moments"
// + "rollcall posts" into a single sorted list. Phase 7 wires it up; later
// phases can extend it with friend-request notifications, mention events, etc.
//
// State surface:
//   items   : ActivityItem[]   sorted newest-first
//   unread  : number           realtime increments via socket
//   loading : boolean          initial load flag
//   lastFetchedAt : number     epoch ms — used for soft refresh gating
//
// Actions:
//   loadActivity()                          - HTTP fetch via getActivity()
//   markRead()                              - reset `unread` to 0
//   pushItem(item)                          - prepend a single item + bump unread
//   subscribeSocket()                       - attach a socket listener that
//                                             bumps unread on `new_message_with_user`
//                                             (reactions piggy-back on this).
//                                             Returns an unsubscribe function.
//   clear()                                 - reset to defaults (logout)
//
// Why a side-channel socket subscription instead of a screen-mounted one?
//  - Activity tab is bottom-nav-driven; user expects the badge to update even
//    when the activity screen isn't currently rendered. A store-level
//    subscription means the badge stays accurate as long as the socket is up.

import { create } from "zustand";
import { getActivity } from "@/services/rollcall-services";
import { onMessage } from "@/services/socket-service";

// Cap items to avoid unbounded growth across long sessions. UI shows newest
// 30 anyway; cap at 100 keeps a healthy buffer for scroll-back.
const MAX_ITEMS = 100;

// Merge new items into the existing list, dedupe by id, keep newest-first.
function mergeItems(prev, next) {
  if (!next?.length) return prev;
  const seen = new Set();
  const merged = [];
  for (const item of [...next, ...prev]) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }
  merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return merged.slice(0, MAX_ITEMS);
}

export const useActivityStore = create((set, get) => ({
  items: [],
  unread: 0,
  loading: false,
  lastFetchedAt: 0,

  // ---------------------------------------------------------------------
  // First/refresh fetch. Replaces (merges) the in-memory list with the
  // freshly aggregated server data. Does NOT touch `unread` — that counter
  // is driven by the realtime side-channel only, otherwise opening + closing
  // the tab would reset it on every load.
  // ---------------------------------------------------------------------
  loadActivity: async () => {
    const { loading } = get();
    if (loading) return;
    set({ loading: true });
    try {
      const { items, fetchedAt } = await getActivity({ limit: 30 });
      set((state) => ({
        items: mergeItems(state.items, items),
        lastFetchedAt: fetchedAt,
      }));
    } catch (err) {
      // getActivity already swallows transport errors and returns []. Any
      // exception here is unexpected — log and keep prior state.
      console.error("[useActivityStore] loadActivity failed:", err);
    } finally {
      set({ loading: false });
    }
  },

  // ---------------------------------------------------------------------
  // Mark all activity as read — clears the bottom-nav badge.
  // ---------------------------------------------------------------------
  markRead: () => set({ unread: 0 }),

  // ---------------------------------------------------------------------
  // Realtime insert. Used by the socket bridge — prepends + bumps unread.
  // ---------------------------------------------------------------------
  pushItem: (item) => {
    if (!item?.id) return;
    set((state) => ({
      items: mergeItems(state.items, [item]),
      unread: state.unread + 1,
    }));
  },

  // ---------------------------------------------------------------------
  // Subscribe to socket reaction events. Returns an unsubscribe function.
  // The backend currently piggy-backs reactions on `new_message_with_user`;
  // we extract reaction payloads (messages with a `reactions` field or a
  // `type === "reaction"` discriminator) and push them as activity items.
  // ---------------------------------------------------------------------
  subscribeSocket: () => {
    const off = onMessage((data) => {
      if (!data) return;
      const items = Array.isArray(data) ? data : [data];
      for (const msg of items) {
        // Reaction-shaped payload: explicit type OR carries a non-empty
        // `reactions` map. Anything else is a plain chat message — ignored
        // here so we don't double-count regular messages as activity.
        const reactions = Array.isArray(msg?.reactions) ? msg.reactions : null;
        const explicitReaction =
          msg?.type === "reaction" || msg?.kind === "reaction";

        if (explicitReaction) {
          const createdAtMs =
            Number(msg?.createdAt) ||
            Number(msg?.created_at) ||
            Math.floor(Date.now() / 1000);
          const createdAt =
            createdAtMs > 1e12 ? Math.floor(createdAtMs / 1000) : createdAtMs;
          get().pushItem({
            id: `rx-live-${msg?.id || msg?.uid || createdAt}`,
            type: "reaction",
            emoji: msg?.emoji || msg?.reaction || "💛",
            actor: {
              uid: msg?.sender || msg?.sender_uid || "",
              name: msg?.senderName || msg?.sender_name || "Người dùng",
              avatar: msg?.senderAvatar || msg?.sender_avatar || null,
            },
            momentId: msg?.moment_uid || msg?.momentId || null,
            thumbnail: msg?.thumbnail || null,
            createdAt,
            payload: msg,
          });
        } else if (reactions?.length) {
          // Reactions attached to a chat message — surface the most recent.
          const latest = reactions[reactions.length - 1];
          const createdAtMs =
            Number(latest?.createdAt) ||
            Number(latest?.created_at) ||
            Math.floor(Date.now() / 1000);
          const createdAt =
            createdAtMs > 1e12 ? Math.floor(createdAtMs / 1000) : createdAtMs;
          get().pushItem({
            id: `rx-msg-${msg?.id || msg?.uid}-${createdAt}`,
            type: "reaction",
            emoji: latest?.emoji || latest?.reaction || "💛",
            actor: {
              uid: latest?.user_uid || latest?.uid || "",
              name: latest?.firstName || latest?.name || "Người dùng",
              avatar: latest?.profilePic || latest?.avatar || null,
            },
            momentId: msg?.moment_uid || null,
            thumbnail: null,
            createdAt,
            payload: latest,
          });
        }
      }
    });
    return off || (() => {});
  },

  // ---------------------------------------------------------------------
  // Reset — wired to `lk:auth:reset` window event by the auth store.
  // ---------------------------------------------------------------------
  clear: () =>
    set({
      items: [],
      unread: 0,
      loading: false,
      lastFetchedAt: 0,
    }),
}));

// Convenience selectors for components.
export const selectActivityItems = (s) => s.items;
export const selectActivityUnread = (s) => s.unread;

// Tear down on logout (mirrors the chat / friend stores). Auth store dispatches
// `lk:auth:reset` after clearing tokens. Only attach in browser contexts to
// stay SSR / test-safe.
if (typeof window !== "undefined") {
  window.addEventListener("lk:auth:reset", () => {
    useActivityStore.getState().clear();
  });
}
