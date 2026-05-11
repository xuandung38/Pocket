import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

const CameraScreen = lazy(() => import("./screens/camera-screen"));
const FeedScreen = lazy(() => import("./screens/feed-screen"));
const MemoriesScreen = lazy(() => import("./screens/memories-screen"));
const ChatListScreen = lazy(() => import("./screens/chat-list-screen"));
const ChatDetailScreen = lazy(() => import("./screens/chat-detail-screen"));
const PhotoDetailScreen = lazy(() => import("./screens/photo-detail-screen"));
const SendScreen = lazy(() => import("./screens/send-screen"));

// Minimal loading fallback — dark OLED bg to avoid flash
function LoadingFallback() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--bg-primary)",
      }}
    />
  );
}

export default function App() {
  return (
    <div className="phone-frame">
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<CameraScreen />} />
          <Route path="/feed" element={<FeedScreen />} />
          <Route path="/memories" element={<MemoriesScreen />} />
          <Route path="/chats" element={<ChatListScreen />} />
          <Route path="/chats/:id" element={<ChatDetailScreen />} />
          <Route path="/photo/:id" element={<PhotoDetailScreen />} />
          <Route path="/send" element={<SendScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}
