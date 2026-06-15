// use-chat-store.js
// Chat data store — single source of truth for messages + conversation metadata.
//
// Why this exists: previously each chat screen kept messages in component-local
// `useState`, so navigating into a chat reset to [] → blank flash → full history
// refetch on every open. Lifting state into this store (which outlives any
// screen) means re-entering a chat renders the cached list instantly and only
// genuinely-new messages append (dedupe-by-id).
//
// Strategy: in-memory only (lost on hard refresh — accepted trade-off). The
// store OWNS the socket listeners (attached once, reconnect-safe) so messages
// keep flowing into the store regardless of which screen is mounted.
//
// Message shape (from chat-namespace-handler.normalizeWsMessage):
//   { id, uid, body, sender, type, createdAt, update_time, replyMoment,
//     thumbnailUrl, isRead, _pending? }

import { create } from "zustand";
import { getToken } from "@/utils";
import {
  connectSocket,
  emitGetMessagesWith,
  onMessage,
  onListMessage,
} from "@/services/socket-service";

const CAP = 200; // max messages kept per conversation (memory guard)
const OPTIMISTIC_WINDOW = 60; // secs to match a pending stub against its echo
const EMPTY = []; // stable ref so empty-conversation selectors don't churn
let tmpSeq = 0; // monotonic suffix so two sends in the same ms get unique ids

// Resolve the peer (conversation key) for a message relative to `myUid`.
//  - `conversation_uid` (stamped by the backend) is authoritative when present.
//  - else incoming messages key off `sender`.
//  - own-message echoes carry sender=me with no receiver, so the caller falls
//    back to activeConv (see ingestMessages) — kept as a last resort here.
function peerOf(msg, myUid) {
  if (msg?.conversation_uid) return msg.conversation_uid;
  if (msg?.sender && msg.sender !== myUid) return msg.sender;
  return msg?.receiver_uid || msg?.receiverUid || msg?.with_user || null;
}

const tsOf = (m) => Number(m?.createdAt || m?.update_time || 0);

// Merge `incoming` into one conversation's `prev` array (newest-first).
//  - same id        → update in place (reaction edits, _pending → real)
//  - matches a stub → replace the optimistic stub (no duplicate)
//  - otherwise      → append, then re-sort + cap.
function mergeOne(prev, incoming) {
  const result = prev.slice();
  for (const msg of incoming) {
    if (!msg?.id) continue;
    const existIdx = result.findIndex((m) => m.id === msg.id);
    if (existIdx >= 0) {
      result[existIdx] = { ...result[existIdx], ...msg };
      continue;
    }
    const stubIdx = result.findIndex(
      (m) =>
        m._pending &&
        m.sender === msg.sender &&
        (m.body || "") === (msg.body || "") &&
        Math.abs(tsOf(m) - tsOf(msg)) <= OPTIMISTIC_WINDOW,
    );
    if (stubIdx >= 0) {
      result[stubIdx] = { ...msg }; // real message drops _pending
      continue;
    }
    result.push(msg);
  }
  result.sort((a, b) => tsOf(b) - tsOf(a));
  return result.length > CAP ? result.slice(0, CAP) : result;
}

export const useChatStore = create((set, get) => ({
  messagesByConv: {}, // { [friendUid]: Message[] } newest-first
  convMeta: {}, // { [friendUid]: { lastMessage, lastTime, unread } }
  activeConv: null,
  myUid: null,
  _attachedSocket: null,
  _offMessage: null,
  _offList: null,

  // Connect (idempotent) + attach store-owned listeners exactly once per socket
  // instance. After a reconnect (token change) connectSocket returns a NEW
  // socket object → we re-attach so messages keep flowing.
  initSocket: (idToken) => {
    if (!idToken) return;
    const sock = connectSocket(idToken);
    const st = get();
    if (sock && sock === st._attachedSocket) return;
    st._offMessage?.();
    st._offList?.();
    const offMessage = onMessage((data) => get().ingestMessages(data));
    const offList = onListMessage((data) => get().ingestConvList(data));
    set({
      _attachedSocket: sock,
      _offMessage: offMessage,
      _offList: offList,
      myUid: getToken().localId || st.myUid,
    });
  },

  // Subscribe to a conversation: opens the live upstream WS + fetches history.
  // Does NOT clear the cached list — that's what kills the blank-flash jank.
  openConversation: (friendUid) => {
    if (!friendUid) return;
    set({ activeConv: friendUid });
    emitGetMessagesWith(friendUid);
  },

  // Merge incoming messages into messagesByConv (grouped by peer) + refresh the
  // last-message preview in convMeta.
  ingestMessages: (data) => {
    if (!data) return;
    const items = Array.isArray(data) ? data : [data];
    if (!items.length) return;
    const { myUid, activeConv } = get();

    // Bucket incoming by peer so each conversation merges independently.
    // Own-message echoes carry sender=me but no receiver field, so peerOf()
    // can't resolve them — fall back to activeConv (the backend only streams
    // new_message_with_user for the currently-open conversation).
    const byPeer = {};
    for (const msg of items) {
      if (!msg?.id) continue;
      const peer = peerOf(msg, myUid) || activeConv;
      if (!peer) continue;
      (byPeer[peer] ??= []).push(msg);
    }
    if (!Object.keys(byPeer).length) return;

    set((state) => {
      const messagesByConv = { ...state.messagesByConv };
      const convMeta = { ...state.convMeta };
      for (const peer in byPeer) {
        const merged = mergeOne(messagesByConv[peer] || EMPTY, byPeer[peer]);
        messagesByConv[peer] = merged;
        const newest = merged[0];
        if (newest) {
          convMeta[peer] = {
            lastMessage: newest.body || newest.text || convMeta[peer]?.lastMessage || "",
            lastTime: tsOf(newest) || convMeta[peer]?.lastTime || 0,
            unread: convMeta[peer]?.unread || 0,
          };
        }
      }
      return { messagesByConv, convMeta };
    });
  },

  // Merge the conversation-list snapshot into convMeta (last message + unread).
  ingestConvList: (data) => {
    if (!Array.isArray(data) || !data.length) return;
    set((state) => {
      const convMeta = { ...state.convMeta };
      for (const conv of data) {
        const peer = conv.with_user || conv.uid;
        if (!peer) continue;
        convMeta[peer] = {
          lastMessage:
            conv.latestMessage?.body ??
            conv.latestMessage?.text ??
            convMeta[peer]?.lastMessage ??
            "",
          lastTime:
            Number(conv.latestMessage?.createdAt) ||
            Number(conv.update_time) ||
            convMeta[peer]?.lastTime ||
            0,
          unread: Number(conv.unread || 0) || convMeta[peer]?.unread || 0,
        };
      }
      return { convMeta };
    });
  },

  // Optimistic send: append a pending stub, return its temp id so the caller can
  // reconcile after the HTTP send resolves.
  addOptimistic: (friendUid, { body }) => {
    const tmpId = `tmp-${Date.now()}-${tmpSeq++}`;
    const nowSecs = Math.floor(Date.now() / 1000);
    const stub = {
      id: tmpId,
      body,
      sender: get().myUid,
      createdAt: nowSecs,
      update_time: nowSecs,
      type: "text",
      _pending: true,
    };
    set((state) => ({
      messagesByConv: {
        ...state.messagesByConv,
        [friendUid]: [stub, ...(state.messagesByConv[friendUid] || EMPTY)],
      },
    }));
    return tmpId;
  },

  // ok=false → drop the stub (rollback). ok=true → clear the pending flag (the
  // real echo, when it arrives, replaces the stub via mergeOne).
  reconcileOptimistic: (friendUid, tmpId, { ok }) => {
    set((state) => {
      const list = state.messagesByConv[friendUid] || EMPTY;
      const next = ok
        ? list.map((m) => (m.id === tmpId ? { ...m, _pending: false } : m))
        : list.filter((m) => m.id !== tmpId);
      return { messagesByConv: { ...state.messagesByConv, [friendUid]: next } };
    });
  },

  setUnreadZero: (friendUid) => {
    set((state) => {
      const meta = state.convMeta[friendUid];
      if (!meta || !meta.unread) return {};
      return {
        convMeta: { ...state.convMeta, [friendUid]: { ...meta, unread: 0 } },
      };
    });
  },

  reset: () => {
    const st = get();
    st._offMessage?.();
    st._offList?.();
    set({
      messagesByConv: {},
      convMeta: {},
      activeConv: null,
      myUid: null,
      _attachedSocket: null,
      _offMessage: null,
      _offList: null,
    });
  },
}));

// Curried selector — returns the stable array ref for one conversation (or the
// shared EMPTY constant) so components don't re-render on unrelated updates.
export const selectMessages = (friendUid) => (state) =>
  state.messagesByConv[friendUid] || EMPTY;

export const selectConvMeta = (state) => state.convMeta;

// Wipe chat state on logout (auth store dispatches `lk:auth:reset` after
// clearing tokens) — same convention as use-memories-store / use-activity-store.
// Prevents account A's cached messages leaking into account B's session.
if (typeof window !== "undefined") {
  window.addEventListener("lk:auth:reset", () => {
    useChatStore.getState().reset();
  });
}
