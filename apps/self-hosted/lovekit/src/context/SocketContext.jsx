import { createSocket } from "@/socket/socketClient";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const user = useAuthStore((s) => s.user);
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const idToken = localStorage.getItem("idToken");
    if (!idToken || !user?.uid) return;

    const s = createSocket(idToken, {
      onConnect: () => setIsConnected(true),
      onDisconnect: () => setIsConnected(false),
      onError: () => setIsConnected(false),
    });
    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [user?.uid]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
