import { createContext, useContext, useState, useEffect } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { getStoredToken } from "../services/api";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    let activeSocket = null;

    if (isAuthenticated && user) {
      const wsUrl = import.meta.env.VITE_WS_URL || "http://localhost:5000";
      activeSocket = io(wsUrl, {
        withCredentials: true,
        autoConnect: true,
        transports: ["websocket"],
        auth: {
          token: getStoredToken(),
        },
      });

      setSocket(activeSocket);
    } else {
      setSocket(null);
    }

    return () => {
      if (activeSocket) {
        activeSocket.disconnect();
      }
    };
  }, [isAuthenticated, user]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  const socket = useContext(SocketContext);
  return socket;
}

export default SocketContext;
