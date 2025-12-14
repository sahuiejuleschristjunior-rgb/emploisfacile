// src/pages/Messages.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import ConversationItem from "../components/ConversationItem";
import VideoCallOverlay from "../components/VideoCallOverlay";
import { fetchFriends } from "../api/socialApi";
import { io } from "socket.io-client";
import "../styles/messages.css";

export default function Messages() {
  /* ============================================================
     STATES
  ============================================================ */
  const [view, setView] = useState("list");
  const [selectedUser, setSelectedUser] = useState(null);
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");

  const [loadingInbox, setLoadingInbox] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(false);

  const [inbox, setInbox] = useState([]);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [friends, setFriends] = useState([]);
  const [friendsError, setFriendsError] = useState("");

  const [callVisible, setCallVisible] = useState(false);
  const [callMode, setCallMode] = useState(null);
  const [incomingOffer, setIncomingOffer] = useState(null);

  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [typingFromOther, setTypingFromOther] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  /* ============================================================
     ENV
  ============================================================ */
  const API_URL = import.meta.env.VITE_API_URL;
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

  const token = localStorage.getItem("token");
  const me = JSON.parse(localStorage.getItem("user"));
  const myId = me?._id;

  const socketRef = useRef(null);
  const location = useLocation();

  /* ============================================================
     NORMALISATION ANTI-CRASH
  ============================================================ */
  function normalizeMessage(m) {
    return {
      _id: m._id || m.id || Date.now(),
      senderId: m.sender?._id || m.sender,
      receiverId: m.receiver?._id || m.receiver,
      type: m.type || "text",
      content: typeof m.content === "string" ? m.content : "",
      fileUrl: m.fileUrl || null,
      callRoomId: m.callRoomId || null,
      isRead: !!m.isRead,
      createdAt: m.createdAt || new Date().toISOString(),
    };
  }

  /* ============================================================
     FORMAT HEURE
  ============================================================ */
  const formatTime = (d) => {
    if (!d) return "";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  /* ============================================================
     NOTIFICATIONS BROWSER
  ============================================================ */
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const notifyNewMessage = (msg) => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const senderId = msg.sender?._id || msg.sender;
    const body = msg.content?.slice(0, 80) || "Nouveau message";

    if (
      document.visibilityState === "visible" &&
      selectedUser &&
      senderId === selectedUser._id
    ) {
      return;
    }

    new Notification("Nouveau message EmploisFacile", { body });
  };

  /* ============================================================
     🔥 SOCKET.IO — VERSION 100% ANTI-ÉCRAN-NOIR
  ============================================================ */
  useEffect(() => {
    if (!token || !myId) return;

    let isMounted = true; // ⛑️ Sécurise tous les callbacks

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["polling", "websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      if (!isMounted) return;
      console.log("⚡ Socket connecté :", socket.id);
    });

    socket.on("user_online", (id) => {
      if (!isMounted) return;
      setOnlineUserIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    });

    socket.on("user_offline", (id) => {
      if (!isMounted) return;
      setOnlineUserIds((prev) => prev.filter((x) => x !== id));
    });

    socket.on("new_message", (msgRaw) => {
      if (!isMounted) return;

      const msg = normalizeMessage(msgRaw);
      const otherId = msg.senderId === myId ? msg.receiverId : msg.senderId;

      if (selectedUser && otherId === selectedUser._id) {
        setMessages((prev) => [...prev, msg]);
      }

      fetchInbox();
      if (msg.senderId !== myId) notifyNewMessage(msg);
    });

    socket.on("typing", ({ from }) => {
      if (!isMounted) return;

      if (!selectedUser || from !== selectedUser._id) return;

      setTypingFromOther(true);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(
        () => setTypingFromOther(false),
        2000
      );
    });

    socket.on("call_hangup", () => {
      if (!isMounted) return;
      setCallVisible(false);
      setIncomingOffer(null);
      setCallMode(null);
    });

    socket.on("call_offer", ({ from, offer }) => {
      if (!isMounted) return;

      // ⛑️ inbox peut être vide → protection
      const conv = inbox?.find?.((c) => c.user?._id === from) || null;

      const callerUser =
        conv?.user || {
          _id: from,
          name: "Utilisateur",
          avatar: "/default-avatar.png",
        };

      setSelectedUser(callerUser);
      setIncomingOffer(offer);
      setCallMode("callee");
      setView("chat");
      setCallVisible(true);
    });

    return () => {
      isMounted = false; // 🔥 Stoppe tous les listeners
      socket.disconnect(); // 🔥 Cleanup garanti sans erreur
    };
  }, [token, myId, inbox, selectedUser]);

  /* ============================================================
     AUTO-SCROLL
  ============================================================ */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ============================================================
     FETCH INBOX
  ============================================================ */
  const fetchInbox = useCallback(async () => {
    if (!token) return;
    setLoadingInbox(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/messages/inbox`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur inbox");

      setInbox(data);
    } catch (err) {
      setError(err.message);
      setInbox([]);
    } finally {
      setLoadingInbox(false);
    }
  }, [API_URL, token]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  /* ============================================================
     FETCH FRIENDS
  ============================================================ */
  const fetchFriendsList = useCallback(async () => {
    if (!token) return;

    setLoadingFriends(true);
    setFriendsError("");

    try {
      const list = await fetchFriends();
<<<<<<< ours
      setFriends(list);
=======
      const users = list?.friends?.map((f) => f.user).filter(Boolean) || [];
      setFriends(users);
>>>>>>> theirs
    } catch (err) {
      setFriendsError(err.message || "Erreur récupération amis");
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  }, [token]);

  useEffect(() => {
    fetchFriendsList();
  }, [fetchFriendsList]);

  /* ============================================================
     OUVRIR CONVERSATION
  ============================================================ */
  const openChat = async (conv) => {
    if (!conv?.user?._id) return;

    setSelectedUser(conv.user);
    setView("chat");

    await fetchConversation(conv.user._id);
    await markAllRead(conv.user._id);
  };

  const openFriendChat = (friend) => {
    if (!friend?._id) return;

    const existingConv = inbox.find((c) => c.user?._id === friend._id);
    if (existingConv) {
      openChat(existingConv);
      return;
    }

    openChat({ user: friend, lastMessage: null, unreadCount: 0 });
  };

  /* ============================================================
     FETCH CONVERSATION
  ============================================================ */
  const fetchConversation = async (otherId) => {
    if (!token || !otherId) return;

    setLoadingConversation(true);
    setError("");

    try {
      const res = await fetch(
        `${API_URL}/messages/conversation/${otherId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const raw = await res.json();
      if (!res.ok) throw new Error(raw.error || "Erreur conversation");

      const normalized = raw.map((m) => normalizeMessage(m));
      setMessages(normalized);
    } catch (err) {
      setError(err.message);
      setMessages([]);
    } finally {
      setLoadingConversation(false);
    }
  };

  /* ============================================================
     MARQUER LUS
  ============================================================ */
  const markAllRead = async (otherUserId) => {
    try {
      await fetch(`${API_URL}/messages/read-all/${otherUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });

      setMessages((prev) =>
        prev.map((m) =>
          String(m.receiverId) === String(myId)
            ? { ...m, isRead: true, readAt: new Date().toISOString() }
            : m
        )
      );

      socketRef.current?.emit("messages_read", {
        readerId: myId,
        withUserId: otherUserId,
      });
    } catch {}
  };

  /* ============================================================
     ENVOYER MESSAGE
  ============================================================ */
  const sendMessage = () => {
    if (!input.trim() || !selectedUser) return;

    const content = input.trim();
    setInput("");

    const tempId = "temp-" + Date.now();

    const temp = normalizeMessage({
      _id: tempId,
      sender: myId,
      receiver: selectedUser._id,
      content,
      type: "text",
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    setMessages((prev) => [...prev, temp]);

    fetch(`${API_URL}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ receiver: selectedUser._id, content }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data) {
          const normalized = normalizeMessage(data.data);

          setMessages((prev) =>
            prev.map((m) => (m._id === tempId ? normalized : m))
          );

          socketRef.current?.emit("send_message", {
            receiver: selectedUser._id,
            content,
          });

          fetchInbox();
        }
      })
      .catch((err) => setError(err.message));
  };

  /* ============================================================
     TYPING
  ============================================================ */
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);

    socketRef.current?.emit("typing", { to: selectedUser?._id });
  };

  /* ============================================================
     MESSAGES FORMATÉS
  ============================================================ */
  const formattedMessages = messages.map((m) => ({
    ...m,
    fromMe: m.senderId === myId,
  }));

  const filteredInbox = inbox.filter((c) =>
    c.user?.name?.toLowerCase().includes(search.toLowerCase())
  );

  /* ============================================================
     UI
  ============================================================ */
  return (
    <div className="messages-page">
      {/* LISTE */}
      {view === "list" && (
        <div className="messages-list-view">
          <div className="messages-top-header">
            <div className="msg-title-pill">Messages</div>
          </div>

<<<<<<< ours
          <div className="search-bar">
            <input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="friends-section">
            <div className="section-title">Vos amis</div>

            {loadingFriends ? (
              <div className="skeleton-wrapper">
                <div className="skeleton-item"></div>
                <div className="skeleton-item"></div>
              </div>
            ) : friendsError ? (
              <div className="empty-state">{friendsError}</div>
            ) : friends.length === 0 ? (
              <div className="empty-state">Aucun ami pour le moment.</div>
            ) : (
              <div className="conversations-list">
                {friends.map((friend) => (
                  <ConversationItem
                    key={friend._id}
                    name={friend.name}
                    avatar={friend.avatar}
                    isOnline={onlineUserIds.includes(friend._id)}
                    last="Démarrer une conversation"
                    onClick={() => openFriendChat(friend)}
                  />
                ))}
              </div>
            )}
          </div>

          {loadingInbox ? (
            <div className="skeleton-wrapper">
              <div className="skeleton-item"></div>
              <div className="skeleton-item"></div>
              <div className="skeleton-item"></div>
=======
          <div className="messages-scroll-area">
            <div className="search-bar">
              <input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
>>>>>>> theirs
            </div>

            <div className="friends-section">
              <div className="section-title">Vos amis</div>

              {loadingFriends ? (
                <div className="skeleton-wrapper">
                  <div className="skeleton-item"></div>
                  <div className="skeleton-item"></div>
                </div>
              ) : friendsError ? (
                <div className="empty-state">{friendsError}</div>
              ) : friends.length === 0 ? (
                <div className="empty-state">Aucun ami pour le moment.</div>
              ) : (
                <div className="conversations-list friends-list">
                  {friends.map((friend) => (
                    <ConversationItem
                      key={friend._id}
                      name={friend.name}
                      avatar={friend.avatar}
                      isOnline={onlineUserIds.includes(friend._id)}
                      last="Démarrer une conversation"
                      onClick={() => openFriendChat(friend)}
                    />
                  ))}
                </div>
              )}
            </div>

            {loadingInbox ? (
              <div className="skeleton-wrapper">
                <div className="skeleton-item"></div>
                <div className="skeleton-item"></div>
                <div className="skeleton-item"></div>
              </div>
            ) : (
              <div className="conversations-list">
                {filteredInbox.map((c, idx) => (
                  <ConversationItem
                    key={c.user?._id || idx}
                    name={c.user?.name}
                    avatar={c.user?.avatar}
                    last={c.lastMessage?.content}
                    lastTime={c.lastMessage?.createdAt}
                    unreadCount={c.unreadCount}
                    isOnline={onlineUserIds.includes(c.user?._id)}
                    onClick={() => openChat(c)}
                  />
                ))}

                {!filteredInbox.length && !error && (
                  <div className="empty-state">Aucun message pour le moment.</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHAT */}
      {view === "chat" && selectedUser && (
        <>
          <div className="chat-header-full">
            <button className="chat-header-btn" onClick={() => setView("list")}>
              ←
            </button>

            <div className="chat-header-user">
              <div className="chat-header-avatar">
                <span
                  className={
                    onlineUserIds.includes(selectedUser._id)
                      ? "online-dot"
                      : "offline-dot"
                  }
                />
                <img
                  src={selectedUser.avatar || "/default-avatar.png"}
                  alt=""
                />
              </div>

              <div className="chat-header-texts">
                <h3>{selectedUser.name}</h3>
                <span className="chat-header-sub">
                  {onlineUserIds.includes(selectedUser._id)
                    ? "En ligne"
                    : "Hors ligne"}
                </span>
              </div>
            </div>

            <button
              className="chat-header-btn"
              onClick={() => {
                setIncomingOffer(null);
                setCallMode("caller");
                setCallVisible(true);
              }}
            >
              📹
            </button>
          </div>

          <div className="chat-messages">
            {loadingConversation ? (
              <div className="loader">Chargement...</div>
            ) : (
              formattedMessages.map((m) => (
                <div
                  key={m._id}
                  className={`message-bubble ${m.fromMe ? "me" : "other"}`}
                >
                  <div className="message-content">
                    {m.type === "text" && m.content}

                    {m.type === "file" && (
                      <a href={m.fileUrl} target="_blank" className="file-bubble">
                        📎 Fichier joint
                      </a>
                    )}

                    {m.type === "video" && (
                      <video className="video-bubble" controls>
                        <source src={m.fileUrl} />
                      </video>
                    )}

                    {m.type === "videoCall" && (
                      <div className="call-msg">📹 Appel vidéo</div>
                    )}

                    {m.type === "system" && (
                      <div className="system-msg">{m.content}</div>
                    )}
                  </div>

                  <div className="message-meta">
                    <span>{formatTime(m.createdAt)}</span>

                    {m.fromMe && m.isRead && (
                      <span className="message-read-flag">Vu</span>
                    )}
                  </div>
                </div>
              ))
            )}

            {typingFromOther && (
              <div className="typing-indicator">
                {selectedUser.name} écrit…
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-bar">
            <input
              className="chat-input"
              placeholder="Message..."
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button className="chat-send-btn" onClick={sendMessage}>
              send
            </button>
          </div>
        </>
      )}

      {/* APPEL VIDEO */}
      <VideoCallOverlay
        visible={callVisible}
        mode={callMode}
        socket={socketRef.current}
        me={me}
        otherUser={selectedUser}
        incomingOffer={incomingOffer}
        onClose={() => {
          setCallVisible(false);
          setIncomingOffer(null);
          setCallMode(null);
        }}
      />
    </div>
  );
}
