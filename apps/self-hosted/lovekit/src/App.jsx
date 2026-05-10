import { useCallback, useEffect, useState } from "react";
import { Toaster } from "sonner";
import { SocketProvider } from "@/context/SocketContext";
import LoginScreen from "@/screens/LoginScreen";
import CameraScreen from "@/screens/CameraScreen";
import FeedScreen from "@/screens/FeedScreen";
import MessagesScreen from "@/screens/MessagesScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import BottomTabBar from "@/components/ui/BottomTabBar";

function decodeJwtPayload(token) {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const padded = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded + "===".slice((padded.length + 3) % 4));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

function isTokenValid(token) {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true; // tokens without exp: trust until refresh layer rejects
  return payload.exp > Date.now() / 1000;
}

const TAB_KEYS = ["camera", "feed", "messages", "profile"];

function readInitialTab() {
  const saved = sessionStorage.getItem("lk:tab");
  return TAB_KEYS.includes(saved) ? saved : "feed";
}

export default function App() {
  const [authed, setAuthed] = useState(() =>
    isTokenValid(localStorage.getItem("idToken")),
  );
  const [activeTab, setActiveTab] = useState(readInitialTab);

  useEffect(() => {
    sessionStorage.setItem("lk:tab", activeTab);
  }, [activeTab]);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

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
      className="h-[100dvh] flex flex-col bg-base-100 text-base-content overflow-hidden"
    >
      <SocketProvider>
        <main className="flex-1 overflow-hidden relative pb-16">
          <CameraScreen
            className={activeTab === "camera" ? "block" : "hidden"}
          />
          <FeedScreen
            className={activeTab === "feed" ? "block" : "hidden"}
          />
          <MessagesScreen
            className={activeTab === "messages" ? "block" : "hidden"}
          />
          <ProfileScreen
            className={activeTab === "profile" ? "block" : "hidden"}
            onLogout={handleLogout}
          />
        </main>
        <BottomTabBar active={activeTab} onChange={handleTabChange} />
      </SocketProvider>
      <Toaster position="top-center" richColors />
    </div>
  );
}
