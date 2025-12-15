// src/context/SocketContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

    const instance = io(SOCKET_URL, {
      auth: { token },
      transports: ["polling", "websocket"],
      reconnection: true,
    });

    setSocket(instance);

    instance.on("connect", () =>
      console.log("🌐 SOCKET GLOBAL CONNECTÉ :", instance.id)
    );

    return () => {
      // ❗ on ne ferme PAS le socket en navigation
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
