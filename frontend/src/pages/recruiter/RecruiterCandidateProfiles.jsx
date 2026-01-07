import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import RecruiterLayout from "../../layouts/RecruiterLayout";
import useRecruiterDashboardData from "../../hooks/recruiter/useRecruiterDashboardData";
import "../../styles/RecruiterDashboard.css";

const statusLabels = {
  pending: "En attente",
  reviewed: "En cours d'étude",
  accepted: "Accepté",
  rejected: "Rejeté",
};

const statusPillClass = {
  pending: "status-pill status-amber",
  reviewed: "status-pill status-blue",
  accepted: "status-pill status-emerald",
  rejected: "status-pill status-rose",
};

const normalizeSkills = (skillsValue) => {
  if (Array.isArray(skillsValue)) return skillsValue.join(", ");
  return skillsValue || "";
};

const buildProfile = (candidate = {}) => {
  const professional = candidate.professionalProfile || {};
  const skillsValue =
    normalizeSkills(professional.skills) ||
    normalizeSkills(candidate.skills) ||
    normalizeSkills(candidate.keySkills);

  return {
    name: professional.name || candidate.name || "",
    title: professional.title || candidate.title || candidate.jobTitle || "",
    email: professional.email || candidate.email || "",
    phone: professional.phone || candidate.phone || "",
    location: professional.location || candidate.location || "",
    experience: professional.experience || candidate.experience || "",
    skills: skillsValue,
    availability: professional.availability || candidate.availability || "",
    portfolio: professional.portfolio || candidate.portfolio || "",
    linkedin: professional.linkedin || candidate.linkedin || "",
    bio: professional.bio || candidate.bio || "",
    avatar: professional.avatar || candidate.avatar || "",
    cvData: professional.cvData || candidate.cvData || "",
    cvName: professional.cvName || candidate.cvName || "",
  };
};

export default function RecruiterCandidateProfiles() {
  const nav = useNavigate();
  const data = useRecruiterDashboardData();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    nav("/login");
  };

  const profiles = useMemo(() => {
    const map = new Map();

    data.applications.forEach((app) => {
      const candidate = app.applicant || {};
      const key = candidate._id || candidate.email || app.applicantEmail;
      if (!key) return;

      if (!map.has(key)) {
        map.set(key, {
          candidate,
          profile: buildProfile(candidate),
          applications: [],
        });
      }

      map.get(key).applications.push(app);
    });

    return Array.from(map.values()).sort((a, b) => {
      return (a.profile.name || "").localeCompare(b.profile.name || "");
    });
  }, [data.applications]);

  const downloadCv = (candidate) => {
    if (!candidate?.cvData) return;
    const link = document.createElement("a");
    const safeName = candidate.name
      ? candidate.name.replace(/\s+/g, "-").toLowerCase()
      : "candidat";
    link.href = candidate.cvData;
    link.download = candidate.cvName || `cv-${safeName}.pdf`;
    link.target = "_blank";
    link.rel = "noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <RecruiterLayout
      user={data.user}
      onLogout={logout}
      eyebrow="Espace recruteur"
      titlePrefix="Profils candidats"
      avatarFallback="R"
    >
      <section className="hero">
        <div className="hero__info">
          <div className="hero__badge">Profils candidats</div>
          <h3>Consultez les profils professionnels</h3>
          <p className="hero__subtitle">
            Retrouvez les informations clés et les offres auxquelles les candidats ont postulé.
          </p>
        </div>
        <div className="hero__highlights">
          <div className="hero-chip">
            <span>Profils distincts</span>
            <strong>{profiles.length}</strong>
          </div>
          <div className="hero-chip">
            <span>Candidatures</span>
            <strong>{data.totalApplications}</strong>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Profils</p>
            <h3>Profils professionnels disponibles</h3>
          </div>
        </div>

        {data.loadingJobs && <div className="loader">Chargement des profils…</div>}
        {data.error && <div className="error-message">{data.error}</div>}

        {!data.loadingJobs && profiles.length === 0 && !data.error && (
          <div className="empty-state">Aucun profil candidat n'est encore disponible.</div>
        )}

        {!data.loadingJobs && profiles.length > 0 && (
          <div className="recruiter-profiles-grid">
            {profiles.map(({ candidate, profile, applications }) => {
              const skillTags = profile.skills
                ? profile.skills
                    .split(",")
                    .map((skill) => skill.trim())
                    .filter(Boolean)
                    .slice(0, 8)
                : [];

              const jobsMap = new Map();
              applications.forEach((app) => {
                const job = app.job || {};
                const jobId = job._id || app.jobId || app.job;
                if (!jobId) return;
                const existing = jobsMap.get(jobId);
                const updatedAt = new Date(app.updatedAt || app.createdAt || 0).getTime();
                if (!existing || updatedAt > existing.updatedAt) {
                  jobsMap.set(jobId, {
                    jobId,
                    title: job.title || app.jobTitle || "Offre non renseignée",
                    status: (app.status || "pending").toLowerCase(),
                    appliedAt: app.createdAt,
                    updatedAt,
                  });
                }
              });

              const appliedJobs = Array.from(jobsMap.values()).sort(
                (a, b) => b.updatedAt - a.updatedAt
              );

              return (
                <article
                  key={candidate._id || candidate.email || profile.email}
                  className="recruiter-profile-card"
                >
                  <div className="recruiter-profile-header">
                    <div className="recruiter-profile-avatar">
                      {profile.avatar ? (
                        <img src={profile.avatar} alt={profile.name || "Candidat"} loading="lazy" />
                      ) : (
                        <div className="recruiter-profile-avatar__fallback">
                          {(profile.name || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4>{profile.name || "Candidat"}</h4>
                      <p>{profile.title || "Poste recherché"}</p>
                      <p className="recruiter-profile-meta">
                        {profile.location || "Localisation"} · {profile.availability || "Disponibilité"}
                      </p>
                    </div>
                  </div>

                  <p className="recruiter-profile-bio">
                    {profile.bio || "Ce candidat n'a pas encore ajouté de présentation."}
                  </p>

                  <div className="recruiter-profile-tags">
                    {skillTags.length
                      ? skillTags.map((skill) => <span key={skill}>{skill}</span>)
                      : "Compétences à renseigner"}
                  </div>

                  <div className="recruiter-profile-details">
                    <span>{profile.email || "Email indisponible"}</span>
                    <span>{profile.phone || "Téléphone non renseigné"}</span>
                    <span>{profile.experience || "Expérience"}</span>
                    <span>{profile.portfolio || "Portfolio"}</span>
                    <span>{profile.linkedin || "LinkedIn"}</span>
                  </div>

                  <div className="recruiter-profile-actions">
                    {profile.cvData ? (
                      <button className="primary-btn ghost" onClick={() => downloadCv(profile)}>
                        Télécharger le CV
                      </button>
                    ) : (
                      <button className="ghost-btn" type="button" disabled>
                        CV non disponible
                      </button>
                    )}
                  </div>

                  <div className="recruiter-profile-offers">
                    <h5>Offres postulées</h5>
                    {appliedJobs.length === 0 ? (
                      <p className="empty-state small">Aucune offre associée.</p>
                    ) : (
                      <ul>
                        {appliedJobs.map((job) => (
                          <li key={job.jobId}>
                            <div className="recruiter-profile-offer-row">
                              <div>
                                <p className="offer-title">{job.title}</p>
                                <p className="offer-location">
                                  Postulé le {job.appliedAt ? new Date(job.appliedAt).toLocaleDateString() : "-"}
                                </p>
                              </div>
                              <span className={statusPillClass[job.status] || "status-pill status-blue"}>
                                {statusLabels[job.status] || job.status}
                              </span>
                            </div>
                            <button
                              className="ghost-link subtle"
                              onClick={() => job.jobId && nav(`/recruiter/job/${job.jobId}`)}
                            >
                              Voir l'offre
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </RecruiterLayout>
  );
}
