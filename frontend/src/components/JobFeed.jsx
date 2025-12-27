import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GlobalFeedbackModal from "./GlobalFeedbackModal";
import useJobApplications from "../hooks/useJobApplications";
import "../styles/JobFeed.css";

export default function JobFeed() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("jobfeed-dark-mode") === "true";
  });

  const token = localStorage.getItem("token");
  const API_URL = import.meta.env.VITE_API_URL; // https://emploisfacile.org/api
  const navigate = useNavigate();

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch (err) {
      console.warn("USER PARSE ERROR", err);
      return {};
    }
  })();

  const userId = currentUser?._id || currentUser?.id;
  const normalizedRole = (currentUser.role || "").toLowerCase();
  const isRecruiter = normalizedRole === "recruiter" || normalizedRole === "recruteur";

  const openFeedback = (message) => {
    setFeedbackMessage(message);
    setFeedbackOpen(true);
  };

  const { appliedSet, applyingJobId, applyToJob, syncAppliedFromJobs } = useJobApplications(
    currentUser,
    {
      onFeedback: openFeedback,
    },
  );

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

  useEffect(() => {
    localStorage.setItem("jobfeed-dark-mode", darkMode);
  }, [darkMode]);

  useEffect(() => {
    syncAppliedFromJobs(jobs);
  }, [jobs, syncAppliedFromJobs]);

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
     TEMPLATE CARTE OFFRE
  ====================================================== */
  const renderJobCard = (job) => {
    const recruiterName =
      job.recruiter?.companyName || job.recruiter?.name || "Entreprise inconnue";

    const hasApplied = appliedSet.has(job._id);
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
            <div className="job-cta-actions">
              <button
                className="cta-button neutral"
                onClick={() => navigate(`/emplois/${job._id}`)}
              >
                Voir les détails
              </button>

              {!isRecruiter && (
                <>
                  {hasApplied ? (
                    <button className="cta-button applied" disabled>
                      Déjà postulé
                    </button>
                  ) : (
                    <button
                      className="cta-button primary"
                      onClick={() => applyToJob(job._id, job.title)}
                      disabled={applyingJobId === job._id}
                    >
                      {applyingJobId === job._id ? "Envoi..." : "Postuler"}
                    </button>
                  )}
                </>
              )}
            </div>

            {isRecruiter && (
              <p className="job-cta-helper">Les recruteurs peuvent consulter les offres.</p>
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
  const filteredJobs = jobs.filter((job) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return [job.title, job.description, job.location, job.contractType]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(q));
  });

  const featuredJobs = filteredJobs.slice(0, 3);

  const handleDashboardNavigation = () => {
    const role = (currentUser.role || "").toLowerCase();
    if (role === "recruiter" || role === "recruteur") {
      navigate("/recruiter/dashboard");
      return;
    }

    if (role === "candidate" || role === "candidat") {
      navigate("/candidate/dashboard");
      return;
    }

    navigate("/fb/dashboard");
  };

  return (
    <div className={`job-feed-screen ${darkMode ? "dark-mode" : ""}`}>
      <div className="jobfeed-grid">
        <aside className="jobfeed-sidebar">
          <div className="sidebar-card profile-card">
            <div className="profile-avatar" aria-hidden>
              {getInitials(currentUser.name || "Vous")}
            </div>
            <div>
              <p className="profile-name">{currentUser.name || "Mon profil"}</p>
              <p className="profile-sub">Accédez rapidement à vos actions</p>
            </div>
          </div>

          <div className="sidebar-card links-card">
            <button className="link-row" onClick={handleDashboardNavigation}>
              📊 Tableau de bord
            </button>
            <button className="link-row">📄 Mes CV & candidatures</button>
            <button className="link-row">📌 Favoris</button>
            <button className="link-row">🛠️ Paramètres</button>
            <button className="link-row">💬 Messages</button>
          </div>

          <div className="sidebar-card tip-card">
            <p className="tip-title">Conseil</p>
            <p className="tip-text">
              Complétez votre profil pour remonter dans les recommandations des
              recruteurs.
            </p>
          </div>
        </aside>

        <main className="jobfeed-center">
          <header className="job-feed-hero">
            <div>
              <p className="job-feed-kicker">Offres d'emploi</p>
              <h2>Un fil d'emplois inspiré des réseaux</h2>
              <p className="job-feed-subtitle">
                Explorez les dernières opportunités publiées par nos
                recruteurs et postulez en un clic.
              </p>
            </div>
            <div className="job-feed-actions">
              <div className="job-feed-search">
                <span role="img" aria-hidden>
                  🔍
                </span>
                <input
                  placeholder="Rechercher un poste, une ville..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="theme-toggle"
                onClick={() => setDarkMode((prev) => !prev)}
                aria-pressed={darkMode}
              >
                <span className="theme-label">{darkMode ? "Mode sombre" : "Mode clair"}</span>
                <span className={`toggle-switch ${darkMode ? "on" : ""}`}>
                  <span className="toggle-handle" />
                </span>
              </button>
            </div>
          </header>

          {loading && <div className="loader">Chargement des offres...</div>}

          {error && <div className="error-message">{error}</div>}

          {!loading && filteredJobs.length === 0 && !error && (
            <div className="empty-state">
              Aucune offre ne correspond à votre recherche pour le moment.
            </div>
          )}

          <div className="job-list">{filteredJobs.map(renderJobCard)}</div>
        </main>

        <aside className="jobfeed-sidebar right">
          <div className="sidebar-card info-card">
            <p className="info-title">JobFeed en direct</p>
            <p className="info-text">
              Retrouvez les dernières offres et revenez plus tard pour de
              nouvelles opportunités.
            </p>
          </div>

          <div className="sidebar-card featured-card">
            <div className="featured-header">
              <span role="img" aria-hidden>
                🧭
              </span>
              <div>
                <p className="featured-kicker">À découvrir</p>
                <p className="featured-title">Tendances du jour</p>
              </div>
            </div>

            {featuredJobs.map((job) => (
              <div key={job._id} className="featured-item">
                <p className="featured-role">{job.title}</p>
                <p className="featured-meta">
                  {getLocation(job)} • {getContract(job)}
                </p>
                {isRecruiter ? (
                  <button
                    className="featured-cta secondary"
                    onClick={() => navigate(`/emplois/${job._id}`)}
                  >
                    Voir les détails
                  </button>
                ) : (
                  <button
                    className="featured-cta"
                    onClick={() => applyToJob(job._id, job.title)}
                    disabled={applyingJobId === job._id || appliedSet.has(job._id)}
                  >
                    {appliedSet.has(job._id)
                      ? "Déjà postulé"
                      : applyingJobId === job._id
                      ? "Envoi..."
                      : "Postuler"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>

      <GlobalFeedbackModal
        open={feedbackOpen}
        message={feedbackMessage}
        onClose={() => setFeedbackOpen(false)}
      />
    </div>
  );
}