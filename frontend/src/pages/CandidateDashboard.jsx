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

  /* ===========================================
     RENDER CANDIDATURE (MODIFIÉ)
  ============================================*/
  const renderApplicationCard = (app) => {
    const job = app.job || {};
    const recruiter = job.recruiter || {};

    const company = recruiter.companyName || recruiter.name || "Entreprise";

    const raw = (app.status || "Pending").toLowerCase();
    const labels = {
      pending: "Envoyée",
      reviewing: "En revue",
      interview: "Entretien",
      accepted: "Offre reçue",
      rejected: "Refusée",
    };

    const key =
      raw === "reviewing"
        ? "inReview"
        : raw === "interview"
        ? "interview"
        : raw === "accepted"
        ? "offer"
        : raw === "rejected"
        ? "rejected"
        : "applied";

    return (
      <div key={app._id} className="cand-card">
        <div className="cand-card-header" onClick={() => goToJob(job._id)}>
          <h4>{job.title || "Poste inconnu"}</h4>
          <span className="cand-pill">{company}</span>
        </div>

        <div className="cand-meta" onClick={() => goToJob(job._id)}>
          <span>{job.location || "Localisation inconnue"}</span>
          {app.createdAt && (
            <span>
              Candidature le :{" "}
              {new Date(app.createdAt).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className={`cand-status-badge status-${key}`}>
          {labels[raw] || raw}
        </div>

        {/* ======================================= */}
        {/* BOUTONS : Contacter / Appel vidéo */}
        {/* ======================================= */}
        <div className="cand-actions">
          <button
            className="cand-btn contact-btn"
            onClick={() => contactRecruiter(recruiter)}
          >
            💬 Contacter
          </button>

          <button
            className="cand-btn call-btn"
            onClick={() => callRecruiter(recruiter)}
          >
            📹 Appel vidéo
          </button>
        </div>
      </div>
    );
  };

  /* ===========================================
     MINI CARTE — FAVORIS / RECO
  ============================================*/
  const renderJobMiniCard = (job) => {
    if (!job) return null;
    const recruiterName =
      job.recruiter?.companyName || job.recruiter?.name || "Entreprise";

    const isFav = savedJobs.some((s) => s.job?._id === job._id);

    return (
      <div key={job._id} className="cand-mini-job">
        <div className="mini-job-header">
          <button
            className="fav-btn"
            onClick={(e) => {
              e.stopPropagation();
              isFav ? unsaveJob(job._id) : saveJob(job._id);
            }}
          >
            {isFav ? "❤️" : "🤍"}
          </button>
        </div>

        <div onClick={() => goToJob(job._id)}>
          <div className="title-row">
            <h4>{job.title}</h4>
          </div>
          <div className="meta-row">
            <span>{recruiterName}</span>
            <span>{job.location || "Localisation"}</span>
          </div>
        </div>
      </div>
    );
  };

  /* ===========================================
     RENDER GLOBAL
  ============================================*/
  return (
    <div className="candidate-dashboard">
      {/* HEADER */}
      <header className="cd-header">
        <div className="cd-header-left">
          <button
            className="cd-burger"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>

          <div className="cd-brand">
            <div className="cd-logo">EF</div>
            <div className="cd-brand-text">
              <div className="cd-brand-title">EmploisFacile · Candidat</div>
              <div className="cd-brand-sub">
                Bonjour, {user?.name || "Candidat"}
              </div>
            </div>
          </div>
        </div>

        <div className="cd-header-right">
          <button
            className="cd-btn-primary"
            onClick={() => nav("/emplois")}
          >
            Trouver un emploi
          </button>
        </div>
      </header>

      {/* SHELL */}
      <div className="cd-shell">
        {/* SIDEBAR */}
        <aside
          className={`cd-sidebar ${sidebarOpen ? "cd-sidebar--open" : ""}`}
        >
          <div className="cd-sidebar-section">
            <div className="cd-sidebar-title">Navigation</div>

            <div
              className="cd-menu-item cd-menu-item--active"
              onClick={() => scrollToSection("cd-top")}
            >
              🧭 Tableau de bord
            </div>

            <div
              className="cd-menu-item"
              onClick={() => scrollToSection("cd-pipeline-section")}
            >
              📄 Mes candidatures
            </div>

            <div
              className="cd-menu-item"
              onClick={() => scrollToSection("cd-fav-section")}
            >
              ⭐ Favoris
            </div>

            <div
              className="cd-menu-item"
              onClick={() => nav("/profil")}
            >
              👤 Mon profil
            </div>

            <div
              className="cd-menu-item"
              onClick={() => nav("/settings")}
            >
              ⚙ Paramètres
            </div>
          </div>

          <div className="cd-sidebar-section cd-sidebar-section-bottom">
            <div className="cd-sidebar-title">Compte</div>
            <div className="cd-menu-item" onClick={logout}>
              🔓 Déconnexion
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="cd-main">
          <div className="cd-container" id="cd-top">
            {/* GAUCHE */}
            <div className="cd-left">
              {/* KPI */}
              <section className="cd-card cd-kpi-card">
                <div className="cd-kpi-grid">
                  <div className="cd-kpi">
                    <div className="num">{totalApplications}</div>
                    <div className="label">Candidatures envoyées</div>
                  </div>

                  <div className="cd-kpi">
                    <div className="num">{upcomingInterviews}</div>
                    <div className="label">Entretiens prévus</div>
                  </div>

                  <div className="cd-kpi">
                    <div className="num">{offersCount}</div>
                    <div className="label">Offres reçues</div>
                  </div>
                </div>
              </section>

              {/* PIPELINE */}
              <section
                className="cd-card cd-pipeline"
                id="cd-pipeline-section"
              >
                <div className="cd-card-header">
                  <h3>Suivi de vos candidatures</h3>
                  <span className="cd-chip">Mode pipeline</span>
                </div>

                {loadingApps && (
                  <div className="loader">
                    Chargement de vos candidatures…
                  </div>
                )}

                {!loadingApps &&
                  applications.length === 0 &&
                  !error && (
                    <div className="empty-state">
                      Vous n’avez pas encore postulé.
                      <button
                        className="cd-btn-link"
                        onClick={() => nav("/emplois")}
                      >
                        Commencer →
                      </button>
                    </div>
                  )}

                {error && <div className="error-message">{error}</div>}

                <div className="cd-pipeline-grid">
                  <div className="cd-pipe-column">
                    <div className="cd-pipe-title">Envoyée</div>
                    <div className="cd-pipe-list">
                      {groupedApps.applied.map(renderApplicationCard)}
                    </div>
                  </div>

                  <div className="cd-pipe-column">
                    <div className="cd-pipe-title">En revue</div>
                    <div className="cd-pipe-list">
                      {groupedApps.inReview.map(renderApplicationCard)}
                    </div>
                  </div>

                  <div className="cd-pipe-column">
                    <div className="cd-pipe-title">Entretien</div>
                    <div className="cd-pipe-list">
                      {groupedApps.interview.map(renderApplicationCard)}
                    </div>
                  </div>

                  <div className="cd-pipe-column">
                    <div className="cd-pipe-title">Offre</div>
                    <div className="cd-pipe-list">
                      {groupedApps.offer.map(renderApplicationCard)}
                    </div>
                  </div>

                  <div className="cd-pipe-column">
                    <div className="cd-pipe-title">Refusée</div>
                    <div className="cd-pipe-list">
                      {groupedApps.rejected.map(renderApplicationCard)}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* DROITE */}
            <div className="cd-right">
              {/* FAVORIS */}
              <section
                className="cd-card cd-side-block"
                id="cd-fav-section"
              >
                <div className="cd-card-header">
                  <h3>Vos emplois favoris</h3>
                </div>

                {loadingSaved && <div className="loader">Chargement…</div>}

                {!loadingSaved && savedJobs.length === 0 && (
                  <div className="empty-state small">
                    Aucun favori pour le moment.
                  </div>
                )}

                <div className="cd-mini-jobs">
                  {savedJobs.map((fav) => renderJobMiniCard(fav.job))}
                </div>
              </section>

              {/* RECOMMANDATIONS */}
              <section className="cd-card cd-side-block">
                <div className="cd-card-header">
                  <h3>Recommandé pour vous</h3>
                  <span className="cd-chip cd-chip-soft">
                    Basé sur les offres récentes
                  </span>
                </div>

                {loadingReco && (
                  <div className="loader">
                    Chargement des recommandations…
                  </div>
                )}

                {!loadingReco && recommendedJobs.length === 0 && (
                  <div className="empty-state small">
                    Aucune recommandation pour le moment.
                  </div>
                )}

                <div className="cd-mini-jobs">
                  {recommendedJobs.map(renderJobMiniCard)}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}