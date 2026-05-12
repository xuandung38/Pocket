// chat.services.js
// Chat HTTP layer — routes through the self-hosted backend's /locket/proxy/*
// endpoints (whitelist: sendChatMessageV2, markAsRead, sendChatMessageReaction,
// deleteChatMessage; see api/src/controllers/locket.controller.js).
//
// All ops use the shared authenticated `api` client (auto-refresh + bearer
// injection). Real-time delivery of incoming messages is handled separately
// in `socket.service.js`.
//
// Public surface (consumed by chat screens + future chat store):
//   - sendMessage({ receiver_uid, message, moment_id? })
//   - markReadMessage(conversationId)
//   - sendReactionOnMessage({ messageId, emoji, conversationId })
//   - deleteMessage({ message_uid, conversation_uid })

import { api } from "@/libs";

// ---- UUID helper (matches lovekit format expected by Locket analytics) ----
// Inline rather than imported from a util to keep this module self-contained
// and avoid pulling in a util that doesn't yet exist in @/utils.
function generateUUIDv4Upper() {
  // Prefer crypto.randomUUID where available (all modern browsers + Node 19+)
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().toUpperCase();
  }
  // Fallback: RFC4122 v4 via getRandomValues
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Last-resort fallback (test environments without crypto)
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0"));
  return (
    `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-` +
    `${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-` +
    `${hex.slice(10, 16).join("")}`
  ).toUpperCase();
}

// Static analytics envelope expected by the Locket backend. Values mirror the
// lovekit reference implementation — backend ignores most fields but rejects
// payloads missing the `analytics` key.
const ANALYTICS_ENVELOPE = {
  amplitude: {
    device_id: "",          // filled per-call below
    session_id: -1,
  },
  google_analytics: {
    app_instance_id: "e88d4daed0ded172248753851bf67772",
  },
  android_version: "1.196.0",
  android_build: "406",
  platform: "android",
};

/**
 * Send a chat message to a friend.
 * @param {{ receiver_uid: string, message?: string, moment_id?: string|null }} payload
 * @returns parsed backend response (typically `{ data: { ... } }`)
 * @throws on transport / 4xx-5xx failure so the caller can rollback optimistic UI.
 */
export const sendMessage = async (payload) => {
  if (!payload?.receiver_uid) {
    throw new Error("sendMessage: receiver_uid is required");
  }

  const body = {
    data: {
      msg: payload.message || " ",
      analytics: {
        ...ANALYTICS_ENVELOPE,
        amplitude: { ...ANALYTICS_ENVELOPE.amplitude, device_id: generateUUIDv4Upper() },
      },
      client_token: generateUUIDv4Upper(),
      moment_uid: payload.moment_id || null,
      receiver_uid: payload.receiver_uid,
    },
  };

  try {
    const res = await api.post("/locket/proxy/sendChatMessageV2", body);
    return res.data;
  } catch (err) {
    console.error("[chat.services] sendMessage failed:", err?.response?.data || err?.message);
    throw err;
  }
};

/**
 * Mark a conversation as read on the server (read-receipt).
 * Quietly returns null on failure — read-receipts are best-effort and should
 * never break the chat experience.
 * @param {string} conversationId  friend uid OR conversation uid (Locket uses the same value)
 */
export const markReadMessage = async (conversationId) => {
  if (!conversationId) return null;
  try {
    const res = await api.post("/locket/proxy/markAsRead", {
      data: { conversation_uid: conversationId },
    });
    return res.data;
  } catch (err) {
    console.error("[chat.services] markReadMessage failed:", err?.message);
    return null;
  }
};

/**
 * Add / change an emoji reaction on a specific message.
 * @param {{ messageId: string, emoji: string, conversationId: string }} payload
 */
export const sendReactionOnMessage = async (payload) => {
  if (!payload?.messageId || !payload?.conversationId) {
    throw new Error("sendReactionOnMessage: messageId and conversationId are required");
  }
  const body = {
    data: {
      message_id: payload.messageId,
      emoji: payload.emoji || "",
      conversation_id: payload.conversationId,
    },
  };
  try {
    const res = await api.post("/locket/proxy/sendChatMessageReaction", body);
    return res.data;
  } catch (err) {
    console.error("[chat.services] sendReactionOnMessage failed:", err?.message);
    throw err;
  }
};

/**
 * Delete a single message (own messages only — backend enforces ownership).
 * @param {{ message_uid: string, conversation_uid: string }} payload
 */
export const deleteMessage = async (payload) => {
  if (!payload?.message_uid || !payload?.conversation_uid) {
    throw new Error("deleteMessage: message_uid and conversation_uid are required");
  }
  try {
    const res = await api.post("/locket/proxy/deleteChatMessage", {
      data: {
        message_uid: payload.message_uid,
        conversation_uid: payload.conversation_uid,
      },
    });
    return res.data;
  } catch (err) {
    console.error("[chat.services] deleteMessage failed:", err?.message);
    throw err;
  }
};
