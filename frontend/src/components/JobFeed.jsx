import React, { useEffect, useState } from "react";
import "../styles/JobFeed.css"; 

export default function JobFeed() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [applyingJobId, setApplyingJobId] = useState(null);

  const token = localStorage.getItem("token");
  const API_URL = import.meta.env.VITE_API_URL; // https://emploisfacile.org/api

  /* ======================================================
     CHARGER LES OFFRES
  ====================================================== */
  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/jobs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Échec du chargement des offres.");

      const data = await res.json();

      let jobList = [];

      if (Array.isArray(data)) jobList = data;
      else if (Array.isArray(data.jobs)) jobList = data.jobs;
      else if (Array.isArray(data.data)) jobList = data.data;

      setJobs(jobList);

    } catch (err) {
      console.error("JOB FEED ERROR:", err);
      setError(err.message || "Erreur lors de la récupération des offres.");
      setJobs([]);
    }

    setLoading(false);
  };

  /* ======================================================
     POSTULER À UNE OFFRE
  ====================================================== */
  const handleApply = async (jobId, jobTitle) => {
    if (!window.confirm(`Voulez-vous postuler pour "${jobTitle}" ?`)) return;

    setApplyingJobId(jobId);
    setMessage('');

    try {
      const res = await fetch(`${API_URL}/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jobId }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Échec de la candidature.");

      setJobs(prev =>
        prev.map(job =>
          job._id === jobId ? { ...job, hasApplied: true } : job
        )
      );

      setMessage(`✅ Candidature envoyée avec succès pour "${jobTitle}" !`);

    } catch (err) {
      console.error("APPLY ERROR:", err);
      setMessage(`❌ Erreur: ${err.message}`);
    } finally {
      setApplyingJobId(null);
    }
  };

  /* ======================================================
     TEMPLATE CARTE OFFRE
  ====================================================== */
  const renderJobCard = (job) => {
    const recruiterName =
      job.recruiter?.companyName ||
      job.recruiter?.name ||
      "Entreprise inconnue";

    const hasApplied = job.hasApplied === true;

    return (
      <article key={job._id} className="job-card">
        <div className="job-header">
          <div className="job-info">
            <h3 className="job-title">{job.title}</h3>
            <span className="job-author">{recruiterName}</span>
            <span className="job-meta">
              📍 {job.location} | 💼 {job.contractType}
            </span>
          </div>
        </div>

        <div className="job-body">
          <p className="job-description">
            {job.description.substring(0, 200)}
            {job.description.length > 200 ? "..." : ""}
          </p>

          {job.salaryRange && (
            <span className="job-salary">💰 {job.salaryRange}</span>
          )}

          <span className="job-date">
            Publiée le : {new Date(job.createdAt).toLocaleDateString()}
          </span>
        </div>

        <div className="job-actions">
          {hasApplied ? (
            <button className="job-applied-btn" disabled>
              Déjà postulé
            </button>
          ) : (
            <button
              className="job-apply-btn"
              onClick={() => handleApply(job._id, job.title)}
              disabled={applyingJobId === job._id}
            >
              {applyingJobId === job._id ? "Envoi..." : "Postuler"}
            </button>
          )}
        </div>
      </article>
    );
  };

  /* ======================================================
     RENDU GLOBAL
  ====================================================== */
  return (
    <div className="job-feed">
      <h2 className="job-feed-title">Trouvez votre prochain emploi</h2>

      {message && (
        <div
          style={{
            padding: "10px",
            margin: "15px 0",
            borderRadius: "8px",
            textAlign: "center",
            backgroundColor: message.startsWith("✅") ? "#e8f5e9" : "#ffebee",
            color: message.startsWith("✅") ? "#2e7d32" : "#c62828",
          }}
        >
          {message}
        </div>
      )}

      {loading && <div className="loader">Chargement des offres...</div>}

      {error && <div className="error-message">{error}</div>}

      {!loading && jobs.length === 0 && !error && (
        <div className="empty-state">
          Aucune offre d'emploi disponible pour le moment.
        </div>
      )}

      <div className="job-list">
        {jobs.map(renderJobCard)}
      </div>
    </div>
  );
}
