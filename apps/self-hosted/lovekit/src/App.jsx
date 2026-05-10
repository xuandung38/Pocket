import { useCallback, useEffect, useState } from "react";
import { Toaster } from "sonner";
import { SocketProvider } from "@/context/SocketContext";
import LoginScreen from "@/screens/LoginScreen";
import CameraScreen from "@/screens/CameraScreen";
import FeedScreen from "@/screens/FeedScreen";
import MessagesScreen from "@/screens/MessagesScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import { useSwipeNav } from "@/hooks/useSwipeNav";

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
  if (!payload?.exp) return true;
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

  const { onTouchStart, onTouchEnd } = useSwipeNav(navState, setNavState);

  const handleBackToCamera = useCallback(() => setNavState("camera"), []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("idToken");
    localStorage.removeItem("localId");
    localStorage.removeItem("refreshToken");
    sessionStorage.removeItem("idToken");
    sessionStorage.removeItem("localId");
    sessionStorage.removeItem("refreshToken");
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
    <div
      data-theme="lovekit"
      className="h-[100dvh] bg-base-100 text-base-content overflow-hidden"
    >
      <SocketProvider>
        <main
          className="relative h-full overflow-hidden"
          style={{ touchAction: "pan-y" }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div style={screenStyle("camera", navState)}>
            <CameraScreen isActive={navState === "camera"} />
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
    </div>
  );
}
