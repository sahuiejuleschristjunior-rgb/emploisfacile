import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import {
  fetchConversationMessages,
  fetchJobConversation,
} from "../../api/jobChatApi";
import MessageList from "../../components/jobchat/MessageList";
import MessageInput from "../../components/jobchat/MessageInput";
import "../../styles/job-chat.css";

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

export default function JobMessages() {
  const { conversationId } = useParams();
  const location = useLocation();
  const nav = useNavigate();

  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const role = user?.role;

  const [job, setJob] = useState(location.state?.job || null);
  const [jobId, setJobId] = useState(location.state?.jobId || null);
  const [otherParticipant, setOtherParticipant] = useState(
    location.state?.otherParticipant || null
  );
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);

  const messagesEndRef = useRef(null);
  const messageIdsRef = useRef(new Set());

  const basePath = role === "recruiter" ? "/recruiter/messages" : "/candidate/messages";

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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!token || !conversationId) return;

    // Socket dédié à Job Messages : aucune dépendance aux sockets globaux.
    const socket = io(API_URL, { auth: { token } });

    // Rejoindre la room dédiée à cette conversation.
    socket.emit("job:join", { conversationId });

    const handleJobMessage = (message) => {
      const resolvedMessage = message?.message || message;
      if (String(resolvedMessage?.conversationId) !== String(conversationId)) return;

      const senderId = getId(resolvedMessage?.senderId || resolvedMessage?.sender);
      if (senderId && String(senderId) === String(user?._id)) return;

      if (resolvedMessage?._id && messageIdsRef.current.has(resolvedMessage._id)) return;
      if (resolvedMessage?._id) messageIdsRef.current.add(resolvedMessage._id);

      setMessages((prev) => [...prev, resolvedMessage]);
    };

    socket.on("job:message:new", handleJobMessage);

    return () => {
      socket.emit("job:leave", { conversationId });
      socket.off("job:message:new", handleJobMessage);
      socket.off();
      socket.disconnect();
    };
  }, [conversationId, token, user?._id]);

  const otherName =
    otherParticipant?.name || otherParticipant?.companyName || "Conversation";
  const otherRole = otherParticipant?.role === "recruiter" ? "Recruteur" : "Candidat";
  const jobTitle = job?.title || location.state?.jobTitle || "Offre";

  const handleSend = async (content) => {
    if (!otherParticipant || !token) return;

    const payload = {
      senderId: user?._id,
      receiverId: getId(otherParticipant),
      conversationId,
      jobId,
      content,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch(`${API_URL}/job-messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receiverId: payload.receiverId,
          content: payload.content,
          jobId: payload.jobId,
          conversationId: payload.conversationId,
        }),
      });

      if (!res.ok) {
        throw new Error("Impossible d'envoyer le message.");
      }

      const data = await ensureJsonResponse(res);
      const message = data?.data || data?.message || data || payload;
      if (message?._id) {
        messageIdsRef.current.add(message._id);
      }

      setMessages((prev) => [...prev, message]);
    } catch (err) {
      setError(err.message || "Impossible d'envoyer le message.");
    }
  };

  if (accessDenied) {
    return (
      <div className="job-chat-page">
        <div className="job-chat-denied">
          <h3>Accès refusé</h3>
          <p>Vous n'êtes pas autorisé à accéder à cette conversation.</p>
          <button className="primary-btn" onClick={() => nav(basePath)}>
            Retour aux messages
          </button>
        </div>
      </div>
    );
  }

  return (
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

      <MessageList messages={messages} currentUserId={user?._id} />

      <div ref={messagesEndRef} />

      <MessageInput onSend={handleSend} disabled={!conversationId || !jobId || !otherParticipant} />
    </div>
  );
}
