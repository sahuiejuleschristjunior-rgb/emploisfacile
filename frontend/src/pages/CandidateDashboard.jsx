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

  /* ===========================================
     0) Logout
  ============================================*/
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    nav("/login");
  };

  /* ===========================================
     1) Charger l'utilisateur
  ============================================*/
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

  /* ===========================================
     2) Charger candidatures + favoris + reco
  ============================================*/
  useEffect(() => {
    if (!token) return;
    fetchApplications();
    fetchSavedJobs();
    fetchRecommended();
  }, [token]);

  /* ===========================================
     MES CANDIDATURES
  ============================================*/
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

  /* ===========================================
     FAVORIS
  ============================================*/
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

  /* ===========================================
     RECOMMANDATIONS
  ============================================*/
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

  /* ===========================================
     GROUPEMENT PAR STATUT
  ============================================*/
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

  const goToJob = (jobId) => {
    if (jobId) nav(`/emplois/${jobId}`);
  };

  /* ===========================================
     CONTACTER & APPEL VIDÉO
  ============================================*/
  const contactRecruiter = (recruiter) => {
    nav("/messages", {
      state: {
        userId: recruiter._id,
        name: recruiter.name || recruiter.companyName,
        avatar: recruiter.avatar,
      },
    });
  };

  const callRecruiter = (recruiter) => {
    nav("/video-call", {
      state: {
        userId: recruiter._id,
        name: recruiter.name || recruiter.companyName,
        avatar: recruiter.avatar,
        role: "candidate",
      },
    });
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const statusConfig = {
    pending: { label: "Envoyée", color: "blue" },
    reviewing: { label: "En revue", color: "amber" },
    interview: { label: "Entretien", color: "indigo" },
    accepted: { label: "Offre reçue", color: "emerald" },
    rejected: { label: "Refusée", color: "rose" },
  };

  const profileCompletion = Math.min(
    Math.max(Number(user?.profileCompletion || user?.completion || 0), 0),
    100,
  );

  const profileViews = user?.profileViews || 0;
  const messagesCount = user?.unreadMessages || 0;

  const recentApplications = useMemo(() => {
    return [...applications]
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [applications]);

  const upcomingAgenda = useMemo(() => {
    return groupedApps.interview.slice(0, 3).map((app) => ({
      title: app.job?.title || "Entretien prévu",
      company: app.job?.recruiter?.companyName || app.job?.recruiter?.name,
      when: app.interviewDate || app.updatedAt || app.createdAt,
      recruiter: app.job?.recruiter,
    }));
  }, [groupedApps.interview]);

  const renderStatusPill = (status) => {
    const key = (status || "pending").toLowerCase();
    const cfg = statusConfig[key] || statusConfig.pending;

    return <span className={`status-pill status-${cfg.color}`}>{cfg.label}</span>;
  };

  const renderRecentRow = (app) => {
    const job = app.job || {};
    const recruiter = job.recruiter || {};
    const company = recruiter.companyName || recruiter.name || "Entreprise";
    const status = (app.status || "pending").toLowerCase();

    return (
      <tr key={app._id} className="recent-row" onClick={() => goToJob(job._id)}>
        <td className="recent-company">
          <div className="recent-company-name">{company}</div>
          <div className="recent-job-title">{job.title || "Poste"}</div>
        </td>
        <td>{renderStatusPill(status)}</td>
        <td className="recent-date">
          {app.updatedAt || app.createdAt
            ? new Date(app.updatedAt || app.createdAt).toLocaleDateString()
            : "-"}
        </td>
        <td className="recent-actions">
          <button
            className="ghost-btn"
            onClick={(e) => {
              e.stopPropagation();
              contactRecruiter(recruiter);
            }}
          >
            Contacter
          </button>
          <button
            className="ghost-btn"
            onClick={(e) => {
              e.stopPropagation();
              callRecruiter(recruiter);
            }}
          >
            Appel vidéo
          </button>
        </td>
      </tr>
    );
  };

  const renderJobMiniCard = (job) => {
    if (!job) return null;
    const recruiterName =
      job.recruiter?.companyName || job.recruiter?.name || "Entreprise";

    const isFav = savedJobs.some((s) => s.job?._id === job._id);

    return (
      <div key={job._id} className="mini-card" onClick={() => goToJob(job._id)}>
        <div className="mini-card-top">
          <div>
            <p className="mini-title">{job.title}</p>
            <p className="mini-sub">{recruiterName}</p>
          </div>
          <button
            className={`fav-toggle ${isFav ? "fav-active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              isFav ? unsaveJob(job._id) : saveJob(job._id);
            }}
          >
            {isFav ? "♥" : "♡"}
          </button>
        </div>
        <p className="mini-meta">{job.location || "Localisation"}</p>
      </div>
    );
  };

  return (
    <div className="candidate-dashboard">
      <aside className={`cd-side ${sidebarOpen ? "cd-side-open" : ""}`}>
        <div className="side-brand">JobConnect</div>
        <nav className="side-nav">
          <button className="side-link active">Dashboard</button>
          <button className="side-link" onClick={() => scrollToSection("recent")}>Mes Candidatures</button>
          <button className="side-link" onClick={() => nav("/messages")}>Messages</button>
          <button className="side-link" onClick={() => scrollToSection("favoris")}>Favoris</button>
          <button className="side-link" onClick={() => nav("/profil")}>Mon Profil</button>
        </nav>
        <div className="side-footer">© 2025 JobConnect Inc.</div>
      </aside>

      <main className="cd-main">
        <header className="topbar">
          <div>
            <h2>Bienvenue, {user?.name || "Candidat"} 👋</h2>
            <p className="topbar-sub">Gérez vos candidatures et suivez vos prochaines étapes.</p>
          </div>
          <div className="topbar-actions">
            <button className="notif-btn mobile-only" onClick={() => setSidebarOpen(!sidebarOpen)}>
              ☰
            </button>
            <button className="notif-btn" onClick={() => nav("/notifications")}>🔔</button>
            <div className="avatar">
              {user?.name?.charAt(0)?.toUpperCase() || "C"}
            </div>
          </div>
        </header>

        <div className="content">
          <section className="stats-grid">
            <div className="stat-card">
              <p className="stat-label">Candidatures envoyées</p>
              <p className="stat-value text-indigo">{totalApplications}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Entretiens prévus</p>
              <p className="stat-value text-orange">{upcomingInterviews}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Vues du profil</p>
              <p className="stat-value text-emerald">{profileViews}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Messages reçus</p>
              <p className="stat-value text-purple">{messagesCount}</p>
            </div>
          </section>

          <div className="main-grid">
            <section className="card" id="recent">
              <div className="card-header">
                <h3>Candidatures récentes</h3>
                <button className="ghost-link" onClick={() => nav("/candidatures")}>Voir tout</button>
              </div>

              {loadingApps && <div className="loader">Chargement de vos candidatures…</div>}
              {error && <div className="error-message">{error}</div>}
              {!loadingApps && recentApplications.length === 0 && !error && (
                <div className="empty-state">Aucune candidature pour le moment.</div>
              )}

              {recentApplications.length > 0 && (
                <div className="table-wrapper">
                  <table className="recent-table">
                    <thead>
                      <tr>
                        <th>Entreprise</th>
                        <th>Statut</th>
                        <th>Dernière mise à jour</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>{recentApplications.map(renderRecentRow)}</tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="card agenda-card">
              <h3>Agenda à venir</h3>
              <div className="agenda-list">
                {upcomingAgenda.length === 0 && (
                  <p className="empty-state small">Aucun entretien programmé pour le moment.</p>
                )}

                {upcomingAgenda.map((event, idx) => (
                  <div key={`${event.title}-${idx}`} className="agenda-item">
                    <div>
                      <p className="agenda-title">{event.title}</p>
                      {event.company && <p className="agenda-sub">{event.company}</p>}
                      {event.when && (
                        <p className="agenda-date">
                          {new Date(event.when).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="agenda-actions">
                      <button
                        className="ghost-btn"
                        onClick={() => contactRecruiter(event.recruiter || {})}
                      >
                        Contacter
                      </button>
                      <button
                        className="ghost-btn"
                        onClick={() => callRecruiter(event.recruiter || {})}
                      >
                        Appel vidéo
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="progress-block">
                <div className="progress-header">
                  <span>Profil complété à {profileCompletion}%</span>
                  <span className="progress-tip">Ajoutez votre portfolio pour atteindre 100% !</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${profileCompletion}%` }}
                  ></div>
                </div>
              </div>

              <div className="mini-section" id="favoris">
                <div className="mini-section-header">
                  <h4>Vos favoris</h4>
                  <span className="mini-count">{savedJobs.length}</span>
                </div>
                {loadingSaved && <div className="loader">Chargement…</div>}
                {!loadingSaved && savedJobs.length === 0 && (
                  <div className="empty-state small">Aucun favori pour le moment.</div>
                )}
                <div className="mini-grid">
                  {savedJobs.slice(0, 4).map((fav) => renderJobMiniCard(fav.job))}
                </div>
              </div>

              <div className="mini-section">
                <div className="mini-section-header">
                  <h4>Recommandé pour vous</h4>
                  <span className="mini-count">{recommendedJobs.length}</span>
                </div>
                {loadingReco && <div className="loader">Chargement des recommandations…</div>}
                {!loadingReco && recommendedJobs.length === 0 && (
                  <div className="empty-state small">Aucune recommandation pour le moment.</div>
                )}
                <div className="mini-grid">
                  {recommendedJobs.slice(0, 4).map(renderJobMiniCard)}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}