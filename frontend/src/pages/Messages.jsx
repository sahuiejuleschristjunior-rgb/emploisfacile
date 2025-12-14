// frontend/src/pages/Messages.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/messages.css";
import { fetchFriends } from "../api/socialApi";

const API_URL = import.meta.env.VITE_API_URL;
const token = localStorage.getItem("token");
const me = JSON.parse(localStorage.getItem("user"));

/* =====================================================
   SVG ICONS (INLINE)
===================================================== */
function IconArrowLeft({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSendEnvelope({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M4.5 7.5h15v9h-15v-9Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 8.5 12 13l6.5-4.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* =====================================================
   REACTIONS
===================================================== */
const REACTIONS = ["❤️", "👍", "😂", "😮", "😢"];

export default function Messages() {
  /* ===================== STATE ===================== */
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [errorFriends, setErrorFriends] = useState("");

  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversation, setLoadingConversation] = useState(false);

  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");

  const [reactionMenu, setReactionMenu] = useState(null);

  const messagesEndRef = useRef(null);
  const longPressTimer = useRef(null);

  /* ===================== HELPERS ===================== */
  const normalizeFriend = (f) => {
    const userObj =
      f && typeof f.user === "object" && f.user
        ? f.user
        : typeof f === "object" && f?._id && f?.name
        ? f
        : null;

    return {
      _id: userObj?._id || f?._id,
      name: userObj?.name || f?.name || "Utilisateur",
      avatar: userObj?.avatar || f?.avatar || "/default-avatar.png",
      unreadCount: f?.unreadCount || 0,
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  /* ===================== LOAD FRIENDS ===================== */
  useEffect(() => {
    const loadFriends = async () => {
      try {
        setLoadingFriends(true);
        const data = await fetchFriends();
        const list = (data?.friends || []).map(normalizeFriend);
        setFriends(list);
      } catch {
        setErrorFriends("Erreur chargement amis");
      } finally {
        setLoadingFriends(false);
      }
    };
    loadFriends();
  }, []);

  /* ===================== FILTER ===================== */
  const filteredFriends = useMemo(() => {
    const q = search.toLowerCase();
    return friends.filter((f) => f.name.toLowerCase().includes(q));
  }, [friends, search]);

  /* ===================== LOAD CONVERSATION ===================== */
  const loadConversation = async (user) => {
    if (!user?._id) return;

    setActiveChat(user);
    setMessages([]);
    setLoadingConversation(true);

    try {
      const res = await fetch(
        `${API_URL}/messages/conversation/${user._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);

      fetch(`${API_URL}/messages/read-all/${user._id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      setMessages([]);
    } finally {
      setLoadingConversation(false);
      setTimeout(scrollToBottom, 50);
    }
  };

  /* ===================== SEND MESSAGE ===================== */
  const sendMessage = async () => {
    if (!input.trim() || !activeChat) return;

    const content = input.trim();
    setInput("");

    const temp = {
      _id: "tmp-" + Date.now(),
      sender: me?._id,
      content,
    };

    setMessages((p) => [...p, temp]);
    scrollToBottom();

    try {
      const res = await fetch(`${API_URL}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiver: activeChat._id,
          content,
        }),
      });

      const data = await res.json();
      if (res.ok && data?.data) {
        setMessages((p) =>
          p.map((m) => (m._id === temp._id ? data.data : m))
        );
      }
    } catch {}
  };

  useEffect(scrollToBottom, [messages]);

  /* ===================== UI ===================== */
  return (
    <div className={`messages-page ${activeChat ? "chat-open" : ""}`}>
      {/* ================= LEFT ================= */}
      <aside className="messages-sidebar">
        <div className="messages-sidebar-header">Messages</div>

        <div className="messages-search">
          <input
            placeholder="Rechercher un ami"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="messages-list">
          {loadingFriends && <div className="messages-empty">Chargement…</div>}
          {filteredFriends.map((f) => (
            <div
              key={f._id}
              className={`conversation-item ${
                activeChat?._id === f._id ? "active" : ""
              }`}
              onClick={() => loadConversation(f)}
            >
              <img src={f.avatar} className="conversation-avatar" />
              <div className="conversation-info">
                <div className="conversation-name">{f.name}</div>
                <div className="conversation-last-message">
                  Démarrer une conversation
                </div>
              </div>
              {f.unreadCount > 0 && (
                <div className="conv-unread-badge">{f.unreadCount}</div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* ================= RIGHT ================= */}
      <main className="messages-content">
        {!activeChat ? (
          <div className="messages-placeholder">
            <h3>Sélectionne un ami</h3>
          </div>
        ) : (
          <>
            {/* HEADER */}
            <div className="chat-header">
              <button
                className="chat-back-btn"
                onClick={() => setActiveChat(null)}
              >
                <IconArrowLeft />
              </button>
              <img src={activeChat.avatar} className="chat-avatar" />
              <div>
                <div className="chat-username">{activeChat.name}</div>
                <div className="chat-status">En ligne</div>
              </div>
            </div>

            {/* BODY */}
            <div className="chat-body">
              {messages.map((msg) => {
                const senderId =
                  typeof msg.sender === "object"
                    ? msg.sender?._id
                    : msg.sender;

                const isMe = senderId === me?._id;

                return (
                  <div
                    key={msg._id}
                    className={`message-row ${isMe ? "me" : "other"}`}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setReactionMenu({
                        id: msg._id,
                        x: e.clientX,
                        y: e.clientY,
                      });
                    }}
                    onTouchStart={(e) => {
                      longPressTimer.current = setTimeout(() => {
                        const t = e.touches[0];
                        setReactionMenu({
                          id: msg._id,
                          x: t.clientX,
                          y: t.clientY,
                        });
                      }, 600);
                    }}
                    onTouchEnd={() =>
                      clearTimeout(longPressTimer.current)
                    }
                  >
                    <div className="message-bubble">
                      {msg.content}
                      {msg.reaction && (
                        <div className="message-reaction">
                          {msg.reaction}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* REACTION MENU */}
            {reactionMenu && (
              <div
                className="reaction-menu"
                style={{
                  top: reactionMenu.y,
                  left: reactionMenu.x,
                }}
              >
                {REACTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m._id === reactionMenu.id
                            ? { ...m, reaction: r }
                            : m
                        )
                      );
                      setReactionMenu(null);
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}

            {/* INPUT */}
            <div className="chat-input-bar">
              <input
                className="chat-input"
                placeholder="Message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button className="chat-send-btn" onClick={sendMessage}>
                <IconSendEnvelope />
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}