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

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      fill="currentColor"
      d="M12 4c.6 0 1 .4 1 1v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 0 1 0-2h6V5c0-.6.4-1 1-1Z"
    />
  </svg>
);

const MicIcon = ({ pulse = false }) => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    className={pulse ? "pulse" : ""}
    aria-hidden
  >
    <path
      fill="currentColor"
      d="M12 3a3 3 0 0 1 3 3v6a3 3 0 1 1-6 0V6a3 3 0 0 1 3-3Zm-1 17.93V20h2v.93a7.04 7.04 0 0 0 5.48-4.28 1 1 0 0 0-1.83-.78A5.03 5.03 0 0 1 7.35 15a1 1 0 0 0-1.83.79A7.04 7.04 0 0 0 11 20.93Z"
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

const EmojiIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      fill="currentColor"
      d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-3 6a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm-6.83 7.25a1 1 0 0 1 1.41-.08A4.99 4.99 0 0 0 12 16c1.22 0 2.38-.45 3.28-1.26a1 1 0 1 1 1.34 1.48A7 7 0 0 1 12 18a6.99 6.99 0 0 1-4.62-1.78 1 1 0 0 1-.2-1Z"
    />
  </svg>
);

const BackIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      fill="currentColor"
      d="M14.7 5.3a1 1 0 0 1 0 1.4L10.4 11l4.3 4.3a1 1 0 0 1-1.4 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.4 0Z"
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
  // =============================
  // STATE
  // =============================
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [errorFriends, setErrorFriends] = useState("");
  const [search, setSearch] = useState("");
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionPicker, setReactionPicker] = useState({ messageId: null, anchor: null });
  const [input, setInput] = useState("");
  const [typingState, setTypingState] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const [recordLocked, setRecordLocked] = useState(false);
  const [recordCanceled, setRecordCanceled] = useState(false);
  const [recordOffset, setRecordOffset] = useState(0);
  const [recordTime, setRecordTime] = useState(0);
  const [recordLevel, setRecordLevel] = useState(0);
  const [audioStatus, setAudioStatus] = useState({});

  // =============================
  // REFS
  // =============================
  const socketRef = useRef(null);
  const recordStartRef = useRef(null);
  const recordTimerRef = useRef(null);
  const recordVizFrame = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const audioAnalyserRef = useRef(null);
  const audioGainRef = useRef(null);
  const recordLevelBarRef = useRef(null);
  const recordCanceledRef = useRef(false);
  const messagesEndRef = useRef(null);
  const chatBodyRef = useRef(null);
  const attachMenuRef = useRef(null);
  const attachSwipeStart = useRef(null);
  const longPressTimer = useRef(null);
  const typingTimeoutRef = useRef(null);
  const audioRefs = useRef({});
  const currentAudioRef = useRef(null);
  const currentAudioIdRef = useRef(null);

  // =============================
  // HELPERS
  // =============================
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

  const filteredFriends = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => (f.name || "").toLowerCase().includes(q));
  }, [friends, search]);

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

  const scrollToBottom = (force = false) => {
    const container = chatBodyRef.current;
    if (!container) return;
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (force || distance < 120) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const upsertMessage = (incoming) => {
    if (!incoming) return;
    setMessages((prev) => {
      const next = [...prev];

      const existingIndex = next.findIndex(
        (m) => m._id === incoming._id || (incoming.clientTempId && m.clientTempId === incoming.clientTempId)
      );

      if (existingIndex >= 0) {
        next[existingIndex] = { ...next[existingIndex], ...incoming };
      } else {
        next.push(incoming);
      }

      return next.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    });
  };

  const isMessageInActiveChat = (msg) => {
    if (!activeChat || !msg) return false;
    const senderId = typeof msg.sender === "object" ? msg.sender?._id : msg.sender;
    const receiverId = typeof msg.receiver === "object" ? msg.receiver?._id : msg.receiver;
    return senderId === activeChat._id || receiverId === activeChat._id || (senderId === me?._id && receiverId === me?._id);
  };

  // =============================
  // FRIENDS LOAD
  // =============================
  useEffect(() => {
    const loadFriends = async () => {
      try {
        setLoadingFriends(true);
        setErrorFriends("");
        const data = await fetchFriends();
        const raw = Array.isArray(data) ? data : Array.isArray(data?.friends) ? data.friends : [];
        const list = raw
          .map(normalizeFriend)
          .filter((u) => u && u._id)
          .reduce((acc, user) => {
            if (!acc.some((u) => u._id === user._id)) acc.push(user);
            return acc;
          }, []);
        setFriends(list);
      } catch (err) {
        console.error("Erreur chargement amis", err);
        setErrorFriends("Erreur chargement amis");
        setFriends([]);
      } finally {
        setLoadingFriends(false);
      }
    };

    loadFriends();
  }, []);

  // =============================
  // SOCKET
  // =============================
  useEffect(() => {
    if (!token) return undefined;
    const socket = io(SOCKET_URL, {
      path: "/socket.io/",
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    const handleIncoming = (payload) => {
      const message = payload?.message || payload;
      if (!isMessageInActiveChat(message)) return;
      upsertMessage(message);
      if (message?.sender !== me?._id) {
        fetch(`${API_URL}/messages/${message._id}/read`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    };

    socket.on("new_message", handleIncoming);
    socket.on("audio_message", handleIncoming);

    socket.on("reaction_update", (payload) => {
      if (payload?.message && isMessageInActiveChat(payload.message)) {
        upsertMessage(payload.message);
      }
    });

    socket.on("message_read", ({ messageId, withUserId }) => {
      if (!messageId && !withUserId) return;
      setMessages((prev) =>
        prev.map((m) => {
          const senderId = typeof m.sender === "object" ? m.sender?._id : m.sender;
          const receiverId = typeof m.receiver === "object" ? m.receiver?._id : m.receiver;
          if ((messageId && m._id === messageId) || (withUserId && senderId === me?._id && receiverId === withUserId)) {
            return { ...m, isRead: true, readAt: new Date() };
          }
          return m;
        })
      );
    });

    socket.on("typing", ({ from, isTyping }) => {
      if (!from || !activeChat || from !== activeChat._id) return;
      setTypingState((prev) => ({ ...prev, [from]: { isTyping: isTyping !== false, at: Date.now() } }));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeChat, token]);

  // =============================
  // CONVERSATION LOAD
  // =============================
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
      const list = (Array.isArray(data) ? data : []).sort(
        (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
      );
      setMessages(list);
      fetch(`${API_URL}/messages/read-all/${user._id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
      setTimeout(() => scrollToBottom(true), 80);
    } catch (err) {
      console.error("Erreur conversation", err);
      setMessages([]);
    } finally {
      setLoadingConversation(false);
    }
  };

  // =============================
  // SEND TEXT
  // =============================
  const sendMessage = async () => {
    if (!input.trim() || !activeChat) return;
    const content = input.trim();
    setInput("");
    const clientTempId = `temp-${Date.now()}`;
    const tempMessage = {
      _id: clientTempId,
      sender: me?._id,
      receiver: activeChat._id,
      content,
      type: "text",
      clientTempId,
      createdAt: new Date().toISOString(),
    };
    upsertMessage(tempMessage);
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
      if (res.ok && data?.data) {
        upsertMessage(data.data);
      }
    } catch (err) {
      console.error("Erreur envoi message", err);
    }
  };

  // =============================
  // AUDIO RECORDING
  // =============================
  const stopRecordVisualization = () => {
    if (recordVizFrame.current) {
      cancelAnimationFrame(recordVizFrame.current);
      recordVizFrame.current = null;
    }
  };

  const cleanupRecording = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    stopRecordVisualization();
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    audioAnalyserRef.current = null;
    audioGainRef.current = null;
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }
  };

  const startRecording = async (event) => {
    if (!activeChat || isRecording) return;
    const clientX = event?.touches?.[0]?.clientX || event?.clientX || 0;
    const clientY = event?.touches?.[0]?.clientY || event?.clientY || 0;

    recordStartRef.current = { at: Date.now(), x: clientX, y: clientY };
    recordingChunksRef.current = [];
    recordCanceledRef.current = false;
    setRecordOffset(0);
    setRecordLocked(false);
    setRecordCanceled(false);
    setRecordLevel(0);
    setRecordTime(0);

    recordTimerRef.current = setInterval(() => {
      setRecordTime(Date.now() - (recordStartRef.current?.at || Date.now()));
    }, 200);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
      mediaRecorderRef.current = recorder;
      audioContextRef.current = audioContext;
      audioAnalyserRef.current = analyser;
      audioGainRef.current = gainNode;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordingChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const duration = Date.now() - (recordStartRef.current?.at || Date.now());
        const canceled = recordCanceledRef.current || duration < 300;
        stream.getTracks().forEach((t) => t.stop());
        stopRecordVisualization();
        audioContext.close().catch(() => {});
        audioContextRef.current = null;
        audioAnalyserRef.current = null;
        audioGainRef.current = null;
        if (canceled || !recordingChunksRef.current.length) {
          recordingChunksRef.current = [];
          setRecordLevel(0);
          return;
        }
        const blob = new Blob(recordingChunksRef.current, { type: "audio/webm" });
        if (blob.size === 0) return;
        uploadAudio(blob);
        recordingChunksRef.current = [];
      };

      const animateLevel = () => {
        const buffer = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(buffer);
        const max = buffer.reduce((m, v) => Math.max(m, v), 0) / 255;
        const level = Math.min(1, max * 1.4);
        setRecordLevel(level);
        if (recordLevelBarRef.current) {
          recordLevelBarRef.current.style.setProperty("--record-level", level.toString());
        }
        recordVizFrame.current = requestAnimationFrame(animateLevel);
      };
      animateLevel();

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Erreur accès micro", err);
      cleanupRecording();
      setIsRecording(false);
      recordStartRef.current = null;
    }
  };

  const stopRecording = (forceCancel = false) => {
    if (!isRecording) return;
    if (forceCancel) {
      recordCanceledRef.current = true;
      setRecordCanceled(true);
      recordingChunksRef.current = [];
    }
    setIsRecording(false);
    setRecordLocked(false);
    setRecordLevel(0);
    if (recordLevelBarRef.current) {
      recordLevelBarRef.current.style.setProperty("--record-level", "0");
    }
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    } else {
      cleanupRecording();
    }
  };

  const updateRecordingDrag = (event) => {
    if (!isRecording || !recordStartRef.current) return;
    const clientX = event?.touches?.[0]?.clientX || event?.clientX || 0;
    const clientY = event?.touches?.[0]?.clientY || event?.clientY || 0;
    const deltaX = clientX - (recordStartRef.current.x || clientX);
    const deltaY = clientY - (recordStartRef.current.y || clientY);

    if (!recordLocked && deltaY < -70) {
      setRecordLocked(true);
      return;
    }

    if (deltaX > 80) {
      // swipe right => immediate send
      setRecordOffset(deltaX);
      recordCanceledRef.current = false;
      stopRecording(false);
      return;
    }

    if (deltaX < -60) {
      // swipe left => immediate cancel
      recordCanceledRef.current = true;
      setRecordCanceled(true);
      setRecordOffset(deltaX);
      recordingChunksRef.current = [];
      stopRecording(true);
      return;
    }

    setRecordOffset(deltaX);
    setRecordCanceled(false);
    recordCanceledRef.current = false;
  };

  const uploadAudio = async (blob) => {
    if (!activeChat || !blob) return;
    const fileName = `voice-${Date.now()}.webm`;
    const tempUrl = URL.createObjectURL(blob);
    const clientTempId = `temp-${Date.now()}`;
    const tempMessage = {
      _id: clientTempId,
      sender: me?._id,
      receiver: activeChat._id,
      type: "audio",
      audioUrl: tempUrl,
      content: "",
      clientTempId,
      createdAt: new Date().toISOString(),
    };
    upsertMessage(tempMessage);
    setTimeout(() => scrollToBottom(true), 10);

    const formData = new FormData();
    formData.append("audio", blob, fileName);
    formData.append("receiver", activeChat._id);
    formData.append("clientTempId", clientTempId);

    try {
      const res = await fetch(`${API_URL}/messages/audio`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data?.data) {
        upsertMessage(data.data);
      }
    } catch (err) {
      console.error("Erreur upload audio", err);
    }
  };

  // =============================
  // AUDIO PLAYBACK
  // =============================
  const togglePlay = (messageId) => {
    const audio = audioRefs.current[messageId];
    if (!audio) return;

    if (audio.paused) {
      if (currentAudioRef.current && currentAudioRef.current !== audio && currentAudioIdRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        setAudioStatus((prev) => ({
          ...prev,
          [currentAudioIdRef.current]: { ...(prev[currentAudioIdRef.current] || {}), currentTime: 0, playing: false },
        }));
      }
      currentAudioRef.current = audio;
      currentAudioIdRef.current = messageId;
      audio.play();
    } else {
      audio.pause();
      currentAudioRef.current = audio;
      currentAudioIdRef.current = messageId;
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
      if (currentAudioRef.current === node) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
        currentAudioIdRef.current = null;
      }
      updateStatus();
    };
  };

  // =============================
  // REACTIONS
  // =============================
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
        upsertMessage(data.data);
      }
    } catch (err) {
      console.error("Erreur réaction", err);
    } finally {
      setReactionPicker({ messageId: null, anchor: null });
      setShowEmojiPicker(false);
    }
  };

  const handleBubblePressStart = (msg, event) => {
    event.preventDefault();
    clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      setReactionPicker({ messageId: msg._id, anchor: msg._id });
      setShowEmojiPicker(true);
    }, 450);
  };

  const handleBubblePressEnd = () => {
    clearTimeout(longPressTimer.current);
  };

  useEffect(() => {
    const closePicker = (e) => {
      if (reactionPicker.messageId && !e.target.closest?.(".reaction-picker")) {
        setReactionPicker({ messageId: null, anchor: null });
        setShowEmojiPicker(false);
      }
    };
    window.addEventListener("click", closePicker);
    return () => window.removeEventListener("click", closePicker);
  }, [reactionPicker.messageId]);

  // =============================
  // TYPING
  // =============================
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
    const interval = setInterval(() => {
      setTypingState((prev) => {
        const now = Date.now();
        const next = { ...prev };
        Object.entries(prev).forEach(([userId, state]) => {
          if (!state?.at || now - state.at > 2500) delete next[userId];
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => scrollToBottom(false), [messages]);

  useEffect(() => {
    return () => {
      cleanupRecording();
      clearTimeout(longPressTimer.current);
      clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // =============================
  // RENDER HELPERS
  // =============================
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
    const progress = status.duration ? Math.min((status.currentTime / status.duration) * 100, 100) : 0;
    const url = resolveUrl(msg.audioUrl);
    return (
      <div className="audio-bubble">
        <button className={`audio-play ${status.playing ? "playing" : ""}`} onClick={() => togglePlay(msg._id)}>
          {status.playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <div className="audio-progress">
          <div className="audio-progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <div className="audio-duration">{formatTime(status.currentTime)} / {formatTime(status.duration)}</div>
        <audio ref={(node) => bindAudioRef(msg, node)} src={url} preload="metadata" />
      </div>
    );
  };

  const renderMessageContent = (msg) => {
    if (msg.type === "audio") return renderAudioBubble(msg);
    return msg.content;
  };

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

  const renderMessages = () => {
    if (loadingConversation) return <div className="chat-empty">Chargement…</div>;
    if (!messages.length) {
      return (
        <div className="chat-empty">
          Aucun message pour le moment
          <br />
          Commence la conversation 👋
        </div>
      );
    }
    return messages.map((msg) => {
      const senderId = typeof msg.sender === "object" ? msg.sender?._id : msg.sender;
      const isMe = senderId === me?._id;
      return (
        <div key={msg._id} className={`message-row ${isMe ? "me" : "other"}`}>
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
    });
  };

  // =============================
  // UI
  // =============================
  return (
    <div className={`messages-page ${activeChat ? "chat-open" : ""}`}>
      {/* Sidebar */}
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
          {!loadingFriends && errorFriends && <div className="messages-empty">{errorFriends}</div>}
          {!loadingFriends && !errorFriends && filteredFriends.length === 0 && (
            <div className="messages-empty">Aucun ami pour le moment</div>
          )}
          {filteredFriends.map((friend) => (
            <div
              key={friend._id}
              className={`conversation-item ${activeChat?._id === friend._id ? "active" : ""}`}
              onClick={() => loadConversation(friend)}
            >
              <img src={friend.avatar} alt={friend.name} className="conversation-avatar" />
              <div className="conversation-info">
                <div className="conversation-name">{friend.name}</div>
                <div className="conversation-last-message">Démarrer une conversation</div>
              </div>
              {friend.unreadCount > 0 && <div className="conv-unread-badge">{friend.unreadCount}</div>}
            </div>
          ))}
        </div>
      </aside>

      {/* Chat */}
      <main className="messages-content">
        {!activeChat ? (
          <div className="messages-placeholder">
            <h3>Sélectionne un ami</h3>
            <p>Clique sur un ami pour commencer une conversation.</p>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <button className="chat-back-btn" onClick={() => { setActiveChat(null); setMessages([]); }}>
                <BackIcon />
              </button>
              <img src={activeChat.avatar} alt={activeChat.name} className="chat-avatar" />
              <div className="chat-user-info">
                <div className="chat-username">{activeChat.name}</div>
                <div className="chat-status">
                  {typingState[activeChat._id]?.isTyping ? "En train d'écrire..." : "En ligne"}
                </div>
              </div>
            </div>

            <div className="chat-body" ref={chatBodyRef}>
              {renderMessages()}
              <div ref={messagesEndRef} />
            </div>

            <div
              className="chat-input-bar"
              onMouseMove={updateRecordingDrag}
              onTouchMove={updateRecordingDrag}
              onMouseUp={isRecording && !recordLocked ? () => stopRecording(false) : undefined}
              onTouchEnd={isRecording && !recordLocked ? () => stopRecording(false) : undefined}
            >
              <div className="attach-wrapper" ref={attachMenuRef}>
                <button
                  className="chat-attach-btn"
                  onClick={() => { setShowAttachMenu((p) => !p); setShowEmojiPicker(false); }}
                  aria-label="Pièces jointes"
                >
                  <PlusIcon />
                </button>
              </div>

              {isRecording ? (
                <div className={`recording-banner ${recordCanceled ? "canceled" : ""}`}>
                  <div className="recording-icon">
                    <MicIcon pulse={!recordCanceled} />
                  </div>
                  <div className="recording-info">
                    <div className="recording-timer">{formatTime(Math.floor(recordTime / 1000))}</div>
                    <div className="recording-hint">
                      {recordLocked
                        ? "Verrouillé — appuie pour envoyer"
                        : recordCanceled
                        ? "Annulé"
                        : "Glisser à droite pour envoyer / à gauche pour annuler / vers le haut pour verrouiller"}
                    </div>
                    <div className="recording-level">
                      <div className="recording-level-bar" ref={recordLevelBarRef} style={{ "--record-level": recordLevel }} />
                    </div>
                  </div>
                  <div className="recording-slider" style={{ transform: `translateX(${recordOffset}px)` }} />
                  {recordLocked && (
                    <button className="recording-send" type="button" onClick={() => stopRecording(false)} aria-label="Envoyer la note vocale">
                      <SendIcon />
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <input
                    className="chat-input"
                    placeholder="Message..."
                    value={input}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  />
                  <button
                    className="emoji-btn"
                    type="button"
                    onClick={() => {
                      if (!messages.length) return;
                      const lastMessage = messages[messages.length - 1];
                      setReactionPicker({ messageId: lastMessage._id, anchor: "input" });
                      setShowEmojiPicker(true);
                    }}
                    aria-label="Réagir"
                  >
                    <EmojiIcon />
                  </button>
                  {input.trim().length > 0 ? (
                    <button className="chat-send-btn" onClick={sendMessage}>
                      <SendIcon />
                    </button>
                  ) : (
                    <button
                      className={`chat-mic-btn ${isRecording ? "recording" : ""}`}
                      onMouseDown={startRecording}
                      onTouchStart={startRecording}
                      aria-label="Maintenir pour enregistrer"
                      type="button"
                    >
                      <MicIcon />
                    </button>
                  )}
                </>
              )}
            </div>

            {showAttachMenu && (
              <div className="attach-sheet" role="dialog" onTouchStart={handleAttachTouchStart} onTouchEnd={handleAttachTouchEnd}>
                <div className="attach-sheet-handle" />
                <div className="attach-options">
                  <button className="attach-item">Fichier</button>
                  <button className="attach-item">Image</button>
                  <button className="attach-item">Caméra</button>
                  <button className="attach-item">Localisation</button>
                </div>
              </div>
            )}

            {showEmojiPicker && reactionPicker.messageId && (
              <div className="reaction-picker">
                <div className="reaction-bar">
                  {REACTIONS.map((emoji) => (
                    <button key={emoji} className="reaction-btn" onClick={() => sendReaction(reactionPicker.messageId, emoji)}>
                      {emoji}
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
