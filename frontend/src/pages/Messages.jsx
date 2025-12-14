// frontend/src/pages/Messages.jsx
import { useEffect, useMemo, useState } from "react";
import "../styles/messages.css";
import { fetchFriends } from "../api/socialApi";

const API_URL = import.meta.env.VITE_API_URL;
const token = localStorage.getItem("token");
const me = JSON.parse(localStorage.getItem("user"));

export default function Messages() {
  /* =====================================================
     STATE
  ===================================================== */
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [errorFriends, setErrorFriends] = useState("");

  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversation, setLoadingConversation] = useState(false);

  const [search, setSearch] = useState("");

  /* =====================================================
     HELPERS
  ===================================================== */
  const normalizeFriend = (f) => {
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
      category: f?.category || "public",
      unreadCount: typeof f?.unreadCount === "number" ? f.unreadCount : 0,
    };
  };

  /* =====================================================
     LOAD FRIENDS
  ===================================================== */
  useEffect(() => {
    const loadFriends = async () => {
      try {
        setLoadingFriends(true);
        setErrorFriends("");

        const data = await fetchFriends();
        const raw = Array.isArray(data)
          ? data
          : Array.isArray(data?.friends)
          ? data.friends
          : [];

        const list = raw
          .map(normalizeFriend)
          .filter((u) => u && u._id);

        setFriends(list);
      } catch (err) {
        console.error("Erreur chargement amis :", err);
        setErrorFriends("Erreur chargement amis");
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
    const q = search.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) =>
      (f.name || "").toLowerCase().includes(q)
    );
  }, [friends, search]);

  /* =====================================================
     LOAD CONVERSATION
  ===================================================== */
  const loadConversation = async (userId) => {
    if (!userId) return;

    try {
      setLoadingConversation(true);
      setMessages([]);

      const res = await fetch(
        `${API_URL}/messages/conversation/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.error(data);
        setMessages([]);
        return;
      }

      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erreur conversation", err);
      setMessages([]);
    } finally {
      setLoadingConversation(false);
    }
  };

  /* =====================================================
     UI
  ===================================================== */
  return (
    <div className={`messages-page ${activeChat ? "chat-open" : ""}`}>
      {/* ================= LEFT — AMIS ================= */}
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
            <div className="messages-empty">{errorFriends}</div>
          )}

          {!loadingFriends &&
            !errorFriends &&
            filteredFriends.length === 0 && (
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
              onClick={() => {
                setActiveChat(friend);
                loadConversation(friend._id);
              }}
            >
              <img
                src={friend.avatar}
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

      {/* ================= RIGHT — CHAT ================= */}
      <main className="messages-content">
        {!activeChat ? (
          <div className="messages-placeholder">
            <h3>Sélectionne un ami</h3>
            <p>Clique sur un ami pour commencer une conversation.</p>
          </div>
        ) : (
          <>
            {/* HEADER */}
            <div className="chat-header">
              <button
                className="chat-back-btn"
                onClick={() => {
                  setActiveChat(null);
                  setMessages([]);
                }}
              >
                ←
              </button>

              <img
                src={activeChat.avatar}
                alt={activeChat.name}
                className="chat-avatar"
              />

              <div className="chat-user-info">
                <div className="chat-username">
                  {activeChat.name}
                </div>
                <div className="chat-status">En ligne</div>
              </div>
            </div>

            {/* BODY */}
            <div className="chat-body">
              {loadingConversation && (
                <div className="chat-empty">Chargement…</div>
              )}

              {!loadingConversation && messages.length === 0 && (
                <div className="chat-empty">
                  Aucun message pour le moment  
                  <br />
                  Commence la conversation 👋
                </div>
              )}

              {!loadingConversation &&
                messages.map((msg) => (
                  <div
                    key={msg._id}
                    className={`message-bubble ${
                      msg.sender === me?._id ? "me" : "other"
                    }`}
                  >
                    {msg.content}
                  </div>
                ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}