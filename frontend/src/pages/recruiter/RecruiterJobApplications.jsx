import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import RecruiterLayout from "../../layouts/RecruiterLayout";
import "../../styles/RecruiterDashboard.css";

export default function RecruiterJobApplications() {
  const { jobId } = useParams();
  const nav = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [expandedProfileId, setExpandedProfileId] = useState(null);

  /* ============================================================
     REDIRECTION SI PAS CONNECTÉ
  ============================================================ */
  useEffect(() => {
    if (!token) nav("/login");
  }, [token]);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (err) {
        console.error("Erreur de chargement de l'utilisateur", err);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    nav("/login");
  };

  /* ============================================================
     CHARGER LES CANDIDATURES
  ============================================================ */
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

  /* ============================================================
     CHANGEMENT DE STATUT
  ============================================================ */
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

  /* ============================================================
     GÉNÉRATION DU BADGE
  ============================================================ */
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

  /* ============================================================
     BOUTON → CONTACTER LE CANDIDAT
  ============================================================ */
  const contactCandidate = (candidate) => {
    nav("/messages", {
      state: {
        userId: candidate._id,
        name: candidate.name,
        avatar: candidate.avatar,
      },
    });
  };

  /* ============================================================
     BOUTON → APPEL VIDÉO (placeholder)
  ============================================================ */
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

  const toggleProfessionalProfile = (applicationId) => {
    setExpandedProfileId((prev) => (prev === applicationId ? null : applicationId));
  };

  const buildProfessionalProfile = (candidate = {}) => {
    const professionalProfile = candidate.professionalProfile || {};
    const skillsValue = Array.isArray(professionalProfile.skills)
      ? professionalProfile.skills.join(", ")
      : professionalProfile.skills || "";

    return {
      name: professionalProfile.name || candidate.name || "Candidat",
      title: professionalProfile.title || "",
      email: professionalProfile.email || candidate.email || "",
      phone: professionalProfile.phone || "",
      location: professionalProfile.location || "",
      experience: professionalProfile.experience || "",
      skills: skillsValue,
      availability: professionalProfile.availability || "",
      portfolio: professionalProfile.portfolio || "",
      linkedin: professionalProfile.linkedin || "",
      bio: professionalProfile.bio || "",
      avatar: professionalProfile.avatar || candidate.avatar || "",
      cvData: professionalProfile.cvData || "",
      cvName: professionalProfile.cvName || "",
    };
  };

  /* ============================================================
     AFFICHAGE D'UNE CANDIDATURE
  ============================================================ */
  const renderApplicationItem = (app) => {
    const c = app.candidate || {};
    const profile = buildProfessionalProfile(c);
    const profileSkills = profile.skills
      ? profile.skills.split(",").map((skill) => skill.trim()).filter(Boolean).slice(0, 8)
      : [];
    const cvLink = app.cvUrl || profile.cvData || c.candidateProfile?.cvUrl || "";
    const cvName = profile.cvName || "cv.pdf";
    const isProfileExpanded = expandedProfileId === app._id;
    const hasProfileDetails = Boolean(
      profile.title ||
      profile.location ||
      profile.experience ||
      profile.skills ||
      profile.availability ||
      profile.portfolio ||
      profile.linkedin ||
      profile.bio
    );

    return (
      <div key={app._id} className="recruiter-app-item">
        {/* ------------------------------------------------ */}
        {/* INFO CANDIDAT */}
        {/* ------------------------------------------------ */}
        <div className="recruiter-app-main">
          <div className="recruiter-app-avatar">
            {c.avatar ? (
              <img src={c.avatar} alt={c.name} loading="lazy" />
            ) : (
              <div className="recruiter-app-avatar-fallback">
                {(c.name || "?").charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="recruiter-app-info">
            <div className="recruiter-app-name-row">
              <div className="recruiter-app-name">{c.name || "Candidat"}</div>
              <div className="recruiter-app-email">{c.email}</div>
            </div>

            <div className="recruiter-app-meta">
              <span>Candidature du {new Date(app.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------ */}
        {/* ACTIONS */}
        {/* ------------------------------------------------ */}
        <div className="recruiter-app-actions">

          {/* STATUT */}
          <div className="recruiter-app-status-row">
            {renderStatusBadge(app.status)}

            <select
              className="recruiter-status-select"
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

          {/* MESSAGERIE */}
          <button
            className="app-action-btn app-action-btn--primary"
            onClick={() => contactCandidate(c)}
          >
            💬 Contacter
          </button>

          {/* APPEL VIDÉO */}
          <button
            className="app-action-btn app-action-btn--ghost"
            onClick={() => callCandidate(c)}
          >
            📹 Appel vidéo
          </button>

          <button
            className="app-action-btn app-action-btn--ghost"
            type="button"
            onClick={() => nav(`/profil/${c._id}`)}
            disabled={!c._id}
          >
            👤 Profil public
          </button>

          <button
            className="app-action-btn app-action-btn--ghost"
            type="button"
            onClick={() => toggleProfessionalProfile(app._id)}
            aria-expanded={isProfileExpanded}
          >
            🧾 Profil professionnel
          </button>

          {cvLink ? (
            <a
              className="app-action-btn app-action-btn--primary"
              href={cvLink}
              download={cvName}
            >
              📄 Télécharger CV
            </a>
          ) : (
            <button className="app-action-btn app-action-btn--ghost" type="button" disabled>
              📄 CV indisponible
            </button>
          )}

        </div>

        {isProfileExpanded && (
          <div className="recruiter-profile-panel">
            <div className="recruiter-profile-header">
              <div className="recruiter-profile-avatar">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={`Photo de ${profile.name}`} />
                ) : (
                  <div className="recruiter-profile-avatar-fallback">
                    {(profile.name || "C").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h4>{profile.name}</h4>
                <p>{profile.title || "Titre professionnel non renseigné"}</p>
                <p className="recruiter-profile-meta">
                  {profile.location || "Localisation non précisée"} · {profile.availability || "Disponibilité à définir"}
                </p>
              </div>
            </div>

            {hasProfileDetails ? (
              <div className="recruiter-profile-details">
                <p>{profile.bio || "Présentation non renseignée."}</p>
                <div className="recruiter-profile-tags">
                  {profileSkills.length ? profileSkills.map((skill) => <span key={skill}>{skill}</span>) : <span>Compétences à compléter</span>}
                </div>
                <div className="recruiter-profile-contact">
                  <p>{profile.experience || "Expérience à préciser"}</p>
                  <p>{profile.email || "Email non communiqué"} · {profile.phone || "Téléphone non communiqué"}</p>
                  <p>{profile.portfolio || "Portfolio"} · {profile.linkedin || "LinkedIn"}</p>
                </div>
              </div>
            ) : (
              <p className="recruiter-profile-empty">
                Le candidat n’a pas encore complété son profil professionnel.
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  /* ============================================================
     RENDU GLOBAL
  ============================================================ */
  return (
    <RecruiterLayout user={user} onLogout={handleLogout}>
      <section className="hero recruiter-apps-hero">
        <div className="hero__info">
          <div className="hero__badge">Candidatures</div>
          <h3>Candidatures de l'offre</h3>
          <p className="hero__subtitle">ID Offre : {jobId}</p>
          <div className="hero__actions">
            <button className="ghost-link subtle" onClick={() => nav(-1)}>
              ← Retour au tableau de bord
            </button>
          </div>
        </div>
        <div className="hero__highlights">
          <div className="hero-chip">
            <span>Total</span>
            <strong>{applications.length}</strong>
          </div>
          <div className="hero-chip">
            <span>En attente</span>
            <strong>{applications.filter((app) => app.status === "Pending").length}</strong>
          </div>
          <div className="hero-chip">
            <span>Entretiens</span>
            <strong>{applications.filter((app) => app.status === "Interview").length}</strong>
          </div>
        </div>
      </section>

      <section className="card recruiter-apps-card">
        <div className="card-header recruiter-apps-card-header">
          <div>
            <h3>Candidats ({applications.length})</h3>
            <p className="recruiter-apps-subtitle">
              Suivez l’avancement des candidatures et contactez rapidement les profils clés.
            </p>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {loading && <div className="loader">Chargement…</div>}

        {!loading && applications.length === 0 && !error && (
          <div className="empty-state">
            Aucun candidat n’a encore postulé.
          </div>
        )}

        <div className="recruiter-apps-list">
          {applications.map(renderApplicationItem)}
        </div>
      </section>
    </RecruiterLayout>
  );
}
