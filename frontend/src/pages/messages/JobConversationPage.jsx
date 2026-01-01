import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useSocket } from "../../context/SocketContext";
import { sendMessagePayload } from "../../api/messagesApi";
import {
  fetchConversationMessages,
  fetchJobConversation,
} from "../../api/jobChatApi";
import MessageList from "../../components/jobchat/MessageList";
import MessageInput from "../../components/jobchat/MessageInput";
import CandidateLayout from "../../layouts/CandidateLayout";
import RecruiterLayout from "../../layouts/RecruiterLayout";
import "../../styles/job-chat.css";
import { useActiveConversation } from "../../context/ActiveConversationContext";
import { useNotifications } from "../../context/NotificationContext";

const API_URL = import.meta.env.VITE_API_URL;
const loadErrorMessage = "Impossible de charger vos conversations";

const ensureJsonResponse = async (res) => {
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error("Réponse serveur invalide");
  }
  return res.json();
};

const getId = (value) => (typeof value === "object" ? value?._id : value);

const resolveOtherParticipant = (participants, currentUserId) => {
  if (!Array.isArray(participants)) return null;
  return (
    participants.find((p) => getId(p) !== currentUserId) || participants[0] || null
  );
};

const resolveJobId = (conversation, fallbackJobId) =>
  conversation?.job?._id ||
  conversation?.jobId ||
  conversation?.job ||
  conversation?.lastMessage?.job ||
  fallbackJobId ||
  null;

export default function JobConversationPage() {
  const { conversationId } = useParams();
  const location = useLocation();
  const nav = useNavigate();
  const socket = useSocket();
  const { setActiveConversationId } = useActiveConversation() || {};
  const { deleteByType } = useNotifications() || {};

  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const role = user?.role;

  const [conversation, setConversation] = useState(null);
  const [job, setJob] = useState(location.state?.job || null);
  const [jobId, setJobId] = useState(location.state?.jobId || null);
  const [otherParticipant, setOtherParticipant] = useState(
    location.state?.otherParticipant || null
  );
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [lastIncomingId, setLastIncomingId] = useState(null);

  const messagesEndRef = useRef(null);
  const messageIdsRef = useRef(new Set());
  const highlightTimeoutRef = useRef(null);

  const basePath = role === "recruiter" ? "/recruiter/messages" : "/candidate/messages";
  const isDev = import.meta.env.MODE !== "production";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    nav("/login");
  };

  useEffect(() => {
    deleteByType?.("job");
  }, [deleteByType]);

  useEffect(() => {
    let active = true;

    const loadConversation = async () => {
      if (!token) {
        setError(loadErrorMessage);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const data = await fetchJobConversation(conversationId);
        if (!active) return;
        setConversation(data);
        const derivedJobId = resolveJobId(data, jobId);
        setJobId(derivedJobId);
        if (!otherParticipant) {
          setOtherParticipant(resolveOtherParticipant(data?.participants, user?._id));
        }
      } catch (err) {
        if (!active) return;
        setError(loadErrorMessage);
      } finally {
        if (active) setLoading(false);
      }
    };

    if (conversationId) {
      loadConversation();
    }

    return () => {
      active = false;
    };
  }, [conversationId, user?._id]);

  useEffect(() => {
    if (!setActiveConversationId || !conversationId) return;
    setActiveConversationId(conversationId);
    return () => {
      setActiveConversationId(null);
    };
  }, [conversationId, setActiveConversationId]);

  useEffect(() => {
    if (!jobId || job) return;
    if (!token) return;

    let active = true;

    const fetchJob = async () => {
      try {
        const res = await fetch(`${API_URL}/jobs/${jobId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) return;
        const data = await ensureJsonResponse(res);
        if (active) {
          setJob(data?.job || data?.data || data);
        }
      } catch (err) {
        console.error("Erreur job", err);
      }
    };

    fetchJob();

    return () => {
      active = false;
    };
  }, [jobId, job, token]);

  useEffect(() => {
    if (!jobId || !token || !role) return;

    let active = true;

    const verifyAccess = async () => {
      try {
        if (role === "recruiter") {
          const recruiterId = getId(job?.recruiter);
          if (!recruiterId) return;
          if (active) {
            setAccessDenied(recruiterId !== user?._id);
          }
        }

        if (role === "candidate") {
          const res = await fetch(`${API_URL}/applications/status?jobId=${jobId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          if (!res.ok) return;
          const data = await ensureJsonResponse(res);
          if (active) setAccessDenied(!data?.hasApplied);
        }
      } catch (err) {
        console.error("Erreur sécurité", err);
      }
    };

    verifyAccess();

    return () => {
      active = false;
    };
  }, [jobId, job, token, role, user?._id]);

  useEffect(() => {
    let active = true;

    const loadMessages = async () => {
      if (!conversationId || !token) {
        setError(loadErrorMessage);
        return;
      }
      setError("");
      try {
        const targetUserId = getId(otherParticipant) || conversationId;
        const list = await fetchConversationMessages(targetUserId);
        if (!active) return;
        const filtered = jobId
          ? list.filter((msg) =>
              String(msg?.job || msg?.jobId || msg?.job?._id) === String(jobId)
            )
          : list;
        filtered.forEach((msg) => {
          if (msg?._id) messageIdsRef.current.add(msg._id);
        });
        setMessages(filtered);
      } catch (err) {
        if (!active) return;
        setError(loadErrorMessage);
      }
    };

    loadMessages();

    return () => {
      active = false;
    };
  }, [conversationId, jobId, otherParticipant, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleConnect = () => {
      socket.emit("job:join", { conversationId });
      if (isDev) {
        console.log("🧩 JobChat rejoin on connect:", conversationId);
      }
    };

    socket.on("connect", handleConnect);

    return () => {
      socket.off("connect", handleConnect);
    };
  }, [socket, conversationId, isDev]);

  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit("job:join", { conversationId });
    if (isDev) {
      console.log("🧩 JobChat join emit:", conversationId);
    }

    const handleJoined = ({ conversationId: joinedId } = {}) => {
      if (isDev) {
        console.log("🧩 JobChat joined:", joinedId);
      }
    };

    const handleMessage = (payload) => {
      if (!payload || payload.type !== "job") return;
      if (String(payload.conversationId) !== String(conversationId)) return;

      const senderId = getId(payload.sender);
      if (senderId && senderId === user?._id) return;

      if (payload?._id && messageIdsRef.current.has(payload._id)) return;
      if (payload?._id) messageIdsRef.current.add(payload._id);

      const message = {
        ...payload,
        content: payload.text || payload.content || "",
      };

      setMessages((prev) => [...prev, message]);
      if (message._id) {
        setLastIncomingId(message._id);
      }
      if (isDev) {
        console.log("🧩 JobChat message received:", message);
      }
    };

    const handleTyping = ({ from, isTyping: typingFlag }) => {
      if (from === getId(otherParticipant)) {
        setIsTyping(Boolean(typingFlag));
      }
    };

    socket.on("job:joined", handleJoined);
    socket.on("job:message:new", handleMessage);
    socket.on("typing", handleTyping);

    return () => {
      socket.off("job:joined", handleJoined);
      socket.off("job:message:new", handleMessage);
      socket.off("typing", handleTyping);
      socket.emit("job:leave", { conversationId });
      if (isDev) {
        console.log("🧩 JobChat leave emit:", conversationId);
      }
    };
  }, [socket, conversationId, otherParticipant, isDev, user?._id]);

  useEffect(() => {
    if (!lastIncomingId) return;
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = setTimeout(() => {
      setLastIncomingId(null);
    }, 1200);

    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, [lastIncomingId]);

  const otherName =
    otherParticipant?.name || otherParticipant?.companyName || "Conversation";
  const otherRole = otherParticipant?.role === "recruiter" ? "Recruteur" : "Candidat";
  const jobTitle = job?.title || location.state?.jobTitle || "Offre";

  const handleSend = async (content) => {
    if (!otherParticipant) return;

    const payload = {
      sender: user?._id,
      receiver: getId(otherParticipant),
      conversationId,
      jobId,
      content,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, payload]);

    try {
      const { ok, data } = await sendMessagePayload({
        receiver: payload.receiver,
        content: payload.content,
        jobId: payload.jobId,
        conversationId: payload.conversationId,
      });

      if (ok && data?.data) {
        const message = data.data;
        if (message?._id && !messageIdsRef.current.has(message._id)) {
          messageIdsRef.current.add(message._id);
          setMessages((prev) => [...prev.filter((msg) => msg !== payload), message]);
        }
      }
    } catch (err) {
      setError(err.message || "Impossible d'envoyer le message.");
    }
  };

  const handleTyping = (typingFlag) => {
    if (!socket || !otherParticipant) return;
    socket.emit("typing", { to: getId(otherParticipant), isTyping: typingFlag });
  };

  const Layout = role === "recruiter" ? RecruiterLayout : CandidateLayout;

  if (accessDenied) {
    return (
      <Layout user={user} onLogout={handleLogout}>
        <div className="job-chat-denied">
          <h3>Accès refusé</h3>
          <p>Vous n'êtes pas autorisé à accéder à cette conversation.</p>
          <button className="primary-btn" onClick={() => nav(basePath)}>
            Retour aux messages
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={handleLogout}>
      <div className="job-chat-page">
        <header className="job-chat-header">
          <button className="ghost-link" onClick={() => nav(basePath)}>
            ← Retour
          </button>
          <div className="job-chat-header-info">
            <h2>{jobTitle}</h2>
            <div className="job-chat-header-sub">
              <span>{otherName}</span>
              <span className="job-chat-badge">{otherRole}</span>
            </div>
          </div>
        </header>

        {loading && <div className="job-chat-loading">Chargement…</div>}
        {error && <div className="job-chat-error">{error}</div>}

        <MessageList
          messages={messages}
          currentUserId={user?._id}
          lastIncomingId={lastIncomingId}
        />

        {isTyping && (
          <div className="job-chat-typing">{otherName} est en train d'écrire…</div>
        )}

        <div ref={messagesEndRef} />

        <MessageInput
          onSend={handleSend}
          onTyping={handleTyping}
          disabled={!conversationId || !jobId || !otherParticipant}
        />
      </div>
    </Layout>
  );
}
