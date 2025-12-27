import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PostJobForm from "../components/PostJobForm";
import "../styles/Dashboard.css";

export default function RecruiterDashboard() {
  const nav = useNavigate();

  const [user, setUser] = useState(null);
  const [myJobs, setMyJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");

  /* ============================================================
     Logout
  ============================================================ */
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    nav("/login");
  };

  /* ============================================================
     Charger l'utilisateur
  ============================================================ */
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  /* ============================================================
     Charger mes offres
  ============================================================ */
  useEffect(() => {
    if (token && user) fetchMyJobs();
  }, [token, user]);

  const fetchMyJobs = async () => {
    setLoadingJobs(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/jobs/my-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Impossible de charger vos offres.");

      // Sécurisation : data peut être {jobs: [...]}, {data: [...]}, ou [...]
      const jobs = Array.isArray(data)
        ? data
        : data.jobs
        ? data.jobs
        : data.data || [];

      setMyJobs(jobs);
    } catch (err) {
      setError(err.message);
      setMyJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  };

  /* ============================================================
     Lorsqu'une offre est publiée
  ============================================================ */
  const handleJobPosted = (newJob) => {
    setMyJobs((prev) => [newJob, ...prev]);
  };

  /* ============================================================
     Stats
  ============================================================ */
  const { activeJobs, totalApplications } = useMemo(() => {
    const active = myJobs.length;
    const totalApps = myJobs.reduce(
      (sum, job) => sum + (job.applications?.length || 0),
      0
    );
    return { activeJobs: active, totalApplications: totalApps };
  }, [myJobs]);

  /* ============================================================
     Scroll vers formulaire
  ============================================================ */
  const handleScrollToForm = () => {
    const form = document.getElementById("job-form-panel");
    if (form) form.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ============================================================
     Scroll utilitaire pour sidebar
  ============================================================ */
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ============================================================
     Render job card
  ============================================================ */
  const renderJobCard = (job) => (
    <div key={job._id} className="job-item">
      <div className="job-item-header">
        <h4>{job.title}</h4>
        <span className="job-pill">{job.contractType}</span>
      </div>

      <div className="job-meta">
        {job.location} • Publiée le {new Date(job.createdAt).toLocaleDateString()}
      </div>

      <div className="job-stats">
        <span>{job.applications?.length || 0} candidatures</span>
        <button
          className="view-link"
          onClick={() => nav(`/recruiter/job/${job._id}`)}
        >
          Voir les candidats →
        </button>
      </div>
    </div>
  );

  /* ============================================================
     Render global
  ============================================================ */
  return (
    <div className="recruiter-dashboard">
      {/* ===================================================== */}
      {/* HEADER FIXE */}
      {/* ===================================================== */}
      <header className="rd-header">
        <div className="rd-header-left">
          <button
            className="rd-burger"
            onClick={() => setSidebarOpen((prev) => !prev)}
          >
            ☰
          </button>

          <div className="rd-brand">
            <div className="rd-logo">EF</div>
            <div className="rd-brand-text">
              <div className="rd-brand-title">EmploisFacile · Recruteur</div>
              <div className="rd-brand-sub">
                Bienvenue, {user?.companyName || user?.name || "Recruteur"}
              </div>
            </div>
          </div>
        </div>

        <div className="rd-header-right">
          <button className="rd-btn" onClick={handleScrollToForm}>
            Nouvelle offre
          </button>
        </div>
      </header>

      {/* ===================================================== */}
      {/* SHELL */}
      {/* ===================================================== */}
      <div className="rd-shell">
        {/* ===================================================== */}
        {/* SIDEBAR */}
        {/* ===================================================== */}
        <aside className={`rd-sidebar ${sidebarOpen ? "rd-sidebar--open" : ""}`}>
          <div className="rd-sidebar-section">
            <div className="rd-sidebar-title">Navigation</div>

            <div
              className="rd-menu-item rd-menu-item--active"
              onClick={() => scrollToSection("rd-top")}
            >
              📊 Tableau de bord
            </div>

            <div
              className="rd-menu-item"
              onClick={() => scrollToSection("rd-jobs-section")}
            >
              💼 Offres publiées
            </div>

            <div
              className="rd-menu-item"
              onClick={() => nav("/recruiter/candidatures")}
            >
              📥 Candidatures
            </div>

            <div className="rd-menu-item" onClick={() => nav("/messages")}>
              💬 Messages
            </div>

            <div className="rd-menu-item" onClick={() => nav("/profil")}>
              👥 Entreprise
            </div>

            <div className="rd-menu-item" onClick={() => nav("/settings")}>
              ⚙️ Paramètres
            </div>
          </div>

          <div className="rd-sidebar-section rd-sidebar-section-bottom">
            <div className="rd-sidebar-title">Compte</div>
            <div className="rd-menu-item" onClick={logout}>
              🔓 Se déconnecter
            </div>
          </div>
        </aside>

        {/* ===================================================== */}
        {/* MAIN */}
        {/* ===================================================== */}
        <main className="rd-main">
          <div className="rd-container" id="rd-top">
            {/* ------------------------------------------------ */}
            {/* KPI */}
            {/* ------------------------------------------------ */}
            <div className="rd-center">
              <section className="rd-card rd-card-kpi">
                <div className="rd-kpi-grid">
                  <div className="rd-kpi">
                    <div className="num">{activeJobs}</div>
                    <div className="label">Offres actives</div>
                  </div>
                  <div className="rd-kpi">
                    <div className="num">{totalApplications}</div>
                    <div className="label">Total candidatures</div>
                  </div>
                  <div className="rd-kpi">
                    <div className="num">0</div>
                    <div className="label">En attente</div>
                  </div>
                </div>
              </section>

              {/* ------------------------------------------------ */}
              {/* ANALYTICS */}
              {/* ------------------------------------------------ */}
              <section className="rd-card rd-analytics">
                <div className="rd-card-header">
                  <h3>Tendance des candidatures</h3>
                  <span className="rd-chip">7 derniers jours</span>
                </div>

                <div className="rd-analytics-grid">
                  <div className="rd-analytics-chart">
                    <div className="rd-bar-row">
                      <div className="rd-bar" style={{ width: "40%" }} />
                      <span>Lun</span>
                    </div>
                    <div className="rd-bar-row">
                      <div className="rd-bar" style={{ width: "70%" }} />
                      <span>Mar</span>
                    </div>
                    <div className="rd-bar-row">
                      <div className="rd-bar" style={{ width: "55%" }} />
                      <span>Mer</span>
                    </div>
                    <div className="rd-bar-row">
                      <div className="rd-bar" style={{ width: "80%" }} />
                      <span>Jeu</span>
                    </div>
                    <div className="rd-bar-row">
                      <div className="rd-bar" style={{ width: "30%" }} />
                      <span>Ven</span>
                    </div>
                  </div>

                  <div className="rd-analytics-side">
                    <div className="rd-analytics-stat">
                      <div className="label">Taux de réponse</div>
                      <div className="value">64%</div>
                      <div className="hint">+12% vs semaine dernière</div>
                    </div>
                    <div className="rd-analytics-stat">
                      <div className="label">Candidatures / offre</div>
                      <div className="value">
                        {activeJobs > 0
                          ? Math.round(totalApplications / activeJobs)
                          : 0}
                      </div>
                      <div className="hint">Objectif : 15</div>
                    </div>
                  </div>
                </div>
              </section>

              {/* ------------------------------------------------ */}
              {/* OFFRES PUBLIÉES */}
              {/* ------------------------------------------------ */}
              <section className="rd-card" id="rd-jobs-section">
                <div className="rd-card-header">
                  <h3>Vos offres publiées ({myJobs.length})</h3>
                </div>

                {error && <div className="error-message">{error}</div>}
                {loadingJobs && (
                  <div className="loader">Chargement de vos offres…</div>
                )}

                {!loadingJobs && myJobs.length === 0 && !error && (
                  <div className="empty-state">Vous n’avez pas encore publié d’offre.</div>
                )}

                <div className="job-list-dashboard">
                  {myJobs.map(renderJobCard)}
                </div>
              </section>
            </div>

            {/* ------------------------------------------------ */}
            {/* FORMULAIRE DE CRÉATION D'OFFRE */}
            {/* ------------------------------------------------ */}
            <div className="rd-right" id="job-form-panel">
              <section className="rd-card rd-form-card">
                <PostJobForm onJobPosted={handleJobPosted} />
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}