import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/Dashboard.css";

export default function RecruiterApplications() {
  const nav = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");

  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const [selectedJobId, setSelectedJobId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!token) {
      nav("/login");
    }
  }, [token, nav]);

  useEffect(() => {
    if (!token) return;
    fetchAllApplications();
  }, [token]);

  const fetchAllApplications = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/applications/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Impossible de charger les candidatures.");
      }

      const apps = Array.isArray(data) ? data : data.applications || [];
      const js = Array.isArray(data.jobs) ? data.jobs : [];

      setApplications(apps);
      setJobs(js);
    } catch (err) {
      setError(err.message);
      setApplications([]);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (applicationId, newStatus) => {
    try {
      setUpdatingId(applicationId);
      setError("");

      const res = await fetch(`${API_URL}/applications/${applicationId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Erreur lors du changement de statut.");
      }

      setApplications((prev) =>
        prev.map((app) => (app._id === applicationId ? { ...app, status: newStatus } : app))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const renderStatusBadge = (status) => {
    let label = "";
    let className = "status-badge status-badge--default";

    switch (status) {
      case "Pending":
        label = "En attente";
        className = "status-badge status-badge--pending";
        break;
      case "Reviewing":
        label = "En cours d'étude";
        className = "status-badge status-badge--reviewing";
        break;
      case "Interview":
        label = "Entretien";
        className = "status-badge status-badge--interview";
        break;
      case "Accepted":
        label = "Accepté";
        className = "status-badge status-badge--accepted";
        break;
      case "Rejected":
        label = "Rejeté";
        className = "status-badge status-badge--rejected";
        break;
      default:
        label = status || "Inconnu";
        break;
    }

    return <span className={className}>{label}</span>;
  };

  const sortedJobs = useMemo(() => {
    const clone = [...jobs];
    clone.sort((a, b) => {
      const aActive = a.isActive ? 1 : 0;
      const bActive = b.isActive ? 1 : 0;

      if (aActive !== bActive) return bActive - aActive;

      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });
    return clone;
  }, [jobs]);

  const grouped = useMemo(() => {
    const map = new Map();

    for (const app of applications) {
      const job = app.job || {};
      const jobId = job._id || "unknown";

      if (selectedJobId !== "all" && jobId !== selectedJobId) continue;
      if (selectedStatus !== "all" && app.status !== selectedStatus) continue;

      const candidate = app.candidate || {};
      const target = ((candidate.name || "") + " " + (candidate.email || "")).toLowerCase();

      if (search && !target.includes(search.toLowerCase())) continue;

      if (!map.has(jobId)) {
        map.set(jobId, {
          job,
          applications: [],
        });
      }
      map.get(jobId).applications.push(app);
    }

    const result = [];
    for (const job of sortedJobs) {
      const jobId = String(job._id);
      if (map.has(jobId)) {
        result.push(map.get(jobId));
      }
    }

    for (const [jobId, group] of map.entries()) {
      const exists = sortedJobs.some((j) => String(j._id) === jobId);
      if (!exists) result.push(group);
    }

    return result;
  }, [applications, sortedJobs, selectedJobId, selectedStatus, search]);

  const totalApplications = applications.length;
  const totalPending = applications.filter((a) => a.status === "Pending").length;
  const totalAccepted = applications.filter((a) => a.status === "Accepted").length;
  const totalRejected = applications.filter((a) => a.status === "Rejected").length;

  const renderApplicationItem = (app) => {
    const candidate = app.candidate || {};
    const job = app.job || {};

    return (
      <div key={app._id} className="app-item">
        <div className="app-main">
          <div className="app-avatar">
            {candidate.avatar ? (
              <img src={candidate.avatar} alt={candidate.name || "Candidat"} />
            ) : (
              (candidate.name || "?").slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <div className="app-name">{candidate.name || candidate.email}</div>
            <div className="app-meta">{candidate.email}</div>
            <div className="app-meta">{job.title}</div>
          </div>
        </div>

        <div className="app-actions">
          {renderStatusBadge(app.status)}
          <select
            value={app.status}
            onChange={(e) => handleStatusChange(app._id, e.target.value)}
            disabled={updatingId === app._id}
          >
            <option value="Pending">En attente</option>
            <option value="Reviewing">En cours d'étude</option>
            <option value="Interview">Entretien</option>
            <option value="Accepted">Accepté</option>
            <option value="Rejected">Rejeté</option>
          </select>
        </div>
      </div>
    );
  };

  return (
    <div className="rd-shell">
      <main className="rd-main">
        <div className="rd-container">
          <div className="rd-center">
            <section className="rd-card rd-card-kpi">
              <div className="rd-kpi-grid">
                <div className="rd-kpi">
                  <div className="num">{totalApplications}</div>
                  <div className="label">Total candidatures</div>
                </div>
                <div className="rd-kpi">
                  <div className="num">{totalPending}</div>
                  <div className="label">En attente</div>
                </div>
                <div className="rd-kpi">
                  <div className="num">{totalAccepted}</div>
                  <div className="label">Acceptées</div>
                </div>
                <div className="rd-kpi">
                  <div className="num">{totalRejected}</div>
                  <div className="label">Rejetées</div>
                </div>
              </div>
            </section>

            <section className="rd-card">
              <div className="filters">
                <select value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)}>
                  <option value="all">Toutes les offres</option>
                  {sortedJobs.map((job) => (
                    <option key={job._id} value={job._id}>
                      {job.title}
                    </option>
                  ))}
                </select>
                <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                  <option value="all">Tous les statuts</option>
                  <option value="Pending">En attente</option>
                  <option value="Reviewing">En cours d'étude</option>
                  <option value="Interview">Entretien</option>
                  <option value="Accepted">Accepté</option>
                  <option value="Rejected">Rejeté</option>
                </select>
                <input
                  type="text"
                  placeholder="Rechercher un candidat"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button className="rd-btn" onClick={fetchAllApplications} disabled={loading}>
                  Rafraîchir
                </button>
              </div>

              {error && <div className="error-message">{error}</div>}
              {loading && <div className="loader">Chargement des candidatures…</div>}

              {!loading && grouped.length === 0 && !error && (
                <div className="empty-state">Aucune candidature trouvée.</div>
              )}

              <div className="applications-grid">
                {grouped.map((group) => (
                  <div key={group.job._id || group.job.title} className="app-group">
                    <div className="app-group-header">
                      <div>
                        <div className="app-group-title">{group.job.title || "Offre inconnue"}</div>
                        <div className="app-group-sub">
                          {group.job.location || "Localisation inconnue"}
                        </div>
                      </div>
                      <span className="rd-chip">{group.applications.length} candidatures</span>
                    </div>

                    <div className="app-list">
                      {group.applications.map((app) => renderApplicationItem(app))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
