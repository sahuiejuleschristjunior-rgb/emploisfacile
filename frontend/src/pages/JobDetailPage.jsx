import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useJobApplication from "../hooks/useJobApplication";
import "../styles/jobs.css";

export default function JobDetailPage() {
  const { id: jobIdParam } = useParams();
  const nav = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState("");

  const token = localStorage.getItem("token");
  const API_URL = import.meta.env.VITE_API_URL || "https://emploisfacile.org/api";

  const {
    appliedSet,
    applyingJobId,
    handleApply,
    registerAppliedFromJobs,
    isRecruiter,
    isCandidate,
  } = useJobApplication({
    apiUrl: API_URL,
    token,
    onFeedback: setFeedback,
  });

  const jobId = jobIdParam;

  const hasApplied = useMemo(() => job && appliedSet.has(job._id), [appliedSet, job]);

  useEffect(() => {
    fetchJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const formatDate = (value) => {
    if (!value) return "Date inconnue";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date inconnue";
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const getInitials = (name = "?") =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const getLocation = (data) => data?.location || data?.city || "Lieu non précisé";
  const getContract = (data) => data?.contractType || "Contrat non précisé";
  const getSalary = (data) => data?.salaryRange || null;

  async function fetchJob() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/jobs/${jobId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Erreur lors du chargement de l'offre.");
      }

      const data = await res.json();
      const loadedJob = data.job || data.data || data;
      setJob(loadedJob || null);
      registerAppliedFromJobs(loadedJob ? [loadedJob] : []);
    } catch (e) {
      console.log("Erreur récupération job :", e);
      setError("Erreur lors du chargement de l'offre.");
    } finally {
      setLoading(false);
    }
  }

  const recruiterName = job?.recruiter?.companyName || job?.recruiter?.name || job?.company;
  const companyName = recruiterName || "Entreprise inconnue";
  const location = getLocation(job);
  const contractType = getContract(job);
  const salary = getSalary(job);

  if (loading) {
    return (
      <div className="jobs-page job-detail-page">
        <p className="loading">Chargement...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="jobs-page job-detail-page">
        <div className="job-detail-shell">
          <button className="filter-btn" onClick={() => nav(-1)}>
            ← Retour
          </button>
          <h1 className="job-detail-title" style={{ marginTop: 20 }}>
            {error || "Aucune offre trouvée"}
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="jobs-page job-detail-page">
      <div className="job-detail-shell">
        <button className="filter-btn" onClick={() => nav(-1)}>
          ← Retour
        </button>

        <header className="job-detail-header">
          <div className="job-detail-avatar" aria-hidden>
            {getInitials(companyName)}
          </div>
          <div>
            <p className="job-detail-company">{companyName}</p>
            <p className="job-detail-meta">
              {contractType} • {location}
            </p>
            <p className="job-detail-date">Publiée le {formatDate(job.createdAt)}</p>
          </div>
        </header>

        <div className="job-detail-body">
          <h1 className="job-detail-title">{job.title}</h1>
          {salary && <p className="job-detail-salary">💰 {salary}</p>}

          <section className="job-detail-section">
            <h2 className="job-detail-section-title">Description du poste</h2>
            <p className="job-detail-text">{job.description}</p>
          </section>

          {job.requirements && (
            <section className="job-detail-section">
              <h2 className="job-detail-section-title">Exigences</h2>
              <p className="job-detail-text">{job.requirements}</p>
            </section>
          )}

          {feedback && <p className="job-detail-feedback">{feedback}</p>}
        </div>
      </div>

      <div className="job-detail-sticky">
        {isRecruiter ? (
          <div className="detail-cta disabled">
            <span className="detail-cta-title">Vous êtes recruteur</span>
            <span className="detail-cta-sub">Les recruteurs ne peuvent pas postuler aux offres</span>
          </div>
        ) : isCandidate && !hasApplied ? (
          <button
            className="detail-cta primary"
            onClick={() => handleApply(job._id, job.title)}
            disabled={applyingJobId === job._id}
          >
            {applyingJobId === job._id ? "Envoi..." : "Postuler"}
          </button>
        ) : (
          <button
            className="detail-cta neutral"
            onClick={() => nav(`/emplois/${job._id}`)}
          >
            Voir les détails
          </button>
        )}
      </div>
    </div>
  );
}
