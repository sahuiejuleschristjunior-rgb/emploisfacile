import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/CandidateDashboard.css";

export default function CandidateDashboard() {
  const nav = useNavigate();

  const [user, setUser] = useState(null);
  const [applications, setApplications] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [loadingReco, setLoadingReco] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    nav("/login");
  };

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (error) {
        console.error("Erreur chargement user:", error);
      }
    }
  }, []);

  const commonHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  useEffect(() => {
    if (!token) return;
    fetchApplications();
    fetchSavedJobs();
    fetchRecommended();
  }, [token]);

  const fetchApplications = async () => {
    setLoadingApps(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/applications/my-applications`, {
        headers: commonHeaders,
      });

      if (!res.ok) throw new Error("Impossible de charger vos candidatures.");

      const data = await res.json();
      setApplications(Array.isArray(data) ? data : data.applications || []);
    } catch (err) {
      setError(err.message || "Erreur réseau.");
      setApplications([]);
    } finally {
      setLoadingApps(false);
    }
  };

  const fetchSavedJobs = async () => {
    setLoadingSaved(true);
    try {
      const res = await fetch(`${API_URL}/saved-jobs`, {
        headers: commonHeaders,
      });

      const data = await res.json();
      setSavedJobs(Array.isArray(data) ? data : data.savedJobs || []);
    } catch (err) {
      setSavedJobs([]);
    }
    setLoadingSaved(false);
  };

  const saveJob = async (jobId) => {
    await fetch(`${API_URL}/saved-jobs`, {
      method: "POST",
      headers: commonHeaders,
      body: JSON.stringify({ jobId }),
    });
    fetchSavedJobs();
  };

  const unsaveJob = async (jobId) => {
    await fetch(`${API_URL}/saved-jobs/${jobId}`, {
      method: "DELETE",
      headers: commonHeaders,
    });
    fetchSavedJobs();
  };

  const fetchRecommended = async () => {
    setLoadingReco(true);
    try {
      const res = await fetch(`${API_URL}/jobs`, {
        headers: commonHeaders,
      });

      const data = await res.json();
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data.jobs)
        ? data.jobs
        : data.data || [];

      setRecommendedJobs(arr.slice(0, 5));
    } catch (err) {
      setRecommendedJobs([]);
    }
    setLoadingReco(false);
  };

  const groupedApps = useMemo(() => {
    const groups = {
      applied: [],
      inReview: [],
      interview: [],
      offer: [],
      rejected: [],
    };

    for (const app of applications) {
      const status = (app.status || "Pending").toLowerCase();
      if (status === "pending") groups.applied.push(app);
      else if (status === "reviewing") groups.inReview.push(app);
      else if (status === "interview") groups.interview.push(app);
      else if (status === "accepted") groups.offer.push(app);
      else if (status === "rejected") groups.rejected.push(app);
      else groups.applied.push(app);
    }
    return groups;
  }, [applications]);

  const totalApplications = applications.length;
  const upcomingInterviews = groupedApps.interview.length;
  const offersCount = groupedApps.offer.length;
  const favoritesCount = savedJobs.length;

  const goToJob = (jobId) => {
    if (jobId) nav(`/emplois/${jobId}`);
  };

  const statusBadge = (status) => {
    const raw = (status || "pending").toLowerCase();
    if (raw === "interview") return "success";
    if (raw === "reviewing") return "warning";
    if (raw === "rejected") return "danger";
    if (raw === "accepted") return "success";
    return "info";
  };

  const statusLabel = (status) => {
    const raw = (status || "pending").toLowerCase();
    const labels = {
      pending: "Envoyée",
      reviewing: "En revue",
      interview: "Entretien",
      accepted: "Acceptée",
      rejected: "Refusée",
    };
    return labels[raw] || status || "Statut";
  };

  const profileCompletion = useMemo(() => {
    let score = 50;
    if (user?.resume) score += 20;
    if (user?.avatar) score += 10;
    if (savedJobs.length > 0) score += 10;
    if (applications.length > 0) score += 10;
    return Math.min(score, 100);
  }, [applications.length, savedJobs.length, user]);

  const agendaItems = groupedApps.interview.slice(0, 3);

  const renderMiniJob = (job, isFavoriteCard = false) => {
    if (!job) return null;
    const recruiterName =
      job.recruiter?.companyName || job.recruiter?.name || "Entreprise";
    const isFav = savedJobs.some((s) => s.job?._id === job._id);

    return (
      <div
        key={job._id}
        className="cd-mini-card"
        onClick={() => goToJob(job._id)}
      >
        <h5>{job.title}</h5>
        <div className="cd-mini-meta">
          <span>{recruiterName}</span>
          <span>{job.location || "Localisation"}</span>
        </div>
        {isFavoriteCard && (
          <button
            className="cd-link"
            onClick={(e) => {
              e.stopPropagation();
              isFav ? unsaveJob(job._id) : saveJob(job._id);
            }}
          >
            {isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
          </button>
        )}
      </div>
    );
  };

  const recentApplications = applications.slice(0, 5);

  return (
    <div className="candidate-dashboard">
      <div className="cd-layout">
        <aside className={`cd-aside ${sidebarOpen ? "open" : ""}`}>
          <div className="cd-brand">
            <div className="cd-brand-title">JobConnect</div>
          </div>
          <nav className="cd-nav">
            <button className="active" type="button">
              Dashboard
            </button>
            <button type="button" onClick={() => nav("/candidate/applications")}>
              Mes candidatures
            </button>
            <button type="button" onClick={() => nav("/messages")}>
              Messages
            </button>
            <button type="button" onClick={() => nav("/emplois")}>
              Favoris & offres
            </button>
            <button type="button" onClick={() => nav("/profil")}>
              Mon profil
            </button>
          </nav>
          <div className="cd-nav">
            <button type="button" onClick={logout}>
              Déconnexion
            </button>
          </div>
        </aside>

        <div className="cd-main">
          <header className="cd-header">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                className="cd-icon-btn cd-burger"
                aria-label="Ouvrir le menu"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                ☰
              </button>
              <h2>
                Bienvenue, {user?.name || user?.email || "Candidat"}
                <span aria-label="salut"> 👋</span>
              </h2>
            </div>
            <div className="cd-header-actions">
              <button className="cd-icon-btn" aria-label="Notifications">
                <i className="fa-solid fa-bell"></i>
              </button>
              <img
                src={
                  user?.avatar ||
                  "https://ui-avatars.com/api/?name=Candidat&background=6366f1&color=fff"
                }
                alt="Avatar"
                className="cd-avatar"
              />
            </div>
          </header>

          <div className="cd-content">
            <div className="cd-grid-stats">
              <div className="cd-stat-card">
                <p>Candidatures envoyées</p>
                <div className="value">{totalApplications}</div>
              </div>
              <div className="cd-stat-card">
                <p>Entretiens prévus</p>
                <div className="value">{upcomingInterviews}</div>
              </div>
              <div className="cd-stat-card">
                <p>Offres reçues</p>
                <div className="value">{offersCount}</div>
              </div>
              <div className="cd-stat-card">
                <p>Favoris</p>
                <div className="value">{favoritesCount}</div>
              </div>
            </div>

            <div className="cd-panels">
              <div className="cd-card">
                <div className="cd-card-header">
                  <h3>Candidatures récentes</h3>
                  <button className="cd-link" onClick={() => nav("/candidate/applications")}>
                    Voir tout
                  </button>
                </div>
                {loadingApps && <div className="cd-loader">Chargement…</div>}
                {error && <div className="cd-error">{error}</div>}
                {!loadingApps && recentApplications.length === 0 && !error && (
                  <div className="cd-empty">
                    Vous n'avez pas encore de candidature. Commencez dès maintenant !
                  </div>
                )}
                {recentApplications.length > 0 && (
                  <div className="cd-table-wrapper">
                    <table className="cd-table">
                      <thead>
                        <tr>
                          <th>Entreprise</th>
                          <th>Statut</th>
                          <th>Dernière mise à jour</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentApplications.map((app) => {
                          const job = app.job || {};
                          const recruiter = job.recruiter || {};
                          const company =
                            recruiter.companyName || recruiter.name || "Entreprise";
                          const updatedAt = app.updatedAt || app.createdAt;
                          return (
                            <tr key={app._id}>
                              <td>
                                <div className="cd-job-title">{company}</div>
                                <div className="cd-job-sub">{job.title || "Poste"}</div>
                              </td>
                              <td>
                                <span className={`cd-badge ${statusBadge(app.status)}`}>
                                  {statusLabel(app.status)}
                                </span>
                              </td>
                              <td className="cd-job-sub">
                                {updatedAt
                                  ? new Date(updatedAt).toLocaleDateString()
                                  : "--"}
                              </td>
                              <td className="cd-ellipsis">•••</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <div className="cd-card">
                  <div className="cd-card-header">
                    <h3>Agenda à venir</h3>
                  </div>
                  <div className="cd-agenda">
                    {agendaItems.length === 0 && (
                      <div className="cd-empty">Aucun entretien planifié pour le moment.</div>
                    )}
                    {agendaItems.map((app, idx) => (
                      <div
                        key={app._id}
                        className={`cd-agenda-item ${idx === 1 ? "secondary" : ""}`}
                      >
                        <div>
                          <div className="cd-agenda-title">
                            Entretien {app.job?.title ? `- ${app.job.title}` : ""}
                          </div>
                          <div className="cd-agenda-meta">
                            {app.updatedAt
                              ? new Date(app.updatedAt).toLocaleString()
                              : "Date à confirmer"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="cd-card cd-progress">
                  <h4>Profil complété à {profileCompletion}%</h4>
                  <div className="cd-progress-bar">
                    <div
                      className="cd-progress-inner"
                      style={{ width: `${profileCompletion}%` }}
                    ></div>
                  </div>
                  <p className="cd-progress-note">
                    Ajoutez votre portfolio et des expériences pour atteindre 100% !
                  </p>
                </div>

                <div className="cd-side-card">
                  <h4>Vos favoris</h4>
                  {loadingSaved && <div className="cd-loader">Chargement…</div>}
                  {!loadingSaved && savedJobs.length === 0 && (
                    <div className="cd-empty">Aucun favori pour le moment.</div>
                  )}
                  <div className="cd-mini-list">
                    {savedJobs.map((fav) => renderMiniJob(fav.job, true))}
                  </div>
                </div>

                <div className="cd-side-card">
                  <h4>Recommandé pour vous</h4>
                  {loadingReco && <div className="cd-loader">Chargement des offres…</div>}
                  {!loadingReco && recommendedJobs.length === 0 && (
                    <div className="cd-empty">Aucune recommandation pour le moment.</div>
                  )}
                  <div className="cd-mini-list">
                    {recommendedJobs.map((job) => renderMiniJob(job))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
