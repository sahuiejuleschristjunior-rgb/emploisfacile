import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/Dashboard.css";

export default function RecruiterJobApplications() {
  const { jobId } = useParams();
  const nav = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    if (!token) nav("/login");
  }, [token]);

  useEffect(() => {
    if (jobId && token) fetchApplications();
  }, [jobId, token]);

  const fetchApplications = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/applications/job/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message);

      setApplications(data);
    } catch (err) {
      setError(err.message);
      setApplications([]);
    }

    setLoading(false);
  };

  const handleStatusChange = async (applicationId, newStatus) => {
    try {
      setUpdatingId(applicationId);
      const res = await fetch(`${API_URL}/applications/${applicationId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message);

      setApplications((prev) =>
        prev.map((app) =>
          app._id === applicationId ? { ...app, status: newStatus } : app
        )
      );
    } catch (err) {
      setError(err.message);
    }
    setUpdatingId(null);
  };

  const renderStatusBadge = (status) => {
    const labels = {
      Pending: "En attente",
      Reviewing: "En cours d'étude",
      Interview: "Entretien",
      Accepted: "Accepté",
      Rejected: "Rejeté",
    };

    return <span className={`status-badge status-badge--${status.toLowerCase()}`}>{labels[status]}</span>;
  };

  const contactCandidate = (candidate) => {
    nav("/messages", {
      state: {
        userId: candidate._id,
        name: candidate.name,
        avatar: candidate.avatar,
      },
    });
  };

  const callCandidate = (candidate) => {
    nav("/video-call", {
      state: {
        userId: candidate._id,
        name: candidate.name,
        avatar: candidate.avatar,
        role: "recruiter",
      },
    });
  };

  const renderApplicationItem = (app) => {
    const c = app.candidate || {};

    return (
      <div key={app._id} className="app-item">
        <div className="app-main">
          <div className="app-avatar">
            {c.avatar ? (
              <img src={c.avatar} alt={c.name} loading="lazy" />
            ) : (
              <div className="app-avatar-fallback">
                {(c.name || "?").charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="app-info">
            <div className="app-name-row">
              <div className="app-name">{c.name || "Candidat"}</div>
              <div className="app-email">{c.email}</div>
            </div>

            <div className="app-meta">
              <span>Candidature du {new Date(app.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="app-actions">
          <div className="app-status-row">
            {renderStatusBadge(app.status)}

            <select
              className="status-select"
              value={app.status}
              disabled={updatingId === app._id}
              onChange={(e) => handleStatusChange(app._id, e.target.value)}
            >
              <option value="Pending">En attente</option>
              <option value="Reviewing">En cours d'étude</option>
              <option value="Interview">Entretien</option>
              <option value="Accepted">Accepté</option>
              <option value="Rejected">Rejeté</option>
            </select>
          </div>

          <button
            className="app-btn contact-btn"
            onClick={() => contactCandidate(c)}
          >
            💬 Contacter
          </button>

          <button className="app-btn call-btn" onClick={() => callCandidate(c)}>
            📹 Appel vidéo
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="rd-page-header">
        <div>
          <h2>Candidatures de l'offre</h2>
          <p>ID Offre : {jobId}</p>
        </div>
      </div>

      <section className="rd-card">
        <div className="rd-card-header">
          <h3>Candidats ({applications.length})</h3>
        </div>

        {error && <div className="error-message">{error}</div>}
        {loading && <div className="loader">Chargement…</div>}

        {!loading && applications.length === 0 && !error && (
          <div className="empty-state">Aucun candidat n’a encore postulé.</div>
        )}

        <div className="app-list">{applications.map(renderApplicationItem)}</div>
      </section>
    </>
  );
}
