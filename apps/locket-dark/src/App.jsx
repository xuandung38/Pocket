import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

const CameraScreen = lazy(() => import("./screens/camera-screen"));
const FeedScreen = lazy(() => import("./screens/feed-screen"));
const MemoriesScreen = lazy(() => import("./screens/memories-screen"));
const ChatListScreen = lazy(() => import("./screens/chat-list-screen"));
const ChatDetailScreen = lazy(() => import("./screens/chat-detail-screen"));
const PhotoDetailScreen = lazy(() => import("./screens/photo-detail-screen"));
const SendScreen = lazy(() => import("./screens/send-screen"));
const LoginScreen = lazy(() => import("./screens/login-screen"));

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

// Mock auth — checks localStorage flag set by LoginScreen on submit
function isAuthenticated() {
  return localStorage.getItem("locket-auth") === "1";
}

// Gate any private route behind login
function RequireAuth({ children }) {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

export default function App() {
  return (
    <div className="phone-frame">
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/" element={<RequireAuth><CameraScreen /></RequireAuth>} />
          <Route path="/feed" element={<RequireAuth><FeedScreen /></RequireAuth>} />
          <Route path="/memories" element={<RequireAuth><MemoriesScreen /></RequireAuth>} />
          <Route path="/chats" element={<RequireAuth><ChatListScreen /></RequireAuth>} />
          <Route path="/chats/:id" element={<RequireAuth><ChatDetailScreen /></RequireAuth>} />
          <Route path="/photo/:id" element={<RequireAuth><PhotoDetailScreen /></RequireAuth>} />
          <Route path="/send" element={<RequireAuth><SendScreen /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}
