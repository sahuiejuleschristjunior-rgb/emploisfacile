import React from "react";

const statusConfig = {
  pending: { label: "Envoyée", color: "blue" },
  reviewing: { label: "En revue", color: "amber" },
  interview: { label: "Entretien", color: "indigo" },
  accepted: { label: "Offre reçue", color: "emerald" },
  rejected: { label: "Refusée", color: "rose" },
};

export function StatusPill({ status }) {
  const key = (status || "pending").toLowerCase();
  const cfg = statusConfig[key] || statusConfig.pending;
  return <span className={`status-pill status-${cfg.color}`}>{cfg.label}</span>;
}

export function ApplicationCard({ app, onOpen, onContact, onCall }) {
  const job = app.job || {};
  const recruiter = job.recruiter || {};
  const company = recruiter.companyName || recruiter.name || "Entreprise";
  const status = (app.status || "pending").toLowerCase();

  return (
    <div key={app._id} className="application-card" onClick={() => onOpen(job._id)}>
      <div className="application-card__header">
        <div>
          <p className="application-title">{job.title || "Poste"}</p>
          <p className="application-sub">{company}</p>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="application-meta">
        <span>
          Dernière mise à jour :
          {" "}
          {app.updatedAt || app.createdAt
            ? new Date(app.updatedAt || app.createdAt).toLocaleDateString()
            : "-"}
        </span>
        <span className="muted">{job.location || job.city || "Localisation non renseignée"}</span>
      </div>

      <div className="application-actions">
        <button
          className="ghost-btn"
          onClick={(e) => {
            e.stopPropagation();
            onContact(recruiter);
          }}
        >
          Contacter
        </button>
        <button
          className="ghost-btn"
          onClick={(e) => {
            e.stopPropagation();
            onCall(recruiter);
          }}
        >
          Appel vidéo
        </button>
      </div>
    </div>
  );
}

export function JobMiniCard({ job, isFavorite, onToggleFavorite, onOpen }) {
  if (!job) return null;
  const recruiterName =
    job.recruiter?.companyName || job.recruiter?.name || "Entreprise";

  return (
    <div key={job._id} className="mini-card" onClick={() => onOpen(job._id)}>
      <div className="mini-card-top">
        <div>
          <p className="mini-title">{job.title}</p>
          <p className="mini-sub">{recruiterName}</p>
        </div>
        <button
          className={`fav-toggle ${isFavorite ? "fav-active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(job._id, isFavorite);
          }}
        >
          {isFavorite ? "♥" : "♡"}
        </button>
      </div>
      <p className="mini-meta">{job.location || "Localisation"}</p>
    </div>
  );
}

export function ApplicationPipeline({ groupedApps, onOpen }) {
  const lanes = [
    { key: "applied", label: "Envoyée", color: "blue" },
    { key: "inReview", label: "En revue", color: "amber" },
    { key: "interview", label: "Entretien", color: "indigo" },
    { key: "offer", label: "Offre", color: "emerald" },
    { key: "rejected", label: "Refusée", color: "rose" },
  ];

  return (
    <div className="lanes">
      {lanes.map((lane) => (
        <div key={lane.key} className="lane">
          <div className="lane-header">
            <span className={`lane-dot lane-${lane.color}`}></span>
            <div>
              <p className="lane-title">{lane.label}</p>
              <p className="lane-count">{groupedApps[lane.key].length} offre(s)</p>
            </div>
          </div>
          <div className="lane-body">
            {groupedApps[lane.key].length === 0 && (
              <p className="empty-state small">Aucune offre dans cette étape.</p>
            )}
            {groupedApps[lane.key].map((app) => (
              <div key={app._id} className="lane-card" onClick={() => onOpen(app.job?._id)}>
                <p className="lane-card__title">{app.job?.title || "Poste"}</p>
                <p className="lane-card__subtitle">
                  {app.job?.recruiter?.companyName || app.job?.recruiter?.name || "Entreprise"}
                </p>
                <div className="lane-card__footer">
                  <span>
                    {app.updatedAt || app.createdAt
                      ? new Date(app.updatedAt || app.createdAt).toLocaleDateString()
                      : "-"}
                  </span>
                  <span className="ghost-link">Ouvrir</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
