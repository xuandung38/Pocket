import api from "@/lib/axios";
import { generateUUIDv4Upper } from "@/utils/generate/uuid";

// All chat ops route through self-hosted backend proxy.
// The api interceptor attaches the Authorization header — services
// no longer touch idToken or Locket-specific headers directly.

export const sendMessage = async (messageInfo) => {
  try {
    const body = {
      data: {
        msg: messageInfo.message || " ",
        analytics: {
          amplitude: {
            device_id: generateUUIDv4Upper(),
            session_id: -1,
          },
          google_analytics: {
            app_instance_id: "e88d4daed0ded172248753851bf67772",
          },
          android_version: "1.196.0",
          android_build: "406",
          platform: "android",
        },
        client_token: generateUUIDv4Upper(),
        moment_uid: messageInfo?.moment_id || null,
        receiver_uid: messageInfo.receiver_uid,
      },
    };

    const response = await api.post("/locket/proxy/sendChatMessageV2", body);
    return response.data;
  } catch (err) {
    console.error("sendMessage error:", err);
    throw err;
  }
};

export const markReadMessage = async (conversationId) => {
  try {
    const body = {
      data: {
        conversation_uid: conversationId,
      },
    };

    const response = await api.post("/locket/proxy/markAsRead", body);
    return response.data;
  } catch (err) {
    console.error("markReadMessage error:", err);
    throw err;
  }
};

export const sendReactionOnMessage = async (reactionData) => {
  try {
    const body = {
      data: {
        message_id: reactionData.messageId,
        emoji: reactionData.emoji,
        conversation_id: reactionData.conversationId,
      },
    };

    const response = await api.post(
      "/locket/proxy/sendChatMessageReaction",
      body
    );
    return response.data;
  } catch (err) {
    console.error("sendReactionOnMessage error:", err);
    throw err;
  }
};

export const deleteMessage = async (deleteData) => {
  try {
    const body = {
      data: {
        message_uid: deleteData.message_uid,
        conversation_uid: deleteData.conversation_uid,
      },
    };

    const response = await api.post("/locket/proxy/deleteChatMessage", body);
    return response.data;
  } catch (err) {
    console.error("deleteMessage error:", err);
    throw err;
  }
};
