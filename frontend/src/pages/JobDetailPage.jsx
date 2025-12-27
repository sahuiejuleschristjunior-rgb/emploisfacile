import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/jobs.css";

export default function JobDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchJob();
  }, []);

  async function fetchJob() {
    try {
      setLoading(true);
      const res = await fetch(`https://emploisfacile.org/api/jobs/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      setJob(data.job || null);
    } catch (e) {
      console.log("Erreur récupération job :", e);
    } finally {
      setLoading(false);
    }
  }

  function applyToJob() {
    alert("Candidature envoyée !");
    // futur : API de candidature
  }

  if (loading) {
    return (
      <div className="jobs-page">
        <p className="loading">Chargement...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="jobs-page">
        <h1>Aucune offre trouvée</h1>
        <button className="apply-btn" onClick={() => nav(-1)}>
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="jobs-page">
      <button className="filter-btn" onClick={() => nav(-1)}>
        ← Retour
      </button>

      <h1 className="job-title" style={{ marginTop: 20 }}>
        {job.title}
      </h1>

      <p className="job-company">{job.company}</p>
      <p className="job-location">{job.location}</p>

      <div className="job-card" style={{ marginTop: 20 }}>
        <h2>Description du poste</h2>
        <p className="job-desc">{job.description}</p>

        {job.requirements && (
          <>
            <h2>Exigences</h2>
            <p className="job-desc">{job.requirements}</p>
          </>
        )}

        <button className="apply-btn" onClick={applyToJob}>
          Postuler maintenant
        </button>
      </div>
    </div>
  );
}
