// frontend/src/pages/Messages.jsx
import { useEffect, useMemo, useState } from "react";
import "../styles/messages.css";
import { fetchFriends } from "../api/socialApi";

export default function Messages() {
  /* =====================================================
     STATE
  ===================================================== */
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [activeChat, setActiveChat] = useState(null);
  const [search, setSearch] = useState("");
  const [errorFriends, setErrorFriends] = useState("");

  /* =====================================================
     HELPERS
  ===================================================== */
  const normalizeFriend = (f) => {
    // f peut être:
    // 1) { user: { _id, name, avatar }, category }
    // 2) { user: "ObjectId", category }
    // 3) parfois { _id, name, avatar } (si tu changes côté API plus tard)

    const userObj =
      f && typeof f.user === "object" && f.user
        ? f.user
        : typeof f === "object" && f?._id && f?.name
        ? f
        : null;

    const userId =
      userObj?._id ||
      (typeof f?.user === "string" ? f.user : null) ||
      f?._id ||
      null;

    return {
      _id: userId,
      name: userObj?.name || f?.name || "Utilisateur",
      avatar: userObj?.avatar || f?.avatar || "/default-avatar.png",
      // compat: parfois tu avais relationCategory au lieu de category
      category: f?.category || f?.relationCategory || "public",
      lastMessage: f?.lastMessage || null,
      unreadCount: typeof f?.unreadCount === "number" ? f.unreadCount : 0,
    };
  };

  /* =====================================================
     LOAD FRIENDS (DB)
  ===================================================== */
  useEffect(() => {
    const loadFriends = async () => {
      try {
        setLoadingFriends(true);
        setErrorFriends("");

        const data = await fetchFriends();

        // ✅ support: fetchFriends() peut renvoyer [] OU { friends: [] }
        const raw = Array.isArray(data)
          ? data
          : Array.isArray(data?.friends)
          ? data.friends
          : [];

        const list = raw
          .map(normalizeFriend)
          .filter((u) => u && u._id); // garde seulement ceux avec id

        setFriends(list);
      } catch (err) {
        console.error("Erreur chargement amis :", err);
        setErrorFriends(err?.message || "Erreur chargement amis");
        setFriends([]);
      } finally {
        setLoadingFriends(false);
      }
    };

    loadFriends();
  }, []);

  /* =====================================================
     FILTER
  ===================================================== */
  const filteredFriends = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return friends;

    return friends.filter((f) =>
      (f?.name || "").toLowerCase().includes(q)
    );
  }, [friends, search]);

  /* =====================================================
     UI
  ===================================================== */
  return (
    <div className={`messages-page ${activeChat ? "chat-open" : ""}`}>
      {/* =====================================================
          LEFT — LISTE DES AMIS
      ===================================================== */}
      <aside className="messages-sidebar">
        <div className="messages-sidebar-header">
          <h2>Messages</h2>
        </div>

        <div className="messages-search">
          <input
            type="text"
            placeholder="Rechercher un ami"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="messages-list">
          {loadingFriends && (
            <div className="messages-empty">Chargement…</div>
          )}

          {!loadingFriends && errorFriends && (
            <div className="messages-empty">
              {errorFriends}
            </div>
          )}

          {!loadingFriends && !errorFriends && filteredFriends.length === 0 && (
            <div className="messages-empty">
              Aucun ami pour le moment
            </div>
          )}

          {filteredFriends.map((friend) => (
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
                  Démarrer une conversation
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
            <h3>Sélectionne un ami</h3>
            <p>
              Clique sur un ami pour commencer une conversation.
            </p>
          </div>
        ) : (
          <>
            {/* ================= HEADER CHAT ================= */}
            <div className="chat-header">
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