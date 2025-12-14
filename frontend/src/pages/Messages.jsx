// frontend/src/pages/Messages.jsx
import { useEffect, useState } from "react";
import "../styles/messages.css";
import { fetchFriends } from "../api/socialApi";

export default function Messages() {
  /* =====================================================
     STATE
  ===================================================== */
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [activeChat, setActiveChat] = useState(null);

  /* =====================================================
     LOAD FRIENDS (DB)
  ===================================================== */
  useEffect(() => {
    const loadFriends = async () => {
      try {
        setLoadingFriends(true);

        const data = await fetchFriends();

        // ✅ NORMALISATION SÉCURISÉE
        const list = Array.isArray(data?.friends)
          ? data.friends
              .map((f) => ({
                ...f.user,
                lastMessage: f.lastMessage || null,
                unreadCount: f.unreadCount || 0,
              }))
              .filter(Boolean)
          : [];

        setFriends(list);
      } catch (err) {
        console.error("Erreur chargement amis :", err);
        setFriends([]);
      } finally {
        setLoadingFriends(false);
      }
    };

    loadFriends();
  }, []);

  return (
    <div className={`messages-page ${activeChat ? "chat-open" : ""}`}>
      {/* =====================================================
          LEFT — LISTE DES CONVERSATIONS
      ===================================================== */}
      <aside className="messages-sidebar">
        <div className="messages-sidebar-header">
          <h2>Messages</h2>
        </div>

        <div className="messages-search">
          <input
            type="text"
            placeholder="Rechercher un ami ou une discussion"
          />
        </div>

        <div className="messages-list">
          {loadingFriends && (
            <div className="messages-empty">Chargement…</div>
          )}

          {!loadingFriends && friends.length === 0 && (
            <div className="messages-empty">
              Aucun ami ou conversation
            </div>
          )}

          {friends.map((friend) => (
            <div
              key={friend._id}
              className={`conversation-item ${
                activeChat?._id === friend._id ? "active" : ""
              }`}
              onClick={() => setActiveChat(friend)}
            >
              <img
                src={friend.avatar || "/default-avatar.png"}
                alt={friend.name}
                className="conversation-avatar"
              />

              <div className="conversation-info">
                <div className="conversation-name">
                  {friend.name}
                </div>

                <div className="conversation-last-message">
                  {friend.lastMessage
                    ? friend.lastMessage.content
                    : "Démarrer une conversation"}
                </div>
              </div>

              {friend.unreadCount > 0 && (
                <div className="conv-unread-badge">
                  {friend.unreadCount}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* =====================================================
          RIGHT — CHAT
      ===================================================== */}
      <main className="messages-content">
        {!activeChat ? (
          <div className="messages-placeholder">
            <h3>Sélectionne une conversation</h3>
            <p>
              Choisis un ami ou une discussion pour commencer à échanger.
            </p>
          </div>
        ) : (
          <>
            {/* ================= HEADER CHAT ================= */}
            <div className="chat-header">
              {/* 🔙 RETOUR MOBILE */}
              <button
                className="chat-back-btn"
                onClick={() => setActiveChat(null)}
              >
                ←
              </button>

              <img
                src={activeChat.avatar || "/default-avatar.png"}
                alt={activeChat.name}
                className="chat-avatar"
              />

              <div className="chat-user-info">
                <div className="chat-username">
                  {activeChat.name}
                </div>
                <div className="chat-status">
                  En ligne
                </div>
              </div>
            </div>

            {/* ================= BODY CHAT ================= */}
            <div className="chat-body">
              <div className="chat-empty">
                Aucun message pour le moment
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}