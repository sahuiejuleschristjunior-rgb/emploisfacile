// frontend/src/pages/Messages.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import "../styles/messages.css";
import { fetchFriends } from "../api/socialApi";
import { useSocket } from "../context/SocketContext";

const API_URL = import.meta.env.VITE_API_URL;
const API_HOST = API_URL?.replace(/\/?api$/, "");
const token = localStorage.getItem("token");
const me = JSON.parse(localStorage.getItem("user"));
const REACTIONS = ["❤️", "😂", "😡", "👍"];

const IconPlus = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
    <path
      fill="currentColor"
      d="M12 4c.552 0 1 .448 1 1v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5c0-.552.448-1 1-1Z"
    />
  </svg>
);

const IconSend = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
    <path
      fill="currentColor"
      d="m3.4 11.05 15.2-6.95c1.33-.61 2.73.79 2.12 2.12l-6.95 15.2c-.69 1.52-2.94 1.2-3.18-.46l-.73-4.86a1 1 0 0 1 .27-.84l4.16-4.16a.25.25 0 0 0-.18-.43l-4.16 4.16a1 1 0 0 1-.84.27l-4.86-.73c-1.66-.24-1.98-2.49-.46-3.18Z"
    />
  </svg>
);

const IconMic = ({ active }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
    <path
      fill="currentColor"
      d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm-6-3a1 1 0 0 1 2 0 4 4 0 1 0 8 0 1 1 0 1 1 2 0 6 6 0 0 1-5 5.91V20h2a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2h2v-2.09A6 6 0 0 1 6 12Z"
      opacity={active ? 1 : 0.9}
    />
  </svg>
);

const IconClose = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
    <path
      fill="currentColor"
      d="M6.7 5.29a1 1 0 0 0 0 1.42L10.59 11l-3.9 4.29a1 1 0 1 0 1.46 1.36L12 12.58l3.85 4.07a1 1 0 0 0 1.46-1.36L13.41 11l3.9-4.29A1 1 0 0 0 15.85 5.3L12 9.34 8.15 5.29a1 1 0 0 0-1.45 0Z"
    />
  </svg>
);

const IconPlay = ({ playing }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    {playing ? (
      <path
        fill="currentColor"
        d="M8.5 5.5a1 1 0 0 1 1 1v11a1 1 0 1 1-2 0v-11a1 1 0 0 1 1-1Zm7 0a1 1 0 0 1 1 1v11a1 1 0 1 1-2 0v-11a1 1 0 0 1 1-1Z"
      />
    ) : (
      <path
        fill="currentColor"
        d="M7.5 5.4a1 1 0 0 1 1.03.05l8.5 5.6a1 1 0 0 1 0 1.7l-8.5 5.6A1 1 0 0 1 7 17.4V6.6a1 1 0 0 1 .5-.86Z"
      />
    )}
  </svg>
);

export default function Messages() {
  const socketFromContext = useSocket();
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [errorFriends, setErrorFriends] = useState("");
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [reactionPicker, setReactionPicker] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);
  const [recordingCancelled, setRecordingCancelled] = useState(false);
  const [typingFrom, setTypingFrom] = useState(null);
  const [socketInstance, setSocketInstance] = useState(null);
  const [showSheet, setShowSheet] = useState(false);

  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const audioRefs = useRef({});
  const [audioStatus, setAudioStatus] = useState({});
  const messagesEndRef = useRef(null);
  const longPressTimer = useRef(null);
  const typingTimeoutRef = useRef(null);
  const chatBodyRef = useRef(null);
  const holdTimeoutRef = useRef(null);
  const gestureStartX = useRef(0);
  const shouldSendRef = useRef(true);
  const socketRef = useRef(null);

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

  const scrollToBottom = (force) => {
    const node = chatBodyRef.current;
    if (!node) return;
    const nearBottom =
      node.scrollHeight - node.scrollTop - node.clientHeight < 120 || force;
    if (nearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
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
        setErrorFriends("Erreur chargement amis");
        setFriends([]);
      } finally {
        setLoadingFriends(false);
      }
    };

    loadFriends();
  }, []);

  const filteredFriends = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => (f.name || "").toLowerCase().includes(q));
  }, [friends, search]);

  const ensureSocket = () => {
    if (socketRef.current) return socketRef.current;
    if (socketInstance) {
      socketRef.current = socketInstance;
      return socketInstance;
    }
    if (socketFromContext) {
      socketRef.current = socketFromContext;
      setSocketInstance(socketFromContext);
      return socketFromContext;
    }

    if (!token) return null;
    const fallback = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token },
      transports: ["polling", "websocket"],
    });
    socketRef.current = fallback;
    setSocketInstance(fallback);
    return fallback;
  };

  useEffect(() => {
    if (socketFromContext) {
      socketRef.current = socketFromContext;
      setSocketInstance(socketFromContext);
    }
  }, [socketFromContext]);

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
      setMessages([]);
    } finally {
      setLoadingConversation(false);
      setTimeout(() => scrollToBottom(true), 50);
    }
  };

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
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);
    setTimeout(() => scrollToBottom(true), 10);

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
      // silent
    }
  };

  const beginRecording = async () => {
    if (!activeChat || isRecording) return;
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
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        setRecordingTimer(0);

        const shouldSend = shouldSendRef.current;
        shouldSendRef.current = true;
        if (!shouldSend) return;

        const blob = new Blob(recordingChunksRef.current, {
          type: "audio/webm",
        });
        uploadAudio(blob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecordingCancelled(false);
      setIsRecording(true);
      setRecordingTimer(0);
    } catch (err) {
      setIsRecording(false);
    }
  };

  const startRecordingHold = (e) => {
    e.preventDefault();
    gestureStartX.current = e.touches?.[0]?.clientX || e.clientX || 0;
    shouldSendRef.current = true;
    clearTimeout(holdTimeoutRef.current);
    holdTimeoutRef.current = setTimeout(beginRecording, 120);
  };

  const moveRecording = (e) => {
    if (!isRecording) return;
    const currentX = e.touches?.[0]?.clientX || e.clientX || 0;
    const delta = currentX - gestureStartX.current;
    if (delta < -70) {
      setRecordingCancelled(true);
      shouldSendRef.current = false;
    } else {
      setRecordingCancelled(false);
      shouldSendRef.current = true;
    }
  };

  const endRecordingHold = () => {
    clearTimeout(holdTimeoutRef.current);
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
  };

  const cancelRecording = () => {
    shouldSendRef.current = false;
    setRecordingCancelled(true);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    let interval = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTimer((t) => t + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

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
      createdAt: new Date().toISOString(),
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
      // silent
    } finally {
      setTimeout(() => scrollToBottom(true), 30);
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
      // silent
    } finally {
      setReactionPicker(null);
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
      });
    }, 420);
  };

  const handleBubblePressEnd = () => {
    clearTimeout(longPressTimer.current);
  };

  useEffect(() => {
    const closePicker = (e) => {
      if (reactionPicker && !e.target.closest?.(".reaction-picker")) {
        setReactionPicker(null);
      }
    };
    window.addEventListener("click", closePicker);
    return () => window.removeEventListener("click", closePicker);
  }, [reactionPicker]);

  useEffect(() => {
    const closeAttach = (e) => {
      if (showSheet && !e.target.closest?.(".attach-sheet")) {
        setShowSheet(false);
      }
    };
    window.addEventListener("click", closeAttach);
    return () => window.removeEventListener("click", closeAttach);
  }, [showSheet]);

  const sendTypingFlag = (flag) => {
    if (!activeChat) return;
    const socket = ensureSocket();
    if (socket) {
      socket.emit("typing", { to: activeChat._id, isTyping: flag });
    }
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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const socket = ensureSocket();
    if (!socket) return;

    const onNewMessage = (payload) => {
      const msg = payload?.message || payload;
      if (!msg) return;
      const senderId = typeof msg.sender === "object" ? msg.sender?._id : msg.sender;
      const receiverId =
        typeof msg.receiver === "object" ? msg.receiver?._id : msg.receiver;
      const otherUser = senderId === me?._id ? receiverId : senderId;
      if (!activeChat || otherUser !== activeChat._id) return;

      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    };

    const onReactionUpdate = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
      );
    };

    const onTyping = ({ from, isTyping }) => {
      if (!activeChat || from !== activeChat._id) return;
      setTypingFrom(isTyping ? from : null);
      if (isTyping) {
        setTimeout(() => setTypingFrom(null), 2000);
      }
    };

    socket.on("new_message", onNewMessage);
    socket.on("audio_message", onNewMessage);
    socket.on("reaction_update", onReactionUpdate);
    socket.on("typing", onTyping);
    socket.on("message_read", ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, isRead: true, readAt: new Date() } : m
        )
      );
    });

    return () => {
      socket.off("new_message", onNewMessage);
      socket.off("audio_message", onNewMessage);
      socket.off("reaction_update", onReactionUpdate);
      socket.off("typing", onTyping);
      socket.off("message_read");
    };
  }, [activeChat, socketInstance]);

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
          <IconPlay playing={status.playing} />
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

  const renderRecordingBar = () => (
    <div className="recording-bar">
      <button className="recording-cancel" onClick={cancelRecording}>
        <IconClose />
      </button>
      <div className="recording-pulse">
        <IconMic active />
      </div>
      <div className="recording-timer">{formatTime(recordingTimer)}</div>
      <div className="recording-hint">
        {recordingCancelled
          ? "Annulé"
          : "Glisse vers la gauche pour annuler"}
      </div>
    </div>
  );

  return (
    <div className={`messages-page ${activeChat ? "chat-open" : ""}`}>
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
              <div className="messages-empty">Aucun ami pour le moment</div>
            )}

          {!loadingFriends &&
            !errorFriends &&
            filteredFriends.map((f) => (
              <div
                key={f._id}
                className={`conversation-item ${
                  activeChat?._id === f._id ? "active" : ""
                }`}
                onClick={() => loadConversation(f)}
              >
                <img src={resolveUrl(f.avatar)} alt="avatar" className="conversation-avatar" />
                <div className="conversation-info">
                  <div className="conversation-name">{f.name}</div>
                  <div className="conversation-last-message">Dernier message</div>
                </div>
                {f.unreadCount > 0 && (
                  <span className="conv-unread-badge">{f.unreadCount}</span>
                )}
              </div>
            ))}
        </div>
      </aside>

      <main className="messages-content">
        {!activeChat && (
          <div className="messages-placeholder">
            <h3>Sélectionne une conversation</h3>
            <p>Commence à discuter avec tes contacts</p>
          </div>
        )}

        {activeChat && (
          <>
            <div className="chat-header">
              <button className="chat-close-btn" onClick={() => setActiveChat(null)}>
                <IconClose />
              </button>
              <img src={resolveUrl(activeChat.avatar)} alt="avatar" className="chat-avatar" />
              <div className="chat-user-info">
                <div className="chat-username">{activeChat.name}</div>
                <div className="chat-status">
                  {typingFrom ? "En train d'écrire…" : "En ligne"}
                </div>
              </div>
            </div>

            <div className="chat-body" ref={chatBodyRef}>
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

            <div className="chat-input-bar">
              <div className="attach-wrapper">
                <button
                  className="chat-attach-btn"
                  onClick={() => {
                    setShowSheet((p) => !p);
                  }}
                  aria-label="Ouvrir les options"
                >
                  <IconPlus />
                </button>
              </div>

              {isRecording ? (
                renderRecordingBar()
              ) : (
                <input
                  className="chat-input"
                  placeholder="Message..."
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
              )}

              {!isRecording && (
                <button className="chat-send-btn" onClick={sendMessage} aria-label="Envoyer">
                  <IconSend />
                </button>
              )}

              <button
                className={`chat-mic-btn ${isRecording ? "recording" : ""}`}
                onMouseDown={startRecordingHold}
                onMouseUp={endRecordingHold}
                onMouseLeave={() => isRecording && cancelRecording()}
                onTouchStart={startRecordingHold}
                onTouchEnd={endRecordingHold}
                onTouchMove={moveRecording}
                aria-label="Maintenir pour parler"
              >
                <IconMic active={isRecording} />
              </button>
            </div>

            {showSheet && (
              <div className="sheet-backdrop">
                <div className="attach-sheet">
                  <div className="sheet-handle" />
                  <button className="attach-item">📎 Fichier</button>
                  <button className="attach-item">🖼 Image</button>
                  <button className="attach-item">📷 Caméra</button>
                  <button className="attach-item">📍 Localisation</button>
                </div>
              </div>
            )}

            {reactionPicker?.messageId && (
              <div
                className="reaction-picker"
                style={{
                  left: reactionPicker.x
                    ? `${reactionPicker.x}px`
                    : "50%",
                }}
              >
                <div className="reaction-scroll">
                  {REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      className="reaction-btn"
                      onClick={() => sendReaction(reactionPicker.messageId, emoji)}
                    >
                      <svg viewBox="0 0 24 24" width="24" height="24">
                        <text x="50%" y="65%" textAnchor="middle" fontSize="16">
                          {emoji}
                        </text>
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
