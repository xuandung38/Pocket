import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import { useAuthStore } from "@/stores";
import { AppProvider } from "@/context/AppContext";
import OptionMoment from "@/components/option-moment";
import GlobalReactionEffect from "@/components/ui/global-reaction-effect";
import AppErrorBoundary from "@/components/ui/app-error-boundary";

// Retry once on chunk load failure (common after deploy when old chunks are purged)
function lazyWithRetry(importFn) {
  return lazy(() =>
    importFn().catch(() => {
      window.location.reload();
      return importFn();
    })
  );
}

const CameraScreen = lazyWithRetry(() => import("./screens/camera-screen"));
const FeedScreen = lazyWithRetry(() => import("./screens/feed-screen"));
const GridScreen = lazyWithRetry(() => import("./screens/grid-screen"));
const MemoriesScreen = lazyWithRetry(() => import("./screens/memories-screen"));
const ChatListScreen = lazyWithRetry(() => import("./screens/chat-list-screen"));
const ChatDetailScreen = lazyWithRetry(() => import("./screens/chat-detail-screen"));
const PhotoDetailScreen = lazyWithRetry(() => import("./screens/photo-detail-screen"));
const LoginScreen = lazyWithRetry(() => import("./screens/login-screen"));
const MessagesScreen = lazyWithRetry(() => import("./screens/messages-screen"));
const ActivityScreen = lazyWithRetry(() => import("./screens/activity-screen"));
const ProfileScreen = lazyWithRetry(() => import("./screens/profile-screen"));

// Minimal loading fallback — dark OLED bg to avoid flash
function LoadingFallback() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#0c0c0c",
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
    // AppProvider wraps the whole tree so any authed screen (and the login
    // screen, harmlessly) can call useAppContext() without a re-mount cost.
    // Sits inside RequireAuth tree-side via routes, but lifting it to the
    // root keeps the provider stable across navigations.
    <AppProvider>
      <div className="phone-frame">
        <AppErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/" element={<RequireAuth><CameraScreen /></RequireAuth>} />
            <Route path="/feed" element={<RequireAuth><FeedScreen /></RequireAuth>} />
            <Route path="/grid" element={<RequireAuth><GridScreen /></RequireAuth>} />
            <Route path="/memories" element={<RequireAuth><MemoriesScreen /></RequireAuth>} />
            <Route path="/chats" element={<RequireAuth><ChatListScreen /></RequireAuth>} />
            <Route path="/chats/:id" element={<RequireAuth><ChatDetailScreen /></RequireAuth>} />
            <Route path="/photo/:id" element={<RequireAuth><PhotoDetailScreen /></RequireAuth>} />
            {/* Tab destinations added by dev-10 nav shell. Real screens land in later phases. */}
            <Route path="/messages" element={<RequireAuth><MessagesScreen /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><ProfileScreen /></RequireAuth>} />
            <Route path="/activity" element={<RequireAuth><ActivityScreen /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        </AppErrorBoundary>
        {/* Global overlay — controlled by AppContext modals.optionMoment.
            Mounted once so any screen can trigger the sheet without remount. */}
        <OptionMoment />
        {/* Reaction burst — subscribes to useReactionStore; pointer-events:none
            so it never blocks taps. Mounted inside AppProvider for consistency
            though zustand store is global regardless of tree position. */}
        <GlobalReactionEffect />
      </div>
    </AppProvider>
  );
}
