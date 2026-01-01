import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import RecruiterLayout from "../../layouts/RecruiterLayout";
import { fetchJobChatConversations } from "../../api/jobChatApi";
import "../../styles/job-chat.css";

const API_URL = import.meta.env.VITE_API_URL;
const getId = (value) => (typeof value === "object" ? value?._id : value);
const loadErrorMessage = "Impossible de charger vos conversations";
const JOB_CHAT_TYPE = "job";

const statusLabels = {
  pending: "En attente",
  reviewing: "En cours",
  interview: "Entretien",
  accepted: "Acceptée",
  rejected: "Refusée",
};

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

const resolveStatusLabel = (status) => {
  const key = (status || "").toString().toLowerCase();
  return statusLabels[key] || status || "Statut inconnu";
};

export default function RecruiterInbox() {
  const nav = useNavigate();
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const [conversations, setConversations] = useState([]);
  const [jobsById, setJobsById] = useState({});
  const [applicationsByKey, setApplicationsByKey] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const list = await fetchJobChatConversations();
        if (!active) return;
        setConversations(list);
      } catch (err) {
        if (!active) return;
        setError(loadErrorMessage);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;

    const loadApplications = async () => {
      try {
        const res = await fetch(`${API_URL}/applications/all`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) return;
        const data = await ensureJsonResponse(res);
        const apps = Array.isArray(data) ? data : data.applications || [];
        if (!active) return;
        setApplicationsByKey(() =>
          apps.reduce((acc, app) => {
            const jobId = app?.job?._id || app?.jobId;
            const candidateId = app?.candidate?._id || app?.candidateId;
            if (jobId && candidateId) {
              acc[`${jobId}:${candidateId}`] = app;
            }
            return acc;
          }, {})
        );
      } catch (err) {
        console.error("Erreur candidatures", err);
      }
    };

    loadApplications();

    return () => {
      active = false;
    };
  }, [token]);

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

  const getConversationMeta = (conv) => {
    const jobId =
      conv?.job?._id || conv?.jobId || conv?.job || conv?.lastMessage?.job || null;
    const other = resolveOtherParticipant(conv?.participants, user?._id);
    const candidateId = getId(other);
    const application =
      jobId && candidateId ? applicationsByKey[`${jobId}:${candidateId}`] : null;

    return {
      jobId,
      other,
      candidateId:
        conv?.candidateId || conv?.candidate?._id || candidateId || application?.candidate?._id || null,
      recruiterId:
        conv?.recruiterId || conv?.recruiter?._id || application?.job?.recruiter?._id || user?._id || null,
      applicationId:
        conv?.applicationId || conv?.application?._id || application?._id || null,
      application,
    };
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      if (conv?.type !== JOB_CHAT_TYPE) return false;
      const meta = getConversationMeta(conv);
      if (!meta.jobId) return false;
      const job = jobsById[String(meta.jobId)] || conv?.job;
      const recruiterId = getId(job?.recruiter);
      if (!recruiterId || recruiterId !== user?._id) return false;
      return Boolean(meta.applicationId && meta.candidateId && meta.recruiterId);
    });
  }, [conversations, jobsById, user?._id, applicationsByKey]);

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
            const meta = getConversationMeta(conv);
            const jobId = meta.jobId;
            const job = jobsById[String(jobId)] || conv?.job || meta.application?.job;
            const other = meta.other;
            const companyName =
              job?.companyName ||
              job?.company?.name ||
              job?.recruiter?.companyName ||
              user?.companyName ||
              "Entreprise";
            const lastMessage = conv?.lastMessage?.content || "Aucun message";
            const jobTitle = job?.title || conv?.jobTitle || "Offre";
            const statusLabel = resolveStatusLabel(
              meta.application?.status || conv?.applicationStatus || conv?.status
            );

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
                      applicationId: meta.applicationId,
                      candidateId: meta.candidateId,
                      recruiterId: meta.recruiterId,
                    },
                  })
                }
              >
                <div>
                  <div className="job-chat-item-title">{jobTitle}</div>
                  <div className="job-chat-item-sub">
                    <span>{companyName}</span>
                    <span className="job-chat-role">{statusLabel}</span>
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
