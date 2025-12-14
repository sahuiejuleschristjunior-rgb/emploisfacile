// frontend/src/pages/Messages.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/messages.css";
import { fetchFriends } from "../api/socialApi";

const API_URL = import.meta.env.VITE_API_URL;
const API_HOST = API_URL?.replace(/\/?api$/, "");
const token = localStorage.getItem("token");
const me = JSON.parse(localStorage.getItem("user"));
const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

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

  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [reactionPicker, setReactionPicker] = useState({
    messageId: null,
    x: 0,
    y: 0,
  });

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const audioRefs = useRef({});
  const [audioStatus, setAudioStatus] = useState({});

  const messagesEndRef = useRef(null);
  const attachMenuRef = useRef(null);
  const longPressTimer = useRef(null);
  const typingTimeoutRef = useRef(null);

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
      unreadCount: typeof f?.unreadCount === "number" ? f.unreadCount : 0,
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const resolveUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("blob:")) return url;
    if (url.startsWith("http")) return url;
    return `${API_HOST || ""}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const formatTime = (time) => {
    if (!time && time !== 0) return "0:00";
    const total = Math.floor(time);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
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
    return friends.filter((f) => (f.name || "").toLowerCase().includes(q));
  }, [friends, search]);

  /* =====================================================
     LOAD CONVERSATION
  ===================================================== */
  const loadConversation = async (user) => {
    if (!user?._id) return;

    setActiveChat(user);
    setMessages([]);

    try {
      setLoadingConversation(true);

      const res = await fetch(`${API_URL}/messages/conversation/${user._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);

      fetch(`${API_URL}/messages/read-all/${user._id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.error("Erreur conversation", err);
      setMessages([]);
    } finally {
      setLoadingConversation(false);
      setTimeout(scrollToBottom, 50);
    }
  };

  /* =====================================================
     SEND MESSAGE
  ===================================================== */
  const sendMessage = async () => {
    if (!input.trim() || !activeChat) return;

    const content = input.trim();
    setInput("");

    const tempMessage = {
      _id: "temp-" + Date.now(),
      sender: me?._id,
      receiver: activeChat._id,
      content,
      type: "text",
    };

    setMessages((prev) => [...prev, tempMessage]);
    setTimeout(scrollToBottom, 10);

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
        setMessages((prev) =>
          prev.map((m) => (m._id === tempMessage._id ? data.data : m))
        );
      }
    } catch (err) {
      console.error("Erreur envoi message", err);
    }
  };

  /* =====================================================
     AUDIO
  ===================================================== */
  const startRecording = async () => {
    if (!activeChat) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      recordingChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordingChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, {
          type: "audio/webm",
        });
        stream.getTracks().forEach((t) => t.stop());
        uploadAudio(blob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Erreur accès micro", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const uploadAudio = async (blob) => {
    if (!activeChat) return;
    const fileName = `voice-${Date.now()}.webm`;

    const tempUrl = URL.createObjectURL(blob);
    const tempMessage = {
      _id: "temp-" + Date.now(),
      sender: me?._id,
      receiver: activeChat._id,
      type: "audio",
      audioUrl: tempUrl,
      content: "",
    };

    setMessages((prev) => [...prev, tempMessage]);

    const formData = new FormData();
    formData.append("audio", blob, fileName);
    formData.append("receiver", activeChat._id);

    try {
      const res = await fetch(`${API_URL}/messages/audio`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data?.data) {
        setMessages((prev) =>
          prev.map((m) => (m._id === tempMessage._id ? data.data : m))
        );
      }
    } catch (err) {
      console.error("Erreur upload audio", err);
    } finally {
      setTimeout(scrollToBottom, 30);
    }
  };

  const togglePlay = (messageId) => {
    const audio = audioRefs.current[messageId];
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  };

  const bindAudioRef = (msg, node) => {
    if (!node) return;
    audioRefs.current[msg._id] = node;

    const updateStatus = () => {
      setAudioStatus((prev) => ({
        ...prev,
        [msg._id]: {
          ...(prev[msg._id] || {}),
          duration: node.duration || 0,
          currentTime: node.currentTime || 0,
          playing: !node.paused,
        },
      }));
    };

    node.onloadedmetadata = updateStatus;
    node.ontimeupdate = updateStatus;
    node.onplay = updateStatus;
    node.onpause = updateStatus;
    node.onended = () => {
      node.currentTime = 0;
      updateStatus();
    };
  };

  /* =====================================================
     REACTIONS
  ===================================================== */
  const sendReaction = async (messageId, emoji) => {
    try {
      const res = await fetch(`${API_URL}/messages/${messageId}/react`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emoji }),
      });
      const data = await res.json();
      if (res.ok && data?.data) {
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? data.data : m))
        );
      }
    } catch (err) {
      console.error("Erreur réaction", err);
    } finally {
      setReactionPicker({ messageId: null, x: 0, y: 0 });
    }
  };

  const handleBubblePressStart = (msg, event) => {
    event.preventDefault();
    const target = event.currentTarget;
    clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      const rect = target.getBoundingClientRect();
      setReactionPicker({
        messageId: msg._id,
        x: rect.left + rect.width / 2,
        y: rect.top - 12,
      });
    }, 450);
  };

  const handleBubblePressEnd = () => {
    clearTimeout(longPressTimer.current);
  };

  useEffect(() => {
    const closePicker = (e) => {
      if (
        reactionPicker.messageId &&
        !e.target.closest?.(".reaction-picker")
      ) {
        setReactionPicker({ messageId: null, x: 0, y: 0 });
      }
    };
    window.addEventListener("click", closePicker);
    return () => window.removeEventListener("click", closePicker);
  }, [reactionPicker.messageId]);

  useEffect(() => {
    const closeAttach = (e) => {
      if (
        showAttachMenu &&
        attachMenuRef.current &&
        !attachMenuRef.current.contains(e.target)
      ) {
        setShowAttachMenu(false);
      }
    };
    window.addEventListener("click", closeAttach);
    return () => window.removeEventListener("click", closeAttach);
  }, [showAttachMenu]);

  /* =====================================================
     TYPING FLAG
  ===================================================== */
  const sendTypingFlag = (flag) => {
    if (!activeChat) return;
    fetch(`${API_URL}/messages/typing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ receiverId: activeChat._id, isTyping: flag }),
    }).catch(() => {});
  };

  const handleInputChange = (value) => {
    setInput(value);
    sendTypingFlag(true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTypingFlag(false), 1200);
  };

  useEffect(scrollToBottom, [messages]);

  /* =====================================================
     RENDER HELPERS
  ===================================================== */
  const renderReactions = (msg) => {
    if (!Array.isArray(msg.reactions) || msg.reactions.length === 0) return null;
    const grouped = msg.reactions.reduce((acc, r) => {
      if (!r?.emoji) return acc;
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    }, {});

    return (
      <div className="message-reactions">
        {Object.entries(grouped).map(([emoji, count]) => (
          <span key={emoji} className="reaction-pill">
            {emoji}
            {count > 1 && <span className="reaction-count">{count}</span>}
          </span>
        ))}
      </div>
    );
  };

  const renderAudioBubble = (msg) => {
    const status = audioStatus[msg._id] || {};
    const progress = status.duration
      ? Math.min((status.currentTime / status.duration) * 100, 100)
      : 0;
    const url = resolveUrl(msg.audioUrl);

    return (
      <div className="audio-bubble">
        <button
          className={`audio-play ${status.playing ? "playing" : ""}`}
          onClick={() => togglePlay(msg._id)}
        >
          {status.playing ? "Pause" : "Play"}
        </button>

        <div className="audio-progress">
          <div className="audio-progress-bar" style={{ width: `${progress}%` }} />
        </div>

        <div className="audio-duration">
          {formatTime(status.currentTime)} / {formatTime(status.duration)}
        </div>

        <audio
          ref={(node) => bindAudioRef(msg, node)}
          src={url}
          preload="metadata"
        />
      </div>
    );
  };

  const renderMessageContent = (msg) => {
    if (msg.type === "audio") {
      return renderAudioBubble(msg);
    }
    return msg.content;
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
              onClick={() => loadConversation(friend)}
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
                messages.map((msg) => {
                  const senderId =
                    typeof msg.sender === "object"
                      ? msg.sender?._id
                      : msg.sender;

                  const isMe = senderId === me?._id;

                  return (
                    <div
                      key={msg._id}
                      className={`message-row ${isMe ? "me" : "other"}`}
                    >
                      <div
                        className={`message-bubble message-${msg.type || "text"}`}
                        onMouseDown={(e) => handleBubblePressStart(msg, e)}
                        onMouseUp={handleBubblePressEnd}
                        onMouseLeave={handleBubblePressEnd}
                        onTouchStart={(e) => handleBubblePressStart(msg, e)}
                        onTouchEnd={handleBubblePressEnd}
                      >
                        {renderMessageContent(msg)}
                        {renderReactions(msg)}
                      </div>
                    </div>
                  );
                })}

              <div ref={messagesEndRef} />
            </div>

            {/* INPUT */}
            <div className="chat-input-bar">
              <div className="attach-wrapper" ref={attachMenuRef}>
                <button
                  className="chat-attach-btn"
                  onClick={() => setShowAttachMenu((p) => !p)}
                >
                  +
                </button>

                {showAttachMenu && (
                  <div className="attach-menu">
                    <button className="attach-item">📎 Fichier</button>
                    <button className="attach-item">🖼 Image</button>
                    <button
                      className="attach-item"
                      onClick={() => {
                        setShowAttachMenu(false);
                        startRecording();
                      }}
                    >
                      🎤 Note vocale
                    </button>
                  </div>
                )}
              </div>

              <input
                className="chat-input"
                placeholder="Message..."
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />

              <button
                className={`chat-mic-btn ${isRecording ? "recording" : ""}`}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={() => isRecording && stopRecording()}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                title="Maintenir pour enregistrer"
              >
                🎤
              </button>

              <button className="chat-send-btn" onClick={sendMessage}>
                Envoyer
              </button>
            </div>

            {reactionPicker.messageId && (
              <div
                className="reaction-picker"
                style={{ top: reactionPicker.y, left: reactionPicker.x }}
              >
                {REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    className="reaction-btn"
                    onClick={() => sendReaction(reactionPicker.messageId, emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
