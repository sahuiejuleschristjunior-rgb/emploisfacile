// src/context/NotificationContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const API_ROOT = import.meta.env.VITE_API_URL;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL; // 🔥 Correction propre

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  /* ============================================================
     INIT SOCKET + FETCH NOTIFICATIONS 
  ============================================================ */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    // 1) Connexion socket.io
    const s = io(SOCKET_URL, {
      transports: ["websocket"],
      auth: { token },
    });

    setSocket(s);

    // 2) Charger compteur non lus
    const fetchUnread = async () => {
      try {
        const res = await fetch(`${API_ROOT}/notifications/unread/count`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (res.ok) setUnreadCount(data.count || 0);
      } catch (e) {
        console.error("UNREAD COUNT ERROR:", e);
      }
    };

    // 3) Charger toutes les notifications
    const fetchList = async () => {
      try {
        const res = await fetch(`${API_ROOT}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          // Trier desc
          data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setNotifications(data);
        }
      } catch (e) {
        console.error("NOTIF LIST ERROR:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchUnread();
    fetchList();

    // 4) Écouter notifications en temps réel
    s.on("notification:new", (notif) => {
      setNotifications((prev) => {
        const exists = prev.some((n) => n._id === notif._id);
        if (exists) return prev;

        return [notif, ...prev].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
      });

      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      s.off("notification:new");
      s.disconnect(); // 🔥 Correction
    };
  }, []);

  /* ============================================================
     MARQUER TOUT COMME LU
  ============================================================ */
  const markAllAsRead = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_ROOT}/notifications/read-all`, {
        method: "PUT", // 🔥 Correction POST → PUT
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setUnreadCount(0);
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read: true }))
        );
      }
    } catch (e) {
      console.error("MARK ALL READ ERROR:", e);
    }
  };

  const value = {
    socket,
    notifications,
    unreadCount,
    loading,
    markAllAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
