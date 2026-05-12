import { useCallback, useEffect, useState } from "react";
import { Toaster } from "sonner";
import { SocketProvider } from "@/context/SocketContext";
import { AppProvider, useApp } from "@/context/AppContext";
import LoginScreen from "@/screens/LoginScreen";
import CameraScreen from "@/screens/CameraScreen";
import FeedScreen from "@/screens/FeedScreen";
import MessagesScreen from "@/screens/MessagesScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import CropImageStudio from "@/components/CropImageStudio";
import FriendsSheet from "@/components/FriendsSheet";
import EmojiStudio from "@/components/EmojiStudio";
import OptionMoment from "@/components/OptionMoment";
import { useSwipeNav } from "@/hooks/useSwipeNav";
import { useAuthStore } from "@/stores";

// Closes overlay modals whenever the active screen changes.
// Must live inside AppProvider to access the shared navigation context.
function NavCloseEffect({ navState }) {
  const { navigation, post } = useApp();
  useEffect(() => {
    navigation?.setOptionModalOpen?.(false);
    post?.setShowEmojiPicker?.(false);
  }, [navState]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function decodeJwtPayload(token) {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const padded = part.replace(/-/g, "+").replace(/_/g, "/");
    const b64 = padded + "===".slice((padded.length + 3) % 4);
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function isTokenValid(token) {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  // Malformed/unparseable token → treat as invalid (was returning true incorrectly)
  if (!payload) return false;
  if (!payload.exp) return true;
  return payload.exp > Date.now() / 1000;
}

const NAV_KEYS = ["camera", "feed", "messages", "profile"];
const NAV_STORAGE_KEY = "lk:nav";

function readInitialNav() {
  const saved = sessionStorage.getItem(NAV_STORAGE_KEY);
  return NAV_KEYS.includes(saved) ? saved : "camera";
}

const TRANSITION = "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)";

function screenStyle(screen, navState) {
  const isActive = navState === screen;
  let transform = "";
  if (screen === "feed") transform = isActive ? "translateY(0)" : "translateY(-100%)";
  else if (screen === "messages") transform = isActive ? "translateX(0)" : "translateX(-100%)";
  else if (screen === "profile") transform = isActive ? "translateX(0)" : "translateX(100%)";

  return {
    position: "absolute",
    inset: 0,
    zIndex: isActive ? 10 : 5,
    transform,
    transition: TRANSITION,
    willChange: "transform",
    // visibility:hidden on inactive screens prevents cold-load flash
    // (transitions are transform-based, so slide-in still animates visibly)
    visibility: isActive ? "visible" : "hidden",
  };
}

export default function App() {
  const [authed, setAuthed] = useState(() =>
    isTokenValid(localStorage.getItem("idToken")),
  );
  const [navState, setNavState] = useState(readInitialNav);

  useEffect(() => {
    sessionStorage.setItem(NAV_STORAGE_KEY, navState);
  }, [navState]);

  // axios layer dispatches `lk:auth:logout` when refresh fails / 401 cannot be recovered.
  // We can't navigate to a /login route (this SPA has none), so flip auth state and
  // LoginScreen renders. Cleanup on unmount + hot-reload prevents duplicate listeners.
  useEffect(() => {
    const onLogout = () => setAuthed(false);
    window.addEventListener("lk:auth:logout", onLogout);
    return () => window.removeEventListener("lk:auth:logout", onLogout);
  }, []);

  const { onTouchStart, onTouchEnd } = useSwipeNav(navState, setNavState);

  const handleBackToCamera = useCallback(() => setNavState("camera"), []);

  const handleLogout = useCallback(async () => {
    // clearAndlogout (note lowercase 'l' — intentional method name) handles:
    // server logout, removeToken, clearAllDB, userData cache, axios cachedExp reset.
    try {
      await useAuthStore.getState().clearAndlogout();
    } catch {
      // Even on failure, force local logout so user isn't stuck
    }
    setAuthed(false);
  }, []);

  if (!authed) {
    return (
      <>
        <LoginScreen onLogin={() => setAuthed(true)} />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  return (
    <AppProvider>
      <NavCloseEffect navState={navState} />
      <div
        data-theme="lovekit"
        className="h-[100dvh] bg-base-100 text-base-content overflow-hidden"
      >
        <SocketProvider>
          <main
            className="relative h-full overflow-hidden"
            // "manipulation" allows native pan (children's pan-x/pan-y work) and pinch,
            // disables double-tap-zoom. JS swipe nav still fires via touchstart/touchend.
            // Previously "pan-y" blocked horizontal scrollers (e.g. FriendMomentRow).
            style={{ touchAction: "manipulation" }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div style={screenStyle("camera", navState)}>
              <CameraScreen isActive={navState === "camera"} onNavigate={setNavState} />
            </div>
            <div style={screenStyle("feed", navState)}>
              <FeedScreen onBack={handleBackToCamera} />
            </div>
            <div style={screenStyle("messages", navState)}>
              <MessagesScreen onBack={handleBackToCamera} />
            </div>
            <div style={screenStyle("profile", navState)}>
              <ProfileScreen onBack={handleBackToCamera} onLogout={handleLogout} />
            </div>
          </main>
        </SocketProvider>
        <Toaster position="top-center" richColors />
        {/* Overlay modals — self-contained, render null when closed */}
        <CropImageStudio />
        <FriendsSheet />
        <EmojiStudio />
        <OptionMoment />
      </div>
    </AppProvider>
  );
}
