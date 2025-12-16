import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import "../styles/messages.css";
import { fetchFriends } from "../api/socialApi";

const API_URL = import.meta.env.VITE_API_URL;
const API_HOST = API_URL?.replace(/\/?api$/, "");
const SOCKET_URL = API_HOST || window.location.origin;
const token = localStorage.getItem("token");
const me = JSON.parse(localStorage.getItem("user"));
const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

const BackIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      fill="currentColor"
      d="M14.7 5.3a1 1 0 0 1 0 1.4L10.4 11l4.3 4.3a1 1 0 0 1-1.4 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.4 0Z"
    />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      fill="currentColor"
      d="M12 4c.6 0 1 .4 1 1v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 0 1 0-2h6V5c0-.6.4-1 1-1Z"
    />
  </svg>
);

const EmojiIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      fill="currentColor"
      d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-3 6a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm-6.83 7.25a1 1 0 0 1 1.41-.08A4.99 4.99 0 0 0 12 16c1.22 0 2.38-.45 3.28-1.26a1 1 0 1 1 1.34 1.48A7 7 0 0 1 12 18a6.99 6.99 0 0 1-4.62-1.78 1 1 0 0 1-.2-1Z"
    />
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      fill="currentColor"
      d="M3.16 4.53a1 1 0 0 1 1.05-.16l16 7a1 1 0 0 1 0 1.82l-16 7A1 1 0 0 1 3 19.3v-5.1l8.54-2.21L3 9.77V4.7a1 1 0 0 1 .16-.17Z"
    />
  </svg>
);

const MicIcon = ({ pulse = false }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" className={pulse ? "pulse" : ""} aria-hidden>
    <path
      fill="currentColor"
      d="M12 3a3 3 0 0 1 3 3v6a3 3 0 1 1-6 0V6a3 3 0 0 1 3-3Zm-1 17.93V20h2v.93a7.04 7.04 0 0 0 5.48-4.28 1 1 0 0 0-1.83-.78A5.03 5.03 0 0 1 7.35 15a1 1 0 0 0-1.83.79A7.04 7.04 0 0 0 11 20.93Z"
    />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
    <path
      fill="currentColor"
      d="M5.3 5.3a1 1 0 0 1 1.4 0L12 10.59l5.3-5.3a1 1 0 1 1 1.4 1.42L13.41 12l5.3 5.3a1 1 0 0 1-1.42 1.4L12 13.41l-5.3 5.3a1 1 0 1 1-1.4-1.42L10.59 12 5.3 6.7a1 1 0 0 1 0-1.4Z"
    />
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
    <path fill="currentColor" d="M7 5.5v13l11-6.5-11-6.5Z" />
  </svg>
);

const PauseIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
    <path fill="currentColor" d="M7 5h3v14H7V5Zm7 0h3v14h-3V5Z" />
  </svg>
);

export default function Messages() {
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [errorFriends, setErrorFriends] = useState("");

  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversation, setLoadingConversation] = useState(false);

  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");

  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [reactionPicker, setReactionPicker] = useState({ messageId: null, anchor: null });

  const [typingState, setTypingState] = useState({});

  const [isRecording, setIsRecording] = useState(false);
  const [recordLocked, setRecordLocked] = useState(false);
  const [recordCanceled, setRecordCanceled] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [recordLevel, setRecordLevel] = useState(0);
  const [recordOffset, setRecordOffset] = useState(0);

  const [audioStatus, setAudioStatus] = useState({});

  const chatBodyRef = useRef(null);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordStartRef = useRef(null);
  const recordTimerRef = useRef(null);
  const activeStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioAnalyserRef = useRef(null);
  const audioGainRef = useRef(null);
  const recordVizFrame = useRef(null);
  const recordCanceledRef = useRef(false);
  const recordLevelBarRef = useRef(null);

  const dragStartRef = useRef(null);

  const audioRefs = useRef({});
  const currentAudioRef = useRef(null);
  const currentAudioIdRef = useRef(null);

  const attachMenuRef = useRef(null);
  const longPressTimer = useRef(null);
  const attachSwipeStart = useRef(null);

  const isMobileView = () => window.matchMedia("(max-width: 900px)").matches;

  const normalizeFriend = (f) => {
    const u = typeof f?.user === "object" ? f.user : f;
    return {
      _id: u?._id || f?.user,
      name: u?.name || "Utilisateur",
      avatar: u?.avatar || "/default-avatar.png",
      unreadCount: typeof f?.unreadCount === "number" ? f.unreadCount : 0,
    };
  };

  const formatDuration = (ms) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60)
      .toString()
      .padStart(1, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const resolveUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("blob:")) return url;
    if (url.startsWith("http")) return url;
    return `${API_HOST || ""}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const scrollToBottom = (force = false) => {
    const container = chatBodyRef.current;
    if (!container) return;
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (force || distance < 140) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const isMessageInActiveChat = (msg) => {
    if (!msg || !activeChat) return false;
    const senderId = typeof msg.sender === "object" ? msg.sender?._id : msg.sender;
    const receiverId = typeof msg.receiver === "object" ? msg.receiver?._id : msg.receiver;
    return (
      senderId === activeChat._id ||
      receiverId === activeChat._id ||
      (senderId === me?._id && receiverId === me?._id)
    );
  };

  const upsertMessage = (incoming) => {
    if (!incoming) return;
    setMessages((prev) => {
      const next = [...prev];
      if (incoming.clientTempId) {
        const existingTemp = next.findIndex((m) => m.clientTempId === incoming.clientTempId);
        if (existingTemp >= 0) next.splice(existingTemp, 1);
      }
      const idx = incoming._id ? next.findIndex((m) => m._id === incoming._id) : -1;
      if (idx >= 0) {
        next[idx] = { ...next[idx], ...incoming };
      } else {
        next.push(incoming);
      }
      next.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      return next;
    });
  };

  useEffect(() => {
    const loadFriends = async () => {
      try {
        setLoadingFriends(true);
        setErrorFriends("");
        const data = await fetchFriends();
        const list = (Array.isArray(data?.friends) ? data.friends : Array.isArray(data) ? data : [])
          .map(normalizeFriend)
          .filter((f) => f && f._id)
          .reduce((acc, f) => {
            if (!acc.some((u) => u._id === f._id)) acc.push(f);
            return acc;
          }, []);
        setFriends(list);
      } catch (err) {
        console.error(err);
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

  useEffect(() => {
    if (!token) return undefined;
    const socket = io(SOCKET_URL, {
      path: "/socket.io/",
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    const handleMessage = (payload) => {
      const message = payload?.message || payload;
      if (!isMessageInActiveChat(message)) return;
      upsertMessage(message);
      const senderId = typeof message.sender === "object" ? message.sender?._id : message.sender;
      if (message?._id && senderId !== me?._id) {
        fetch(`${API_URL}/messages/${message._id}/read`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    };

    socket.on("new_message", handleMessage);
    socket.on("audio_message", handleMessage);

    socket.on("reaction_update", (payload) => {
      if (payload?.message && isMessageInActiveChat(payload.message)) {
        upsertMessage(payload.message);
      }
    });

    socket.on("message_read", ({ messageId, withUserId }) => {
      setMessages((prev) =>
        prev.map((m) => {
          const senderId = typeof m.sender === "object" ? m.sender?._id : m.sender;
          const receiverId = typeof m.receiver === "object" ? m.receiver?._id : m.receiver;
          if (
            (messageId && m._id === messageId) ||
            (withUserId && senderId === me?._id && receiverId === withUserId)
          ) {
            return { ...m, isRead: true, readAt: new Date() };
          }
          return m;
        })
      );
    });

    socket.on("typing", ({ from, isTyping }) => {
      if (!from || !activeChat || from !== activeChat._id) return;
      setTypingState((prev) => ({ ...prev, [from]: { isTyping: !!isTyping, at: Date.now() } }));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeChat, token]);

  useEffect(() => {
    const cleanTyping = setInterval(() => {
      const now = Date.now();
      setTypingState((prev) => {
        const next = { ...prev };
        Object.entries(prev).forEach(([id, state]) => {
          if (!state?.at || now - state.at > 2500) delete next[id];
        });
        return next;
      });
    }, 1200);
    return () => clearInterval(cleanTyping);
  }, []);

  const loadConversation = async (user) => {
    if (!user?._id) return;
    setActiveChat(user);
    setMessages([]);
    try {
      setLoadingConversation(true);
      const res = await fetch(`${API_URL}/messages/conversation/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setMessages(list);
      fetch(`${API_URL}/messages/read-all/${user._id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    } catch (err) {
      console.error(err);
      setMessages([]);
    } finally {
      setLoadingConversation(false);
      setTimeout(() => scrollToBottom(true), 60);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeChat) return;
    const content = input.trim();
    setInput("");
    const clientTempId = `temp-${Date.now()}`;
    const temp = {
      _id: clientTempId,
      clientTempId,
      sender: me?._id,
      receiver: activeChat._id,
      content,
      type: "text",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, temp]);
    setTimeout(() => scrollToBottom(true), 10);
    try {
      const res = await fetch(`${API_URL}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ receiver: activeChat._id, content, clientTempId }),
      });
      const data = await res.json();
      if (res.ok && data?.data) upsertMessage(data.data);
    } catch (err) {
      console.error("send message", err);
    }
  };

  const stopRecordVisualization = () => {
    if (recordVizFrame.current) {
      cancelAnimationFrame(recordVizFrame.current);
      recordVizFrame.current = null;
    }
  };

  const cleanupAudioContext = () => {
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((t) => t.stop());
      activeStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    audioAnalyserRef.current = null;
    audioGainRef.current = null;
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const uploadAudio = async (blob) => {
    if (!blob || !activeChat) return;
    const clientTempId = `audio-${Date.now()}`;
    const temp = {
      _id: clientTempId,
      clientTempId,
      sender: me?._id,
      receiver: activeChat._id,
      type: "audio",
      audioUrl: URL.createObjectURL(blob),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, temp]);
    setTimeout(() => scrollToBottom(true), 20);

    const form = new FormData();
    form.append("audio", blob);
    form.append("receiver", activeChat._id);
    form.append("clientTempId", clientTempId);
    try {
      const res = await fetch(`${API_URL}/messages/audio`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (res.ok && data?.data) upsertMessage(data.data);
    } catch (err) {
      console.error("audio upload", err);
    }
  };

  const startRecording = async (event) => {
    if (!activeChat || isRecording) return;
    clearInterval(recordTimerRef.current);
    stopRecordVisualization();

    const clientX = event?.touches?.[0]?.clientX || event?.clientX || 0;
    const clientY = event?.touches?.[0]?.clientY || event?.clientY || 0;

    dragStartRef.current = { x: clientX, y: clientY };
    recordStartRef.current = { at: Date.now() };
    setRecordTime(0);
    setRecordLocked(false);
    setRecordCanceled(false);
    setRecordOffset(0);
    setRecordLevel(0);
    recordCanceledRef.current = false;
    recordingChunksRef.current = [];

    recordTimerRef.current = setInterval(() => {
      setRecordTime(Date.now() - (recordStartRef.current?.at || Date.now()));
    }, 200);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      activeStreamRef.current = stream;
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1.8;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const destination = audioContext.createMediaStreamDestination();
      source.connect(gainNode);
      gainNode.connect(analyser);
      analyser.connect(destination);

      const recorder = new MediaRecorder(destination.stream);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordingChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const duration = Date.now() - (recordStartRef.current?.at || Date.now());
        const canceled = recordCanceledRef.current || duration < 300;
        stopRecordVisualization();
        clearInterval(recordTimerRef.current);
        setIsRecording(false);
        if (canceled || !recordingChunksRef.current.length) {
          recordingChunksRef.current = [];
          cleanupAudioContext();
          setRecordLevel(0);
          return;
        }
        const blob = new Blob(recordingChunksRef.current, { type: "audio/webm" });
        recordingChunksRef.current = [];
        cleanupAudioContext();
        setRecordLevel(0);
        if (blob.size > 0) uploadAudio(blob);
      };

      const animateLevel = () => {
        const analyserNode = audioAnalyserRef.current;
        if (!analyserNode) return;
        const buffer = new Uint8Array(analyserNode.frequencyBinCount);
        analyserNode.getByteFrequencyData(buffer);
        const max = buffer.reduce((m, v) => Math.max(m, v), 0) / 255;
        const level = Math.min(1, max * 1.4);
        setRecordLevel(level);
        if (recordLevelBarRef.current) {
          recordLevelBarRef.current.style.setProperty("--record-level", level.toString());
        }
        recordVizFrame.current = requestAnimationFrame(animateLevel);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      audioContextRef.current = audioContext;
      audioAnalyserRef.current = analyser;
      audioGainRef.current = gainNode;
      setIsRecording(true);
      animateLevel();
    } catch (err) {
      console.error("recording", err);
      clearInterval(recordTimerRef.current);
      stopRecordVisualization();
      cleanupAudioContext();
      setIsRecording(false);
    }
  };

  const handleRecordMove = (event) => {
    if (!isRecording || !dragStartRef.current) return;
    const x = event?.touches?.[0]?.clientX || event?.clientX || 0;
    const y = event?.touches?.[0]?.clientY || event?.clientY || 0;
    const deltaX = x - dragStartRef.current.x;
    const deltaY = y - dragStartRef.current.y;
    setRecordOffset(deltaX);

    if (deltaY < -70 && !recordLocked) {
      setRecordLocked(true);
      setRecordCanceled(false);
    }
    if (deltaX < -70) {
      recordCanceledRef.current = true;
      setRecordCanceled(true);
      stopRecording();
    }
    if (deltaX > 70 && !recordLocked) {
      recordCanceledRef.current = false;
      setRecordCanceled(false);
      stopRecording();
    }
  };

  const handleRecordEnd = () => {
    if (!isRecording) return;
    if (recordLocked) return;
    stopRecording();
  };

  const stopAllAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
      currentAudioIdRef.current = null;
    }
    setAudioStatus({});
  };

  const bindAudioRef = (messageId, node) => {
    if (!node) return;
    audioRefs.current[messageId] = node;
    node.onplay = () => {
      if (currentAudioRef.current && currentAudioRef.current !== node) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      }
      currentAudioRef.current = node;
      currentAudioIdRef.current = messageId;
      setAudioStatus((prev) => ({ ...prev, [messageId]: { playing: true } }));
    };
    node.onpause = () => {
      setAudioStatus((prev) => ({ ...prev, [messageId]: { playing: false } }));
    };
    node.onended = () => {
      node.currentTime = 0;
      if (currentAudioRef.current === node) {
        currentAudioRef.current = null;
        currentAudioIdRef.current = null;
      }
      setAudioStatus((prev) => ({ ...prev, [messageId]: { playing: false, progress: 0 } }));
    };
  };

  const toggleAudio = (messageId, url) => {
    const audio = audioRefs.current[messageId];
    if (!audio) return;
    if (currentAudioIdRef.current && currentAudioIdRef.current !== messageId) {
      stopAllAudio();
    }
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
    setAudioStatus((prev) => ({ ...prev, [messageId]: { playing: !audio.paused } }));
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
      if (res.ok && data?.data) upsertMessage(data.data);
    } catch (err) {
      console.error("reaction", err);
    } finally {
      setReactionPicker({ messageId: null, anchor: null });
    }
  };

  const handleBubblePressStart = (msg, event) => {
    event.preventDefault();
    clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      setReactionPicker({ messageId: msg._id, anchor: msg._id });
    }, 450);
  };

  const handleBubblePressEnd = () => {
    clearTimeout(longPressTimer.current);
  };

  useEffect(() => {
    const closePicker = (e) => {
      if (reactionPicker.messageId && !e.target.closest?.(".reaction-picker")) {
        setReactionPicker({ messageId: null, anchor: null });
      }
    };
    window.addEventListener("click", closePicker);
    return () => window.removeEventListener("click", closePicker);
  }, [reactionPicker.messageId]);

  const sendTypingFlag = (flag) => {
    if (!activeChat) return;
    socketRef.current?.emit("typing", { to: activeChat._id, isTyping: flag });
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
    scrollToBottom(false);
  }, [messages]);

  useEffect(() => {
    const closeAttach = (e) => {
      if (
        showAttachMenu &&
        attachMenuRef.current &&
        !attachMenuRef.current.contains(e.target) &&
        !e.target.closest?.(".attach-sheet")
      ) {
        setShowAttachMenu(false);
      }
    };
    window.addEventListener("click", closeAttach);
    return () => window.removeEventListener("click", closeAttach);
  }, [showAttachMenu]);

  const handleAttachTouchStart = (event) => {
    attachSwipeStart.current = event.touches?.[0]?.clientY || null;
  };

  const handleAttachTouchEnd = (event) => {
    const end = event.changedTouches?.[0]?.clientY;
    if (attachSwipeStart.current !== null && end !== undefined && end - attachSwipeStart.current > 30) {
      setShowAttachMenu(false);
    }
    attachSwipeStart.current = null;
  };

  const unreadBadge = (count) => (count > 0 ? <span className="conv-unread-badge">{count}</span> : null);

  const messageStatus = (msg) => {
    if (msg.isRead) return "Vu";
    if (msg._id && !msg.clientTempId) return "Envoyé";
    return "En cours";
  };

  const renderReactions = (msg) => {
    if (!msg.reactions || !msg.reactions.length) return null;
    const grouped = msg.reactions.reduce((acc, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = 0;
      acc[r.emoji] += 1;
      return acc;
    }, {});
    return (
      <div className="message-reactions">
        {Object.entries(grouped).map(([emoji, count]) => (
          <span key={emoji} className="reaction-chip">
            {emoji} {count}
          </span>
        ))}
      </div>
    );
  };

  const renderMessage = (msg) => {
    const mine = (typeof msg.sender === "object" ? msg.sender?._id : msg.sender) === me?._id;
    const status = messageStatus(msg);
    const isAudio = msg.type === "audio";
    return (
      <div
        key={msg._id || msg.clientTempId}
        className={`message-row ${mine ? "sent" : "received"}`}
        onTouchStart={(e) => handleBubblePressStart(msg, e)}
        onTouchEnd={handleBubblePressEnd}
        onMouseDown={(e) => handleBubblePressStart(msg, e)}
        onMouseUp={handleBubblePressEnd}
      >
        <div className="message-bubble">
          {isAudio ? (
            <div className="audio-message">
              <button className="audio-play" onClick={() => toggleAudio(msg._id || msg.clientTempId, msg.audioUrl)}>
                {audioStatus[msg._id || msg.clientTempId]?.playing ? <PauseIcon /> : <PlayIcon />}
              </button>
              <div className="audio-progress">
                <div className="audio-bar" />
              </div>
              <span className="audio-duration">{formatDuration(msg.duration || 0)}</span>
              <audio
                ref={(node) => bindAudioRef(msg._id || msg.clientTempId, node)}
                src={resolveUrl(msg.audioUrl)}
                preload="metadata"
              />
            </div>
          ) : (
            <div className="message-text">{msg.content}</div>
          )}
          <div className="message-meta">
            <span className="message-time">
              {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            {mine && <span className="message-status">{status}</span>}
          </div>
          {renderReactions(msg)}
          {reactionPicker.messageId === msg._id && (
            <div className="reaction-picker" onMouseDown={(e) => e.preventDefault()} onTouchStart={(e) => e.preventDefault()}>
              {REACTIONS.map((emoji) => (
                <button key={emoji} onClick={() => sendReaction(msg._id, emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const typingLabel = activeChat && typingState[activeChat._id]?.isTyping ? "En train d'écrire..." : "En ligne";

  const showChatPane = activeChat || !isMobileView();

  return (
    <div className="messages-page">
      {!activeChat || !isMobileView() ? (
        <div className="messages-sidebar">
          <div className="messages-sidebar-header">Messages</div>
          <div className="messages-search">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher"
              aria-label="Recherche"
            />
          </div>
          <div className="messages-list">
            {loadingFriends && <div className="messages-empty">Chargement...</div>}
            {errorFriends && <div className="messages-empty">{errorFriends}</div>}
            {!loadingFriends && !filteredFriends.length && <div className="messages-empty">Aucun ami</div>}
            {filteredFriends.map((f) => (
              <div
                key={f._id}
                className={`conversation-item ${activeChat?._id === f._id ? "active" : ""}`}
                onClick={() => loadConversation(f)}
              >
                <img src={resolveUrl(f.avatar)} alt="avatar" className="conversation-avatar" />
                <div className="conversation-info">
                  <div className="conversation-name">{f.name}</div>
                  <div className="conversation-last-message">Cliquer pour discuter</div>
                </div>
                {unreadBadge(f.unreadCount)}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {showChatPane ? (
        <div className="messages-content">
          {activeChat ? (
            <>
              <header className="chat-header">
                {isMobileView() && (
                  <button className="back-btn" onClick={() => setActiveChat(null)} aria-label="Retour">
                    <BackIcon />
                  </button>
                )}
                <img src={resolveUrl(activeChat.avatar)} alt="avatar" className="chat-avatar" />
                <div className="chat-user-info">
                  <div className="chat-username">{activeChat.name}</div>
                  <div className="chat-status">{typingLabel}</div>
                </div>
              </header>

              <div className="chat-body" ref={chatBodyRef}>
                {loadingConversation && <div className="messages-empty">Chargement...</div>}
                {!loadingConversation && !messages.length && <div className="messages-empty">Aucun message</div>}
                {messages.map((msg) => renderMessage(msg))}
                <div ref={messagesEndRef} />
              </div>

              <div
                className={`chat-footer ${isRecording ? "recording" : ""}`}
                onTouchMove={handleRecordMove}
                onMouseMove={handleRecordMove}
              >
                <div className="footer-left">
                  <button className="attach-btn" onClick={() => setShowAttachMenu((v) => !v)} aria-label="Plus">
                    <PlusIcon />
                  </button>
                  <button className="emoji-btn" aria-label="Emoji">
                    <EmojiIcon />
                  </button>
                </div>
                <div className="footer-input-wrap">
                  <input
                    value={input}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder={isRecording ? "Enregistrement..." : "Message"}
                    disabled={isRecording}
                  />
                  {isRecording && (
                    <div className="record-indicator">
                      <span className="record-dot" />
                      <span className="record-time">{formatDuration(recordTime)}</span>
                      <div className="record-level" ref={recordLevelBarRef}>
                        <div className="record-level-bar" style={{ width: `${Math.min(100, recordLevel * 100)}%` }} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="footer-right">
                  {input.trim() ? (
                    <button className="send-btn" onClick={sendMessage} aria-label="Envoyer">
                      <SendIcon />
                    </button>
                  ) : (
                    <button
                      className={`mic-btn ${recordLocked ? "locked" : ""} ${recordCanceled ? "canceled" : ""}`}
                      onMouseDown={startRecording}
                      onMouseUp={handleRecordEnd}
                      onMouseLeave={handleRecordEnd}
                      onTouchStart={startRecording}
                      onTouchEnd={handleRecordEnd}
                      aria-label="Enregistrer"
                    >
                      <MicIcon pulse={isRecording} />
                    </button>
                  )}
                </div>

                {isRecording && recordLocked && (
                  <div className="record-locked">
                    <span>Verrouillé</span>
                    <button className="send-btn" onClick={stopRecording} aria-label="Envoyer audio">
                      <SendIcon />
                    </button>
                  </div>
                )}

                {isRecording && recordCanceled && (
                  <div className="record-canceled">
                    <CloseIcon /> Annulé
                  </div>
                )}
              </div>

              {showAttachMenu && (
                <div
                  className="attach-sheet"
                  ref={attachMenuRef}
                  onTouchStart={handleAttachTouchStart}
                  onTouchEnd={handleAttachTouchEnd}
                >
                  <div className="attach-handle" />
                  <div className="attach-row">Pièces jointes à venir</div>
                </div>
              )}
            </>
          ) : (
            <div className="messages-placeholder">Choisissez un ami pour commencer</div>
          )}
        </div>
      ) : (
        <div className="messages-placeholder">Choisissez un ami</div>
      )}
    </div>
  );
}
