import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useJobApplications from "../hooks/useJobApplications";
import "../styles/JobDetail.css";

export default function JobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const token = localStorage.getItem("token");
  const API_URL = import.meta.env.VITE_API_URL;

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch {
      return {};
    }
  }, []);

  const normalizedRole = (currentUser.role || "").toLowerCase();
  const isRecruiter = normalizedRole === "recruiter" || normalizedRole === "recruteur";

  const { appliedSet, applyingJobId, applyToJob, syncAppliedFromJobs } = useJobApplications(
    currentUser,
    {
      onFeedback: setFeedback,
    },
  );

  useEffect(() => {
    fetchJob();
  }, [jobId]);

  useEffect(() => {
    if (job) syncAppliedFromJobs([job]);
  }, [job, syncAppliedFromJobs]);

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

  const getInitials = (name = "?") => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const recruiterName =
    job?.recruiter?.companyName || job?.recruiter?.name || job?.company || "Entreprise inconnue";

  const hasApplied = job ? appliedSet.has(job._id) : false;

  async function fetchJob() {
    try {
      setLoading(true);
      setError("");

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/jobs/${jobId}`, { headers });

      if (!res.ok) throw new Error("Impossible de charger cette offre pour le moment.");

      const data = await res.json();
      const fetchedJob = data?.job || data?.data || data;
      setJob(fetchedJob);
      syncAppliedFromJobs([fetchedJob]);
    } catch (err) {
      setError(err.message || "Erreur lors du chargement de l'offre.");
      setJob(null);
    } finally {
      setLoading(false);
    }
  }

  const description = job?.description || "Aucune description fournie pour le moment.";
  const location = job?.location || "Lieu non précisé";
  const contractType = job?.contractType || "Contrat non précisé";
  const salary = job?.salaryRange || job?.salary || null;
  const publishedDate = job?.createdAt ? formatDate(job.createdAt) : "Date inconnue";

  return (
    <div className="job-detail-page">
      <div className="job-detail-header">
        <button className="ghost-btn" onClick={() => navigate(-1)}>
          ← Retour
        </button>
        <button className="ghost-btn" onClick={() => navigate("/emplois")}>Toutes les offres</button>
      </div>

      {feedback && <div className="job-detail-feedback">{feedback}</div>}

      {loading && <div className="job-detail-card">Chargement des détails de l'offre...</div>}

      {error && !loading && <div className="job-detail-card error">{error}</div>}

      {!loading && !error && job && (
        <div className="job-detail-card">
          <div className="job-detail-meta">
            <div className="company-avatar" aria-hidden>
              {getInitials(recruiterName)}
            </div>
            <div>
              <p className="company-name">{recruiterName}</p>
              <p className="job-meta-line">
                {contractType} • {location}
              </p>
              <p className="job-meta-line light">Publiée le {publishedDate}</p>
            </div>
          </div>

          <h1 className="job-detail-title">{job.title}</h1>

          <div className="job-detail-tags">
            <span className="tag">{contractType}</span>
            <span className="tag">{location}</span>
            {salary && <span className="tag">💰 {salary}</span>}
          </div>

          <div className="job-detail-body">
            <h2 className="section-title">Description</h2>
            <p className="job-detail-text">{description}</p>

            {job.requirements && (
              <div className="section-block">
                <h3 className="section-subtitle">Exigences</h3>
                <p className="job-detail-text">{job.requirements}</p>
              </div>
            )}

            {job.responsibilities && (
              <div className="section-block">
                <h3 className="section-subtitle">Missions</h3>
                <p className="job-detail-text">{job.responsibilities}</p>
              </div>
            )}
          </div>

          <div className="job-detail-action">
            {!isRecruiter ? (
              <button
                className={`detail-cta ${hasApplied ? "applied" : "primary"}`}
                onClick={() => applyToJob(job._id, job.title)}
                disabled={hasApplied || applyingJobId === job._id}
              >
                {hasApplied ? "Déjà postulé" : applyingJobId === job._id ? "Envoi..." : "Postuler"}
              </button>
            ) : (
              <button className="detail-cta" disabled>
                Vous êtes recruteur
              </button>
            )}

            <p className="job-detail-hint">
              {isRecruiter
                ? "Les recruteurs ne peuvent pas postuler aux offres"
                : "Nous utilisons vos informations de profil pour envoyer votre candidature."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
