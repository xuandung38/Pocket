import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { MessageCircle } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import ConversationItem from "@/components/ConversationItem";
import ChatDetail from "@/components/ChatDetail";
import { useMessagesStore } from "@/stores/useMessagesStore";
import { useFriendStoreV2 } from "@/stores/friendStore";
import { useSocket } from "@/context/SocketContext";

export default function MessagesScreen({ className }) {
  const [activeChatId, setActiveChatId] = useState(null);

  const {
    conversations,
    loading,
    fetchConversations,
    upsertConversation,
    addMessageWithUserV2,
  } = useMessagesStore();

  const friendDetailsMap = useFriendStoreV2((s) => s.friendDetailsMap);
  const loadFriends = useFriendStoreV2((s) => s.loadFriends);
  const { socket } = useSocket();

  // Initial fetch
  useEffect(() => {
    fetchConversations();
    loadFriends();
  }, [fetchConversations, loadFriends]);

  // Socket: refresh conversation list on incoming list updates
  useEffect(() => {
    if (!socket) return;

    const onListMessage = (data) => {
      if (!Array.isArray(data) || !data.length) return;
      data.forEach(upsertConversation);
    };
    const onMessageWithUser = (data) => {
      if (!data) return;
      const items = Array.isArray(data) ? data : [data];
      items.forEach((msg) => {
        if (!msg?.uid) return;
        addMessageWithUserV2(msg.uid, msg);
      });
    };

    socket.on("new_on_list_message", onListMessage);
    socket.on("new_message_with_user", onMessageWithUser);
    socket.emit("get_list_message");

    return () => {
      socket.off("new_on_list_message", onListMessage);
      socket.off("new_message_with_user", onMessageWithUser);
    };
  }, [socket, upsertConversation, addMessageWithUserV2]);

  // Subscribe to messages of the active chat
  useEffect(() => {
    if (!socket || !activeChatId) return;
    const conv = conversations.find((c) => c.uid === activeChatId);
    socket.emit("get_messages_with_user", {
      messageId: activeChatId,
      otherUserId: conv?.with_user,
      timestamp: null,
    });
  }, [socket, activeChatId, conversations]);

  const sorted = useMemo(() => {
    return [...(conversations || [])].sort(
      (a, b) =>
        Number(b.latestMessage?.createdAt || b.update_time || 0) -
        Number(a.latestMessage?.createdAt || a.update_time || 0),
    );
  }, [conversations]);

  const activeConversation = activeChatId
    ? sorted.find((c) => c.uid === activeChatId)
    : null;
  const activeFriend = activeConversation
    ? friendDetailsMap?.[activeConversation.with_user] || null
    : null;

  return (
    <section
      role="tabpanel"
      aria-label="Chats"
      className={clsx("h-full w-full overflow-y-auto", className)}
    >
      <header className="sticky top-0 z-10 bg-base-100/95 backdrop-blur px-4 py-3 border-b border-base-200">
        <h1 className="text-xl font-bold text-base-content">Tin nhắn</h1>
      </header>

      <div className="px-2 py-2">
        {loading && sorted.length === 0 ? (
          <LoadingSkeleton variant="list" count={5} className="px-2" />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="Chưa có cuộc trò chuyện"
            subtitle="Hãy gửi một moment hoặc bắt đầu nhắn tin với bạn bè."
          />
        ) : (
          <ul className="flex flex-col gap-1">
            {sorted.map((conv) => (
              <li key={conv.uid}>
                <ConversationItem
                  conversation={conv}
                  friend={friendDetailsMap?.[conv.with_user] || null}
                  onClick={() => setActiveChatId(conv.uid)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <ChatDetail
        conversation={activeConversation}
        friend={activeFriend}
        open={Boolean(activeChatId)}
        onClose={() => setActiveChatId(null)}
      />
    </section>
  );
}
