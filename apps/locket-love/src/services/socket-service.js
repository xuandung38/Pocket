// socket.service.js
// Singleton socket.io-client wrapper for realtime chat events.
//
// Backend reference: apps/self-hosted/api/src/socket/chat-namespace-handler.js
//   Namespace: "/chat"
//   Auth: socket.handshake.auth.token = idToken
//   Client → Server:
//     - "get_list_message"          (no args)        → list of all convos
//     - "get_messages_with_user"    ({ messageId, otherUserId, timestamp })
//   Server → Client:
//     - "new_on_list_message"       (Conv[] data)    → upsert conv list
//     - "new_message_with_user"     (Msg[] data)     → new messages in a conv
//
// Lifecycle:
//   - connectSocket(idToken) is idempotent — returns the existing socket if
//     the token hasn't changed; otherwise tears down + re-creates.
//   - disconnectSocket() should be called on logout (handled here via the
//     `lk:auth:reset` event dispatched by use-auth-store).
//
// Note on typing indicators: the self-hosted backend does NOT yet implement
// a `typing` socket event. `emitTyping` is a no-op stub kept for API parity
// with the Phase 6 spec — wire it up once the backend exposes the event.

import { io } from "socket.io-client";
import { API_ENDPOINTS } from "@/config/apiConfig";

// Single shared socket per page session. Multiple screens (chat list +
// chat detail) share the same connection — avoids per-screen reconnect cost.
let socket = null;
let currentToken = null;

// Track listeners we attached so we can detach cleanly on disconnect.
// Map<event, Set<callback>>
const listeners = new Map();

// Wire one listener and remember it for teardown.
function trackOn(event, cb) {
  if (!socket || !cb) return;
  socket.on(event, cb);
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(cb);
}

function trackOff(event, cb) {
  if (!socket) return;
  socket.off(event, cb);
  listeners.get(event)?.delete(cb);
}

/**
 * Connect (or reuse) the chat socket. Idempotent.
 * @param {string} idToken  current Firebase idToken from getToken()
 * @returns {import('socket.io-client').Socket | null}
 */
export function connectSocket(idToken) {
  if (!idToken) return null;

  // Same token + alive socket → reuse.
  if (socket && currentToken === idToken && socket.connected) {
    return socket;
  }

  // Token changed or socket is dead → tear down and re-create.
  if (socket) {
    try {
      socket.removeAllListeners();
      socket.disconnect();
    } catch (err) {
      console.warn("[socket.service] tearDown error:", err?.message);
    }
    socket = null;
  }
  listeners.clear();

  currentToken = idToken;
  socket = io(`${API_ENDPOINTS.socketUrl}/chat`, {
    transports: ["websocket"],
    auth: { token: idToken },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket.on("connect", () => {
    console.log("[socket.service] connected:", socket.id);
  });
  socket.on("disconnect", (reason) => {
    console.log("[socket.service] disconnected:", reason);
  });
  socket.on("connect_error", (err) => {
    console.error("[socket.service] connect_error:", err?.message);
  });

  return socket;
}

/**
 * Disconnect + reset the singleton. Safe to call when nothing is connected.
 */
export function disconnectSocket() {
  if (!socket) return;
  try {
    socket.removeAllListeners();
    socket.disconnect();
  } catch (err) {
    console.warn("[socket.service] disconnect error:", err?.message);
  }
  socket = null;
  currentToken = null;
  listeners.clear();
}

/**
 * Returns the current socket instance (or null if not connected).
 * Useful for screens that need to attach ad-hoc listeners.
 */
export function getSocket() {
  return socket;
}

// ---- Server → Client event subscriptions ------------------------------------

/**
 * Subscribe to per-conversation message updates.
 * Backend sends `new_message_with_user` whenever a message arrives in any
 * conversation that this socket has subscribed to via `emitGetMessagesWith`.
 * The handler receives an Array<NormalizedMessage>.
 * Returns an unsubscribe function for cleanup in useEffect.
 */
export function onMessage(cb) {
  trackOn("new_message_with_user", cb);
  return () => trackOff("new_message_with_user", cb);
}

/**
 * Subscribe to conversation-list updates (one event after `emitGetListMessage`,
 * plus pushes when a new conversation is created on either side).
 * The handler receives an Array<NormalizedConversation>.
 */
export function onListMessage(cb) {
  trackOn("new_on_list_message", cb);
  return () => trackOff("new_on_list_message", cb);
}

/**
 * Subscribe to reactions. Backend does not currently emit a dedicated event
 * for reactions — they piggy-back on `new_message_with_user` (the message
 * object's `reactions` field is updated). Kept as a thin alias so screens
 * can subscribe via a semantic name.
 */
export function onReaction(cb) {
  return onMessage(cb);
}

/**
 * Subscribe to typing indicators. Backend does NOT currently emit a typing
 * event — this is a stub for API parity. Returns a noop unsubscribe.
 * When the backend adds `typing` support, wire it up here.
 */
export function onTyping(_cb) {
  return () => {};
}

// ---- Client → Server emits --------------------------------------------------

/**
 * Ask the backend for the current conversation list. Triggers a one-shot
 * `new_on_list_message` event in response.
 */
export function emitGetListMessage() {
  if (!socket) return false;
  socket.emit("get_list_message");
  return true;
}

/**
 * Subscribe to messages of a specific conversation. The backend will
 * 1) send history via `new_message_with_user`, then 2) open an upstream
 * Locket WebSocket and forward live messages on the same event.
 * @param {string} friendUid  the peer's uid (== conversation id in this backend)
 */
export function emitGetMessagesWith(friendUid) {
  if (!socket || !friendUid) return false;
  socket.emit("get_messages_with_user", {
    messageId: friendUid,
    otherUserId: friendUid,
    timestamp: null,
  });
  return true;
}

/**
 * Emit a typing indicator for a conversation. Currently a no-op against the
 * backend (no `typing` event registered). Kept callable so screens can wire
 * input change handlers without conditional checks.
 */
export function emitTyping(_friendUid) {
  // Backend stub — no event registered. See module-level comment.
  return false;
}

// ---- Auth-lifecycle integration --------------------------------------------

// use-auth-store dispatches `lk:auth:reset` on logout / refresh-token failure.
// Listen at module-eval time so the socket tears down even if no screen is
// currently mounted. Only attach in browser contexts to keep this file
// SSR-safe (Vite SSR / unit tests).
if (typeof window !== "undefined") {
  window.addEventListener("lk:auth:reset", () => {
    disconnectSocket();
  });
}
