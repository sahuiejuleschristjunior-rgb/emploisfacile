import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./notifications.css";

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);
  const [unread, setUnread] = useState(0);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const API_URL = import.meta.env.VITE_API_URL;

  /* ===========================
     CHARGEMENT INITIAL
  =========================== */
  useEffect(() => {
    if (!token) return;
    fetchUnreadCount();
    fetchNotifications();
  }, [token]);

  /* ===========================
     1) BADGE ROUGE (non lues)
  =========================== */
  const fetchUnreadCount = async () => {
    try {
      const res = await fetch(`${API_URL}/notifications/unread/count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setUnread(data.count || 0);
    } catch (e) {
      console.error("UNREAD ERROR", e);
    }
  };

  /* ===========================
     2) LISTE DES NOTIFS
  =========================== */
  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setList(data);
      }
    } catch (e) {
      console.error("LOAD ERROR", e);
    }
  };

  /* ===========================
     3) MARQUER COMME LUES
  =========================== */
  const markAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/notifications/read-all`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnread(0);
      setList((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      console.error("READ ALL ERROR", e);
    }
  };

  /* ===========================
     4) OUVERTURE MENU
  =========================== */
  const toggleMenu = async () => {
    const willOpen = !open;
    setOpen(willOpen);

    if (willOpen && unread > 0) {
      await markAllAsRead();
    }
  };

  /* ===========================
     5) CLIC NOTIFICATION
  =========================== */
  const handleNotifClick = (n) => {
    if (n.type === "friend_request") {
      navigate("/fb/relations"); // 🔥 PAGE DEMANDES D’AMIS
      return;
    }

    if (n.post?._id) {
      navigate(`/fb/post/${n.post._id}`);
      return;
    }

    if (n.from?._id) {
      navigate(`/profil/${n.from._id}`);
    }
  };

  /* ===========================
     6) TEXTE
  =========================== */
  const getMessage = (n) => {
    switch (n.type) {
      case "friend_request":
        return "vous a envoyé une demande d’ami.";
      case "friend_accept":
        return "a accepté votre demande d’ami.";
      case "like":
        return "a aimé votre publication.";
      case "comment":
        return `a commenté : "${(n.text || "").slice(0, 40)}"`;
      case "reply":
        return `a répondu : "${(n.text || "").slice(0, 40)}"`;
      case "message":
        return `vous a envoyé un message.`;
      case "follow":
        return "a commencé à vous suivre.";
      default:
        return "a effectué une action.";
    }
  };

  return (
    <div className="notif-wrapper">
      {/* 🔔 CLOCHE */}
      <button className="notif-btn" onClick={toggleMenu}>
        <span className="material-icons">notifications</span>
        {unread > 0 && <span className="notif-badge">{unread}</span>}
      </button>

      {/* POPUP */}
      {open && (
        <div className="notif-popup">
          <h4>Notifications</h4>

          {list.length === 0 ? (
            <div className="notif-empty">Aucune notification</div>
          ) : (
            list.map((n) => (
              <div
                key={n._id}
                className={`notif-item ${n.read ? "read" : "unread"}`}
                onClick={() => handleNotifClick(n)}
              >
                <strong>{n.from?.name || "Utilisateur"}</strong>{" "}
                {getMessage(n)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}