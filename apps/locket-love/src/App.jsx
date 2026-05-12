import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import { useAuthStore } from "@/stores";

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

// Gate any private route behind login. Reads reactively from useAuthStore so
// a logout / refresh-token-failure flips the gate without a hard navigate.
function RequireAuth({ children }) {
  const location = useLocation();
  const isAuth = useAuthStore((s) => s.isAuth);
  const loading = useAuthStore((s) => s.loading);

  // While bootstrap is running (e.g. cold-load with valid refresh token),
  // hold the gate open with a neutral splash so we don't redirect to /login
  // before we know the answer.
  if (loading) return <LoadingFallback />;
  if (!isAuth) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const init = useAuthStore((s) => s.init);
  const forceLogout = useAuthStore((s) => s.forceLogout);

  // 1) Synchronous hydrate from localStorage on first paint → flips `loading`
  //    to false so RequireAuth can render the right tree immediately.
  // 2) Async init revalidates the cached user profile against the backend.
  useEffect(() => {
    hydrate();
    init();
  }, [hydrate, init]);

  // axios.js dispatches `lk:auth:logout` whenever the refresh-token chain
  // gives up. We listen here (rather than inside the store) so the listener
  // is rebound on hot-reload and the store stays free of DOM coupling.
  useEffect(() => {
    const onLogout = () => forceLogout();
    window.addEventListener("lk:auth:logout", onLogout);
    return () => window.removeEventListener("lk:auth:logout", onLogout);
  }, [forceLogout]);

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
