import React, { useEffect, useState } from "react";
import "../styles/JobFeed.css";

export default function JobFeed() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");
  const [applyingJobId, setApplyingJobId] = useState(null);

  const token = localStorage.getItem("token");
  const API_URL = import.meta.env.VITE_API_URL; // https://emploisfacile.org/api

  /* ======================================================
     UTILITAIRES D'AFFICHAGE
  ====================================================== */
  const shortText = (text, max = 240) => {
    if (!text) return "Aucune description fournie.";
    const clean = text.replace(/\s+/g, " ").trim();
    return clean.length > max ? `${clean.slice(0, max)}...` : clean;
  };

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

  const getLocation = (job) => job.location || "Lieu non précisé";
  const getContract = (job) => job.contractType || "Contrat non précisé";
  const getSalary = (job) => job.salaryRange || null;

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
    setMessage("");

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

      setJobs((prev) =>
        prev.map((job) =>
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
      job.recruiter?.companyName || job.recruiter?.name || "Entreprise inconnue";

    const hasApplied = job.hasApplied === true;
    const salary = getSalary(job);
    const cover = job.coverImage || job.bannerUrl || job.image;

    return (
      <article key={job._id} className="job-post-card">
        <header className="job-post-header">
          <div className="job-avatar" aria-hidden>
            {getInitials(recruiterName)}
          </div>
          <div className="job-post-meta">
            <p className="job-company">{recruiterName}</p>
            <p className="job-meta-line">{getContract(job)} • {getLocation(job)}</p>
          </div>
          <button className="job-more-btn" aria-label="Actions">
            <span>•••</span>
          </button>
        </header>

        <div className="job-post-content">
          <p className="job-post-text">{shortText(job.description)}</p>
        </div>

        <div className="job-cta-card">
          <div
            className={`job-cta-visual ${cover ? "with-image" : "no-image"}`}
            style={cover ? { backgroundImage: `url(${cover})` } : {}}
            aria-hidden
          />

          <div className="job-cta-body">
            <div className="job-cta-infos">
              <p className="job-location">{getLocation(job)}</p>
              <h3 className="job-role">{job.title}</h3>
              <p className="job-extra">{salary ? `💰 ${salary}` : "Postulez maintenant pour en savoir plus"}</p>
              <p className="job-date">Publiée le {formatDate(job.createdAt)}</p>
            </div>

            {hasApplied ? (
              <button className="cta-button applied" disabled>
                Déjà postulé
              </button>
            ) : (
              <button
                className="cta-button"
                onClick={() => handleApply(job._id, job.title)}
                disabled={applyingJobId === job._id}
              >
                {applyingJobId === job._id ? "Envoi..." : "Postuler"}
              </button>
            )}
          </div>
        </div>

        <footer className="job-post-footer">
          <div className="job-social">
            <span className="like-badge">👍</span>
            <span className="social-count">{job.likes || 0}</span>
          </div>
          <div className="job-stats">
            <span>{job.commentsCount || 0} commentaires</span>
            <span>•</span>
            <span>{job.shares || 0} partages</span>
          </div>
        </footer>

        <div className="job-actions-row">
          <button className="action-btn">J'aime</button>
          <button className="action-btn">Commenter</button>
          <button className="action-btn">Partager</button>
        </div>
      </article>
    );
  };

  /* ======================================================
     RENDU GLOBAL
  ====================================================== */
  return (
    <div className="job-feed">
      <header className="job-feed-hero">
        <div>
          <p className="job-feed-kicker">Offres d'emploi</p>
          <h2>Un fil d'emplois inspiré des réseaux</h2>
          <p className="job-feed-subtitle">
            Explorez les dernières opportunités publiées par nos recruteurs et
            postulez en un clic.
          </p>
        </div>
        <div className="job-feed-search">
          <span role="img" aria-hidden>
            🔍
          </span>
          <input placeholder="Rechercher un poste, une ville..." />
        </div>
      </header>

      {message && (
        <div
          className={`job-alert ${message.startsWith("✅") ? "success" : "error"}`}
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
