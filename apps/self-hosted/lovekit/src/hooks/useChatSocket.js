// hooks/useChatSocket.js
// Deprecated: use SocketContext directly (see MessagesScreen.jsx).
// Retained for backward-compat only — do not consume in new code.
import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { upsertConversations } from "@/cache/chatsDB";
import { SocketEvent } from "@/constants/socketEvents";
import { API_ENDPOINTS } from "@/config/apiConfig";

export const useChatSocket = (idToken, selectedChat, setMessages, setChatMessages) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!idToken) return;

    const socketClient = io(`${API_ENDPOINTS.socketUrl}/chat`, {
      transports: ["websocket"],
      auth: { token: idToken },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketClient.connect();
    setSocket(socketClient);

    // ====== Core events ======
    socketClient.on(SocketEvent.CONNECT, () => setIsConnected(true));
    socketClient.on(SocketEvent.DISCONNECT, () => setIsConnected(false));
    socketClient.on(SocketEvent.CONNECT_ERROR, () => setIsConnected(false));

    // ====== Conversation list ======
    socketClient.emit(SocketEvent.GET_LIST_MESSAGE);

    socketClient.on(SocketEvent.NEW_ON_LIST_MESSAGE, async (data) => {
      if (!Array.isArray(data) || !data.length) return;
      setMessages((prev) => {
        const merged = [...prev];
        data.forEach((newConv) => {
          const index = merged.findIndex((c) => c.uid === newConv.uid);
          if (index > -1) merged[index] = { ...merged[index], ...newConv };
          else merged.unshift(newConv);
        });
        return merged;
      });
      await upsertConversations(data);
    });

    // ====== Messages with specific user (history + real-time) ======
    socketClient.on(SocketEvent.NEW_MESSAGE_WITH_USER, (msgs) => {
      const items = Array.isArray(msgs) ? msgs : [msgs];
      if (!items.length) return;

      setChatMessages((prev) => {
        const merged = [...prev];
        items.forEach((msg) => {
          if (!merged.find((m) => m.id === msg.id)) merged.push(msg);
        });
        return merged.sort((a, b) => a.createdAt - b.createdAt);
      });

      // Update latest message in conversation list
      const latest = items[items.length - 1];
      if (latest?.sender) {
        setMessages((prev) => {
          const withUser = latest.sender !== selectedChat?.uid ? latest.sender : selectedChat?.uid;
          const index = prev.findIndex((c) => c.uid === withUser);
          if (index > -1) {
            const updated = [...prev];
            updated[index] = { ...updated[index], latestMessage: latest };
            return updated;
          }
          return prev;
        });
      }
    });

    return () => {
      socketClient.disconnect();
      setSocket(null);
    };
  }, [idToken]);

  // helper: gửi request lấy messages với user
  const fetchMessagesWithUser = (chatId) => {
    if (!socket) return;
    socket.emit(SocketEvent.GET_MESSAGES_WITH_USER, { messageId: chatId });
  };

  return { socket, isConnected, fetchMessagesWithUser };
};
