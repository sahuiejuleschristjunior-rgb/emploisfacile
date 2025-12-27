import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PostJobForm from "../../components/PostJobForm";
import "../../styles/Dashboard.css";

export default function RecruiterDashboard() {
  const nav = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");

  const [myJobs, setMyJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) fetchMyJobs();
  }, [token]);

  const fetchMyJobs = async () => {
    setLoadingJobs(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/jobs/my-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible de charger vos offres.");
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

  const { activeJobs, totalApplications } = useMemo(() => {
    const active = myJobs.length;
    const totalApps = myJobs.reduce(
      (sum, job) => sum + (job.applications?.length || 0),
      0
    );
    return { activeJobs: active, totalApplications: totalApps };
  }, [myJobs]);

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
          onClick={() => nav(`/recruteur/job/${job._id}`)}
        >
          Voir les candidats →
        </button>
      </div>
    </div>
  );

  return (
    <div className="rd-shell">
      <main className="rd-main">
        <div className="rd-container" id="rd-top">
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
                      {activeJobs > 0 ? Math.round(totalApplications / activeJobs) : 0}
                    </div>
                    <div className="hint">Objectif : 15</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rd-card" id="rd-jobs-section">
              <div className="rd-card-header">
                <h3>Vos offres publiées ({myJobs.length})</h3>
                <button className="view-link" onClick={() => nav("/recruteur/offres")}>
                  Gérer les offres
                </button>
              </div>

              {error && <div className="error-message">{error}</div>}
              {loadingJobs && <div className="loader">Chargement de vos offres…</div>}
              {!loadingJobs && myJobs.length === 0 && !error && (
                <div className="empty-state">Vous n’avez pas encore publié d’offre.</div>
              )}

              <div className="job-list-dashboard">{myJobs.slice(0, 4).map(renderJobCard)}</div>
            </section>
          </div>

          <div className="rd-right" id="job-form-panel">
            <section className="rd-card rd-form-card">
              <PostJobForm onJobPosted={(newJob) => setMyJobs((prev) => [newJob, ...prev])} />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
