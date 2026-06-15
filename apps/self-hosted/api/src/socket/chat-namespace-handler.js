const WebSocket = require("ws");
const { checkTokenValid } = require("../utils/checkTokenValid");
const { getAllMessages, getMessagesWithUser } = require("../services/LocketMessage");

const LOCKET_CHAT_WSS = "wss://api.locketcamera.com/wss_v2/chat";
const WS_HEADERS = {
  "x-client-version": "2.45.0",
  "User-Agent": "Locket/1 CFNetwork/3860.400.51 Darwin/25.3.0",
  "Accept": "*/*",
  "Accept-Language": "vi-VN,vi;q=0.9",
  "Sec-WebSocket-Extensions": "permessage-deflate",
};

// Map: socketId → WebSocket (Locket WS connection)
const activeLocketWs = new Map();
// Map: socketId → Map<peerUid, conversationId> — caches the peer→convId lookup
// so we don't refetch the whole conversation list on every chat open.
const convIdCache = new Map();
// Map: socketId → peerUid currently subscribed — lets us reuse the upstream
// Locket WS instead of closing+reopening when reopening the same conversation.
const activePeer = new Map();

function decodeToken(token) {
  const { valid } = checkTokenValid(token);
  if (!valid) return null;
  const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString("utf-8"));
  return { idToken: token, localId: payload.user_id || payload.uid };
}

function normalizeWsMessage(raw) {
  if (!raw || typeof raw !== "object") return null;
  const toSec = (ts) => ts ? Math.floor(new Date(ts).getTime() / 1000) : 0;
  return {
    id: raw.id || raw.uid || null,
    uid: raw.uid || raw.id || null,
    body: raw.body || raw.message || raw.text || "",
    sender: raw.sender || raw.from_uid || "",
    type: raw.type || "text",
    createdAt: raw.created_at ? toSec(raw.created_at) : (raw.createdAt || 0),
    update_time: raw.created_at ? toSec(raw.created_at) : 0,
    replyMoment: raw.reply_moment || null,
    thumbnailUrl: raw.thumbnail_url || null,
    isRead: raw.is_read || false,
  };
}

function openLocketChatWs(userId, otherUserId, idToken, onMessages, onError) {
  const url = `${LOCKET_CHAT_WSS}?otherUserId=${otherUserId}&userId=${userId}`;
  const ws = new WebSocket(url, {
    headers: { ...WS_HEADERS, Authorization: `Bearer ${idToken}` },
  });

  ws.on("open", () => {
    console.log(`✅ Locket WS open: ${userId} ↔ ${otherUserId}`);
  });

  ws.on("message", (data) => {
    try {
      const parsed = JSON.parse(data.toString());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const normalized = items.map(normalizeWsMessage).filter((m) => m?.id);
      if (normalized.length) onMessages(normalized);
    } catch (_) {
      // non-JSON frames ignored
    }
  });

  ws.on("error", (err) => {
    console.error(`❌ Locket WS error (${userId} ↔ ${otherUserId}):`, err.message);
    if (onError) onError(err);
  });

  return ws;
}

function setupChatNamespace(io) {
  const chatNs = io.of("/chat");

  // Auth middleware
  chatNs.use((socket, next) => {
    const user = decodeToken(socket.handshake.auth?.token);
    if (!user) return next(new Error("Unauthorized"));
    socket.user = user;
    next();
  });

  chatNs.on("connection", (socket) => {
    const { idToken, localId } = socket.user;
    console.log(`🔌 Chat socket connected: ${localId} (${socket.id})`);

    // ── Conversation list ──────────────────────────────────
    socket.on("get_list_message", async () => {
      try {
        const { messages } = await getAllMessages(idToken, localId);
        if (messages?.length) socket.emit("new_on_list_message", messages);
      } catch (err) {
        console.error("get_list_message error:", err.message);
      }
    });

    // ── Messages with a specific user ─────────────────────
    socket.on("get_messages_with_user", async ({ messageId, otherUserId }) => {
      if (!messageId) return;
      const peerUid = otherUserId || messageId;

      // 1. Resolve conversationId via the per-socket cache first. The client
      // sends the peer's UID, but Firestore stores messages under
      // conversations/{convId} (the Locket conversation doc id, NOT the peer
      // UID). Only fall back to the full conversation-list fetch on a cache
      // miss, and prefill the whole mapping so opening other chats also hits.
      let perSocket = convIdCache.get(socket.id);
      if (!perSocket) {
        perSocket = new Map();
        convIdCache.set(socket.id, perSocket);
      }
      let conversationId = perSocket.get(peerUid);
      if (!conversationId) {
        try {
          const { messages: convList } = await getAllMessages(idToken, localId);
          for (const c of convList || []) {
            if (c?.uid) perSocket.set(c.with_user || c.uid, c.uid);
          }
          conversationId = perSocket.get(peerUid) || peerUid;
        } catch (_) {
          conversationId = peerUid; // fallback — may work on some deployments
        }
      }

      // 2. Reuse the upstream Locket WS when reopening the same conversation;
      // only close+reopen when switching to a different peer.
      const samePeer = activePeer.get(socket.id) === peerUid;
      const prevWs = activeLocketWs.get(socket.id);
      if (!samePeer && prevWs && prevWs.readyState < 2) prevWs.close();

      // Stamp the owning conversation on every message so the client can bucket
      // it deterministically. Own-message echoes carry sender=me but no
      // receiver, so without this tag the client would have to guess the
      // conversation from its active screen (wrong under fast navigation).
      const tagConv = (msgs) =>
        (msgs || []).map((m) => ({ ...m, conversation_uid: peerUid }));

      // 3. Firestore REST for initial history (client de-dupes by id).
      try {
        const { messages } = await getMessagesWithUser(idToken, localId, conversationId);
        if (messages?.length) socket.emit("new_message_with_user", tagConv(messages));
      } catch (_) {
        // fallback to WS only
      }

      // 4. Open a live WS only when switching peer or the previous one died.
      if (!samePeer || !prevWs || prevWs.readyState >= 2) {
        const ws = openLocketChatWs(
          localId,
          peerUid,
          idToken,
          (msgs) => socket.emit("new_message_with_user", tagConv(msgs)),
        );
        activeLocketWs.set(socket.id, ws);
      }
      activePeer.set(socket.id, peerUid);
    });

    // ── Cleanup ────────────────────────────────────────────
    socket.on("disconnect", () => {
      const ws = activeLocketWs.get(socket.id);
      if (ws && ws.readyState < 2) ws.close();
      activeLocketWs.delete(socket.id);
      convIdCache.delete(socket.id);
      activePeer.delete(socket.id);
    });
  });
}

module.exports = { setupChatNamespace };
