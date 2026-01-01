import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CandidateLayout from "../../layouts/CandidateLayout";
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

export default function CandidateInbox() {
  const nav = useNavigate();
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const [conversations, setConversations] = useState([]);
  const [jobsById, setJobsById] = useState({});
  const [allowedJobIds, setAllowedJobIds] = useState(new Set());
  const [applicationsByJobId, setApplicationsByJobId] = useState({});
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
    const fetchApplications = async () => {
      try {
        const res = await fetch(`${API_URL}/applications/my-applications`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) return;
        const data = await ensureJsonResponse(res);
        const apps = Array.isArray(data) ? data : data.applications || [];
        if (!active) return;
        setAllowedJobIds(new Set(apps.map((app) => String(app?.job?._id)).filter(Boolean)));
        setApplicationsByJobId(() =>
          apps.reduce((acc, app) => {
            const jobId = app?.job?._id;
            if (jobId) acc[String(jobId)] = app;
            return acc;
          }, {})
        );
      } catch (err) {
        console.error("Erreur candidatures", err);
      }
    };

    fetchApplications();

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
    const application = jobId ? applicationsByJobId[String(jobId)] : null;
    const other = resolveOtherParticipant(conv?.participants, user?._id);
    return {
      jobId,
      application,
      applicationId:
        conv?.applicationId || conv?.application?._id || application?._id || null,
      candidateId:
        conv?.candidateId || conv?.candidate?._id || application?.candidate?._id || user?._id || null,
      recruiterId:
        conv?.recruiterId ||
        conv?.recruiter?._id ||
        application?.job?.recruiter?._id ||
        getId(other) ||
        null,
      other,
    };
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      if (conv?.type !== JOB_CHAT_TYPE) return false;
      const meta = getConversationMeta(conv);
      if (!meta.jobId) return false;
      if (!allowedJobIds.size) return false;
      if (!allowedJobIds.has(String(meta.jobId))) return false;
      return Boolean(meta.applicationId && meta.candidateId && meta.recruiterId);
    });
  }, [conversations, allowedJobIds, applicationsByJobId, user?._id]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    nav("/login");
  };

  return (
    <CandidateLayout user={user} onLogout={handleLogout}>
      <section className="job-chat-hero">
        <div>
          <p className="eyebrow">JobChat</p>
          <h3>Vos échanges avec les recruteurs</h3>
          <p className="job-chat-subtitle">
            Discutez uniquement pour vos candidatures actives, offre par offre.
          </p>
        </div>
      </section>

      <section className="card job-chat-card">
        <div className="card-header">
          <div>
            <h3>Conversations</h3>
            <p className="job-chat-muted">Historique sauvegardé et disponible en temps réel.</p>
          </div>
        </div>

        {loading && <div className="loader">Chargement…</div>}
        {error && <div className="error-message">{error}</div>}
        {!loading && !error && filteredConversations.length === 0 && (
          <div className="empty-state">Aucune conversation pour vos candidatures.</div>
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
              other?.companyName ||
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
                  nav(`/candidate/messages/${conv._id}`, {
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
    </CandidateLayout>
  );
}
