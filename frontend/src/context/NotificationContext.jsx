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

  const computeUnread = (items) =>
    items.reduce((sum, n) => sum + (n.read ? 0 : 1), 0);

  const setNotificationsAndUnread = (updater) => {
    setNotifications((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      setUnreadCount(computeUnread(next));
      return next;
    });
  };

  const removeNotifications = (predicate) => {
    setNotificationsAndUnread((prev) =>
      prev.filter((n) => !predicate(n))
    );
  };

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
          setNotificationsAndUnread(data);
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
    const handleIncoming = (notif) => {
      if (!notif) return;

      const fromId = notif.from?._id || notif.from;

      if (notif.type === "friend_accept" || notif.type === "friend_reject") {
        removeNotifications(
          (n) =>
            n.type === "friend_request" &&
            String(n.from?._id || n.from) === String(fromId)
        );
      }

      setNotificationsAndUnread((prev) => {
        const exists = prev.some((n) => n._id === notif._id);
        if (exists) return prev;

        return [notif, ...prev].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
      });
    };

    s.on("notification:new", handleIncoming);

    return () => {
      s.off("notification:new", handleIncoming);
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
        setNotificationsAndUnread((prev) =>
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
    removeNotifications,
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
