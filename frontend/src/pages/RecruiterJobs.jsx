import { Link } from "react-router-dom";
import useRecruiterJobs from "../hooks/useRecruiterJobs";
import "../styles/Dashboard.css";

export default function RecruiterJobs() {
  const { jobs, loading, error } = useRecruiterJobs();

  return (
    <>
      <div className="rd-page-header">
        <div>
          <h2>Offres publiées</h2>
          <p>Retrouvez vos annonces actives et accédez aux candidatures.</p>
        </div>
      </div>

      <section className="rd-card">
        <div className="rd-card-header">
          <h3>Vos offres ({jobs.length})</h3>
        </div>

        {error && <div className="error-message">{error}</div>}
        {loading && <div className="loader">Chargement de vos offres…</div>}

        {!loading && jobs.length === 0 && !error && (
          <div className="empty-state">Vous n’avez pas encore publié d’offre.</div>
        )}

        <div className="job-list-dashboard">
          {jobs.map((job) => (
            <div key={job._id} className="job-item">
              <div className="job-item-header">
                <h4>{job.title}</h4>
                <span className="job-pill">{job.contractType}</span>
              </div>

              <div className="job-meta">
                {job.location} · Publiée le
                {" "}
                {job.createdAt
                  ? new Date(job.createdAt).toLocaleDateString()
                  : "—"}
              </div>

              <div className="job-stats">
                <span>{job.applications?.length || 0} candidatures</span>
                <Link className="view-link" to={`/recruiter/job/${job._id}`}>
                  Voir les candidats →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
