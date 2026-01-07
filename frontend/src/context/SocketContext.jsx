// src/context/SocketContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return undefined;

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["polling", "websocket"],
      reconnection: true,
    });

    setSocket(socket);

    const handleConnect = () => {
      console.log("🌐 SOCKET GLOBAL CONNECTÉ :", socket.id);
    };

    socket.on("connect", handleConnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.disconnect();
      setSocket(null);
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
