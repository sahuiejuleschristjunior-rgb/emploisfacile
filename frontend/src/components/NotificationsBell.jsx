import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./notifications.css";
import { useNotifications } from "../context/NotificationContext";
import { useActiveConversation } from "../context/ActiveConversationContext";

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { activeConversationId, isUserTyping } = useActiveConversation() || {};
  const { notifications = [], unreadCount = 0, markAllAsRead, removeNotifications } =
    useNotifications() || {};

  const isMessagesRoute = useMemo(
    () => location.pathname.startsWith("/messages"),
    [location.pathname]
  );

  const getNotifConversationId = (notif) =>
    notif?.conversationId ||
    (typeof notif?.conversation === "object"
      ? notif.conversation?._id
      : notif?.conversation) ||
    notif?.from?._id ||
    notif?.from;

  /* ===========================
     4) OUVERTURE MENU
  =========================== */
  const toggleMenu = async () => {
    const willOpen = !open;
    setOpen(willOpen);

    if (willOpen && unreadCount > 0) {
      await markAllAsRead?.();
    }
  };

  /* ===========================
     5) CLIC NOTIFICATION
  =========================== */
  const handleNotifClick = (n) => {
    const notifConversationId = getNotifConversationId(n);
    const matchesActiveConversation =
      activeConversationId &&
      notifConversationId &&
      String(activeConversationId) === String(notifConversationId);
    const shouldStayOnChat =
      isMessagesRoute && (matchesActiveConversation || isUserTyping);

    if (n.type === "friend_request") {
      navigate("/fb/relations"); // 🔥 PAGE DEMANDES D’AMIS
      return;
    }

    if (n.type === "message") {
      if (shouldStayOnChat) {
        if (matchesActiveConversation) {
          removeNotifications?.(
            (notif) =>
              notif.type === "message" &&
              String(getNotifConversationId(notif)) === String(notifConversationId)
          );
        }
        return;
      }

      if (notifConversationId) {
        navigate(`/messages?userId=${notifConversationId}`);
      } else {
        navigate("/messages");
      }
      setOpen(false);
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
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {/* POPUP */}
      {open && (
        <div className="notif-popup">
          <h4>Notifications</h4>

          {notifications.length === 0 ? (
            <div className="notif-empty">Aucune notification</div>
          ) : (
            notifications.map((n) => (
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