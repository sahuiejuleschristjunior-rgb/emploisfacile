import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import RecruiterLayout from "../../layouts/RecruiterLayout";
import { fetchJobChatConversations } from "../../api/jobChatApi";
import "../../styles/job-chat.css";
import { useNotifications } from "../../context/NotificationContext";

const API_URL = import.meta.env.VITE_API_URL;
const getId = (value) => (typeof value === "object" ? value?._id : value);
const loadErrorMessage = "Impossible de charger vos conversations";

const ensureJsonResponse = async (res) => {
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error("Réponse serveur invalide");
  }
  return res.json();
};

const resolveOtherParticipant = (participants, currentUserId) => {
  if (!Array.isArray(participants)) return null;
  return (
    participants.find((p) => getId(p) !== currentUserId) || participants[0] || null
  );
};

export default function RecruiterInbox() {
  const nav = useNavigate();
  const { deleteByType, socket } = useNotifications() || {};
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const [conversations, setConversations] = useState([]);
  const [jobsById, setJobsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadConversations = useCallback(
    async ({ showLoader = true } = {}) => {
      if (showLoader) setLoading(true);
      setError("");
      try {
        const list = await fetchJobChatConversations();
        setConversations(list);
      } catch (err) {
        setError(loadErrorMessage);
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    []
  );

  const isJobMessage = (message) =>
    Boolean(message?.job || message?.jobId || message?.job?._id || message?.application);

  useEffect(() => {
    deleteByType?.("job");
  }, [deleteByType]);

  useEffect(() => {
    loadConversations({ showLoader: true });
  }, [loadConversations]);

  useEffect(() => {
    if (!socket) return;

    const handleIncoming = (payload) => {
      const message = payload?.message || payload?.data || payload;
      if (!isJobMessage(message)) return;
      const conversationId =
        message?.conversationId ||
        (typeof message?.conversation === "object"
          ? message?.conversation?._id
          : message?.conversation);
      if (!conversationId) return;

      let shouldRefresh = false;
      setConversations((prev) => {
        const index = prev.findIndex(
          (conv) => String(conv?._id) === String(conversationId)
        );
        if (index === -1) {
          shouldRefresh = true;
          return prev;
        }

        const updated = {
          ...prev[index],
          lastMessage: message,
          updatedAt: message?.createdAt || new Date().toISOString(),
        };

        return [updated, ...prev.filter((_, idx) => idx !== index)];
      });

      if (shouldRefresh) {
        loadConversations({ showLoader: false });
      }
    };

    socket.on("message:new", handleIncoming);
    socket.on("new_message", handleIncoming);

    return () => {
      socket.off("message:new", handleIncoming);
      socket.off("new_message", handleIncoming);
    };
  }, [socket, loadConversations]);

  useEffect(() => {
    const jobIds = conversations
      .map((conv) => conv?.job?._id || conv?.jobId || conv?.job || conv?.lastMessage?.job)
      .filter(Boolean)
      .map(String);

    const missing = jobIds.filter((id) => !jobsById[id]);
    if (!missing.length || !token) return;

    let active = true;

    const fetchJobs = async () => {
      try {
        const results = await Promise.all(
          missing.map((jobId) =>
            fetch(`${API_URL}/jobs/${jobId}`, {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            })
              .then((res) => ensureJsonResponse(res))
              .then((data) => ({
                id: jobId,
                job: data?.job || data?.data || data,
              }))
              .catch(() => ({ id: jobId, job: null }))
          )
        );

        if (!active) return;
        setJobsById((prev) => {
          const next = { ...prev };
          results.forEach(({ id, job }) => {
            next[id] = job;
          });
          return next;
        });
      } catch (err) {
        if (!active) return;
        console.error("Erreur chargement jobs", err);
      }
    };

    fetchJobs();

    return () => {
      active = false;
    };
  }, [conversations, jobsById, token]);

  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      const jobId = conv?.job?._id || conv?.jobId || conv?.job || conv?.lastMessage?.job;
      if (!jobId) return false;
      const job = jobsById[String(jobId)] || conv?.job;
      const recruiterId = getId(job?.recruiter);
      return recruiterId && recruiterId === user?._id;
    });
  }, [conversations, jobsById, user?._id]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    nav("/login");
  };

  return (
    <RecruiterLayout user={user} onLogout={handleLogout}>
      <section className="job-chat-hero">
        <div>
          <p className="eyebrow">RecruiterChat</p>
          <h3>Vos échanges avec les candidats</h3>
          <p className="job-chat-subtitle">
            Retrouvez chaque conversation liée à une offre et continuez le suivi en temps réel.
          </p>
        </div>
      </section>

      <section className="card job-chat-card">
        <div className="card-header">
          <div>
            <h3>Conversations</h3>
            <p className="job-chat-muted">Offres actives et messages reçus.</p>
          </div>
        </div>

        {loading && <div className="loader">Chargement…</div>}
        {error && <div className="error-message">{error}</div>}
        {!loading && !error && filteredConversations.length === 0 && (
          <div className="empty-state">Aucune conversation liée à vos offres.</div>
        )}

        <div className="job-chat-list">
          {filteredConversations.map((conv) => {
            const jobId =
              conv?.job?._id || conv?.jobId || conv?.job || conv?.lastMessage?.job;
            const job = jobsById[String(jobId)] || conv?.job;
            const other = resolveOtherParticipant(conv?.participants, user?._id);
            const otherName = other?.name || other?.companyName || "Candidat";
            const lastMessage = conv?.lastMessage?.content || "Aucun message";
            const jobTitle = job?.title || conv?.jobTitle || "Offre";

            return (
              <button
                key={conv._id || jobId}
                type="button"
                className="job-chat-item"
                onClick={() =>
                  nav(`/recruiter/messages/${conv._id}`, {
                    state: {
                      jobId,
                      jobTitle,
                      otherParticipant: other,
                    },
                  })
                }
              >
                <div>
                  <div className="job-chat-item-title">{jobTitle}</div>
                  <div className="job-chat-item-sub">
                    {otherName}
                    <span className="job-chat-role">Candidat</span>
                  </div>
                </div>
                <div className="job-chat-item-preview">{lastMessage}</div>
              </button>
            );
          })}
        </div>
      </section>
    </RecruiterLayout>
  );
}
