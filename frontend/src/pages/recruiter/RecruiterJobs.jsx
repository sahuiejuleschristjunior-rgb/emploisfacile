import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PostJobForm from "../../components/PostJobForm";
import "../../styles/Dashboard.css";

export default function RecruiterJobs() {
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
        <div className="rd-container">
          <div className="rd-center">
            <section className="rd-card">
              <div className="rd-card-header">
                <h3>Toutes vos offres ({myJobs.length})</h3>
                <button className="view-link" onClick={fetchMyJobs}>
                  Rafraîchir
                </button>
              </div>

              {error && <div className="error-message">{error}</div>}
              {loadingJobs && <div className="loader">Chargement de vos offres…</div>}
              {!loadingJobs && myJobs.length === 0 && !error && (
                <div className="empty-state">Vous n’avez pas encore publié d’offre.</div>
              )}

              <div className="job-list-dashboard">{myJobs.map(renderJobCard)}</div>
            </section>
          </div>

          <div className="rd-right">
            <section className="rd-card rd-form-card">
              <PostJobForm onJobPosted={(newJob) => setMyJobs((prev) => [newJob, ...prev])} />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
