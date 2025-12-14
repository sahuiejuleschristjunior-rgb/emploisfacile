// frontend/src/pages/Messages.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "../styles/messages.css";
import { fetchFriends } from "../api/socialApi";
import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

const token = localStorage.getItem("token");
const me = JSON.parse(localStorage.getItem("user"));

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export default function Messages() {
  /* ================= STATE ================= */
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [errorFriends, setErrorFriends] = useState("");

  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversation, setLoadingConversation] = useState(false);

  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");

  const [showPlusMenu, setShowPlusMenu] = useState(false);

  const [recording, setRecording] = useState(false);
  const recordTimeout = useRef(null);

  const [reactionFor, setReactionFor] = useState(null);

  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [typingFromOther, setTypingFromOther] = useState(false);
  const typingTimeoutRef = useRef(null);

  const messagesEndRef = useRef(null);

  const socketRef = useRef(null);
  const myId = me?._id;

  /* ================= HELPERS ================= */
  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

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
      unreadCount: typeof f?.unreadCount === "number" ? f.unreadCount : 0,
    };
  };

  const normalizeMessage = (m) => {
    const senderId = typeof m?.sender === "object" ? m.sender?._id : m?.sender;
    const receiverId =
      typeof m?.receiver === "object" ? m.receiver?._id : m?.receiver;

    return {
      _id: m?._id || m?.id || "tmp-" + Date.now(),
      sender: senderId,
      receiver: receiverId,
      content: typeof m?.content === "string" ? m.content : "",
      createdAt: m?.createdAt || new Date().toISOString(),
      reactions: Array.isArray(m?.reactions) ? m.reactions : [],
      isRead: !!m?.isRead,
    };
  };

  /* ================= LOAD FRIENDS ================= */
  useEffect(() => {
    (async () => {
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
      } catch (e) {
        console.error(e);
        setErrorFriends("Erreur chargement amis");
        setFriends([]);
      } finally {
        setLoadingFriends(false);
      }
    })();
  }, []);

  /* ================= FILTER FRIENDS ================= */
  const filteredFriends = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => (f?.name || "").toLowerCase().includes(q));
  }, [friends, search]);

  /* ================= SOCKET: CONNECT ================= */
  useEffect(() => {
    if (!token || !myId || !SOCKET_URL) return;

    let isMounted = true;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["polling", "websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      if (!isMounted) return;
      // Optionnel: si ton serveur utilise join-room par userId:
      socket.emit("join", { userId: myId });
    });

    socket.on("user_online", (id) => {
      if (!isMounted) return;
      setOnlineUserIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    });

    socket.on("user_offline", (id) => {
      if (!isMounted) return;
      setOnlineUserIds((prev) => prev.filter((x) => x !== id));
    });

    // Réception message temps réel
    socket.on("new_message", (payload) => {
      if (!isMounted) return;

      const raw = payload?.message ? payload.message : payload;
      const msg = normalizeMessage(raw);

      // si le message concerne la conversation ouverte => push
      const otherId =
        String(msg.sender) === String(myId) ? msg.receiver : msg.sender;

      if (activeChat && String(activeChat._id) === String(otherId)) {
        setMessages((prev) => [...prev, msg]);
        setTimeout(scrollToBottom, 20);

        // marquer lu auto si on est sur le chat
        markAllRead(otherId);
      }

      // sinon: tu peux incrémenter unread côté friends si tu veux (optionnel)
    });

    // Typing
    socket.on("typing", ({ from }) => {
      if (!isMounted) return;
      if (!activeChat || String(from) !== String(activeChat._id)) return;

      setTypingFromOther(true);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setTypingFromOther(false);
      }, 1200);
    });

    return () => {
      isMounted = false;
      try {
        socket.disconnect();
      } catch {}
    };
    // ⚠️ important: activeChat dans deps => sinon socket.on voit pas chat courant
  }, [token, myId, SOCKET_URL, activeChat]);

  /* ================= LOAD CONVERSATION ================= */
  const loadConversation = async (user) => {
    if (!user?._id) return;

    setActiveChat(user);
    setMessages([]);
    setShowPlusMenu(false);
    setReactionFor(null);

    try {
      setLoadingConversation(true);

      const res = await fetch(`${API_URL}/messages/conversation/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      const list = Array.isArray(data) ? data.map(normalizeMessage) : [];
      setMessages(list);

      // marquer lus (API + socket)
      await markAllRead(user._id);
    } catch (err) {
      console.error("Erreur conversation", err);
      setMessages([]);
    } finally {
      setLoadingConversation(false);
      setTimeout(scrollToBottom, 50);
    }
  };

  /* ================= MARK ALL READ ================= */
  const markAllRead = useCallback(
    async (otherUserId) => {
      if (!token || !otherUserId) return;

      try {
        await fetch(`${API_URL}/messages/read-all/${otherUserId}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        });

        // update local state
        setMessages((prev) =>
          prev.map((m) =>
            String(m.receiver) === String(myId)
              ? { ...m, isRead: true }
              : m
          )
        );

        // ping socket (si ton serveur écoute)
        socketRef.current?.emit("messages_read", {
          readerId: myId,
          withUserId: otherUserId,
        });
      } catch {}
    },
    [token, myId]
  );

  /* ================= SEND MESSAGE ================= */
  const sendMessage = async () => {
    if (!activeChat || !input.trim()) return;

    const content = input.trim();
    setInput("");
    setShowPlusMenu(false);

    const tempId = "temp-" + Date.now();
    const temp = normalizeMessage({
      _id: tempId,
      sender: myId,
      receiver: activeChat._id,
      content,
      createdAt: new Date().toISOString(),
    });

    setMessages((prev) => [...prev, temp]);
    setTimeout(scrollToBottom, 20);

    try {
      const res = await fetch(`${API_URL}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ receiver: activeChat._id, content }),
      });

      const data = await res.json();

      if (res.ok && data?.data) {
        const saved = normalizeMessage(data.data);

        setMessages((prev) => prev.map((m) => (m._id === tempId ? saved : m)));

        // 🔥 Emit socket (si ton serveur écoute "send_message")
        socketRef.current?.emit("send_message", {
          receiver: activeChat._id,
          content,
        });
      }
    } catch (err) {
      console.error("Erreur envoi message", err);
    }
  };

  /* ================= TYPING EMIT ================= */
  const onChangeInput = (e) => {
    const v = e.target.value;
    setInput(v);

    if (activeChat?._id) {
      socketRef.current?.emit("typing", { to: activeChat._id });
    }
  };

  /* ================= VOICE (UI MOCK) ================= */
  const startRecord = () => {
    setRecording(true);
    recordTimeout.current = setTimeout(() => {
      // ici on branchera MediaRecorder après
    }, 250);
  };

  const stopRecord = () => {
    clearTimeout(recordTimeout.current);
    setRecording(false);
    // ici on enverra le fichier audio après
  };

  /* ================= REACTIONS (LOCAL) ================= */
  const addReaction = (msgId, emoji) => {
    setMessages((prev) =>
      prev.map((m) =>
        String(m._id) === String(msgId)
          ? { ...m, reactions: [...(m.reactions || []), emoji] }
          : m
      )
    );
    setReactionFor(null);

    // plus tard: POST /messages/:id/react + socket emit
  };

  /* ================= AUTO SCROLL ================= */
  useEffect(() => {
    setTimeout(scrollToBottom, 10);
  }, [messages]);

  /* ================= SVG ICONS ================= */
  const IconPlus = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );

  const IconSend = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 12l17-8-6.5 17-2.5-7L4 12z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );

  const IconMic = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 14a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v4a3 3 0 0 0 3 3z"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path
        d="M19 11a7 7 0 0 1-14 0"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M12 18v3"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );

  /* ================= UI ================= */
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
          {loadingFriends && <div className="messages-empty">Chargement…</div>}
          {!loadingFriends && errorFriends && (
            <div className="messages-empty">{errorFriends}</div>
          )}

          {!loadingFriends && !errorFriends && filteredFriends.length === 0 && (
            <div className="messages-empty">Aucun ami pour le moment</div>
          )}

          {filteredFriends.map((friend) => (
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
                  {onlineUserIds.includes(friend._id) ? "En ligne" : "Hors ligne"}
                </div>
              </div>

              {friend.unreadCount > 0 && (
                <div className="conv-unread-badge">{friend.unreadCount}</div>
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
                  setShowPlusMenu(false);
                  setReactionFor(null);
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
                <div className="chat-username">{activeChat.name}</div>
                <div className="chat-status">
                  {onlineUserIds.includes(activeChat._id)
                    ? "En ligne"
                    : "Hors ligne"}
                </div>
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
                messages.map((msg) => {
                  const senderId =
                    typeof msg.sender === "object" ? msg.sender?._id : msg.sender;

                  const isMe = String(senderId) === String(me?._id);

                  const id = msg._id || msg.id;

                  return (
                    <div
                      key={id}
                      className={`message-row ${isMe ? "me" : "other"}`}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setReactionFor(id);
                      }}
                      onClick={() => {
                        if (reactionFor) setReactionFor(null);
                      }}
                    >
                      <div className="message-bubble">
                        {msg.content}

                        {!!(msg.reactions || []).length && (
                          <div className="reaction-row">
                            {(msg.reactions || []).map((r, i) => (
                              <span key={i}>{r}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      {reactionFor === id && (
                        <div className="emoji-picker">
                          {EMOJIS.map((e) => (
                            <button
                              key={e}
                              type="button"
                              className="emoji-btn"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                addReaction(id, e);
                              }}
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

              {typingFromOther && (
                <div className="typing-indicator">
                  {activeChat.name} écrit…
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* INPUT */}
            <div className="chat-input-bar">
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowPlusMenu((p) => !p)}
                aria-label="Plus"
              >
                <IconPlus />
              </button>

              <input
                className="chat-input"
                placeholder="Message..."
                value={input}
                onChange={onChangeInput}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />

              <button
                type="button"
                className={`icon-btn ${recording ? "is-recording" : ""}`}
                onMouseDown={startRecord}
                onMouseUp={stopRecord}
                onTouchStart={startRecord}
                onTouchEnd={stopRecord}
                aria-label="Micro"
              >
                <IconMic />
              </button>

              <button
                type="button"
                className="icon-btn send"
                onClick={sendMessage}
                aria-label="Envoyer"
              >
                <IconSend />
              </button>

              {showPlusMenu && (
                <div className="plus-menu" onMouseLeave={() => setShowPlusMenu(false)}>
                  <button type="button" className="plus-item">📎 Fichier</button>
                  <button type="button" className="plus-item">🖼️ Image</button>
                  <button type="button" className="plus-item">📍 Localisation</button>
                  <button type="button" className="plus-item">🎤 Note vocale</button>
                </div>
              )}

              {recording && (
                <div className="recording-indicator">🎙️ Enregistrement…</div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}