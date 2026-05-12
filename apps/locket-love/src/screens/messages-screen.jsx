// Messages tab — thin alias around the existing chat list screen.
// Lets navigation shell import a canonical `messages-screen` entry point while
// the real implementation continues to live in chat-list-screen.jsx (kept to
// avoid touching files owned by other devs).
import ChatListScreen from "./chat-list-screen";

export default function MessagesScreen(props) {
  return <ChatListScreen {...props} />;
}
