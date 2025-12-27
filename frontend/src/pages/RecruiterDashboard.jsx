import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PostJobForm from "../components/PostJobForm";
import useRecruiterJobs from "../hooks/useRecruiterJobs";
import { useAuth } from "../context/AuthContext";
import "../styles/Dashboard.css";

export default function RecruiterDashboard() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { jobs: myJobs, loading, error, addJob } = useRecruiterJobs();

  const handleJobPosted = (newJob) => {
    addJob(newJob);
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
          onClick={() => nav(`/recruiter/job/${job._id}`)}
        >
          Voir les candidats →
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="rd-page-header">
        <div>
          <h2>Tableau de bord</h2>
          <p>Bienvenue {user?.companyName || user?.name || "!"}. Vue d'ensemble.</p>
        </div>

        <button className="rd-btn" onClick={() => nav("/recruiter/post")}>
          Publier une offre
        </button>
      </div>

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
                    {activeJobs > 0
                      ? Math.round(totalApplications / activeJobs)
                      : 0}
                  </div>
                  <div className="hint">Objectif : 15</div>
                </div>
              </div>
            </div>
          </section>

          <section className="rd-card" id="rd-jobs-section">
            <div className="rd-card-header">
              <h3>Vos offres publiées ({myJobs.length})</h3>
            </div>

            {error && <div className="error-message">{error}</div>}
            {loading && <div className="loader">Chargement de vos offres…</div>}

            {!loading && myJobs.length === 0 && !error && (
              <div className="empty-state">Vous n’avez pas encore publié d’offre.</div>
            )}

            <div className="job-list-dashboard">{myJobs.map(renderJobCard)}</div>
          </section>
        </div>

        <div className="rd-right" id="job-form-panel">
          <section className="rd-card rd-form-card">
            <PostJobForm onJobPosted={handleJobPosted} />
          </section>
        </div>
      </div>
    </>
  );
}
