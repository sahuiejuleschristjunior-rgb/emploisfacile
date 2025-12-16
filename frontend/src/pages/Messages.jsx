import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import "../styles/messages.css";
import { fetchFriends } from "../api/socialApi";

/* =====================================================
   CONFIG
===================================================== */
const API_URL = import.meta.env.VITE_API_URL;
const API_HOST = API_URL?.replace(/\/?api$/, "");
const SOCKET_URL = API_HOST || window.location.origin;

const token = localStorage.getItem("token");
const me = JSON.parse(localStorage.getItem("user") || "{}");

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

/* =====================================================
   ICONS
===================================================== */
const PlusIcon = () => <span>＋</span>;
const MicIcon = () => <span>🎤</span>;
const SendIcon = () => <span>➤</span>;
const EmojiIcon = () => <span>😊</span>;
const BackIcon = () => <span>←</span>;

/* =====================================================
   COMPONENT
===================================================== */
export default function Messages() {
  /* ===================== STATE ===================== */
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [errorFriends, setErrorFriends] = useState("");

  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]); // volontairement vide

  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");

  const socketRef = useRef(null);

  /* ===================== HELPERS ===================== */
  const normalizeFriend = (f) => {
    const u = f?.user || f;
    return {
      _id: u?._id,
      name: u?.name || "Utilisateur",
      avatar: u?.avatar || "/default-avatar.png",
      unreadCount: f?.unreadCount || 0,
    };
  };

  /* ===================== LOAD FRIENDS ===================== */
  useEffect(() => {
    const loadFriends = async () => {
      try {
        setLoadingFriends(true);
        const data = await fetchFriends();
        const list = (data?.friends || data || [])
          .map(normalizeFriend)
          .filter((u) => u?._id);
        setFriends(list);
      } catch (e) {
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
    return friends.filter((f) =>
      (f.name || "").toLowerCase().includes(q)
    );
  }, [friends, search]);

  /* ===================== SOCKET (NEUTRE) ===================== */
  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      path: "/socket.io/",
      auth: { token },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    // ⚠️ volontairement neutre
    socket.on("new_message", () => {});
    socket.on("audio_message", () => {});

    return () => socket.disconnect();
  }, []);

  /* ===================== CONVERSATION (DÉSACTIVÉE) ===================== */
  const loadConversation = (user) => {
    setActiveChat(user);
    setMessages([]); // volontairement vide
  };

  /* ===================== UI ===================== */
  return (
    <div className={`messages-page ${activeChat ? "chat-open" : ""}`}>
      {/* ============ SIDEBAR ============ */}
      <aside className="messages-sidebar">
        <div className="messages-sidebar-header">
          <h2>Messages</h2>
        </div>

        <input
          className="messages-search"
          placeholder="Rechercher"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="messages-list">
          {loadingFriends && <div>Chargement…</div>}
          {errorFriends && <div>{errorFriends}</div>}

          {!loadingFriends &&
            filteredFriends.map((friend) => (
              <div
                key={friend._id}
                className={`conversation-item ${
                  activeChat?._id === friend._id ? "active" : ""
                }`}
                onClick={() => loadConversation(friend)}
              >
                <img
                  src={friend.avatar}
                  alt={friend.name}
                  className="conversation-avatar"
                />
                <div className="conversation-info">
                  <div className="conversation-name">{friend.name}</div>
                  <div className="conversation-last-message">
                    Conversation désactivée
                  </div>
                </div>
              </div>
            ))}
        </div>
      </aside>

      {/* ============ CHAT ============ */}
      <main className="messages-content">
        {!activeChat ? (
          <div className="messages-placeholder">
            <h3>Sélectionne un ami</h3>
            <p>Base stable prête</p>
          </div>
        ) : (
          <>
            {/* HEADER */}
            <div className="chat-header">
              <button onClick={() => setActiveChat(null)}>
                <BackIcon />
              </button>
              <img
                src={activeChat.avatar}
                alt={activeChat.name}
                className="chat-avatar"
              />
              <strong>{activeChat.name}</strong>
            </div>

            {/* BODY */}
            <div className="chat-body">
              <div className="chat-empty">
                💡 Conversation temporairement désactivée<br />
                UI + Audio + Réactions OK
              </div>
            </div>

            {/* INPUT */}
            <div className="chat-input-bar">
              <input
                placeholder="Message…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled
              />
              <button disabled>
                <SendIcon />
              </button>
              <button disabled>
                <MicIcon />
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}