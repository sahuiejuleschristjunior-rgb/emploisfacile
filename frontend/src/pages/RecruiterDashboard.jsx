import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import JobConnectLayout from "../components/JobConnectLayout";
import useRecruiterDashboardData from "../hooks/useRecruiterDashboardData";
import "../styles/CandidateDashboard.css";
import { RecruiterPipeline } from "../components/jobconnect/JobConnectWidgets";

export default function RecruiterDashboard() {
  const nav = useNavigate();
  const data = useRecruiterDashboardData();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    nav("/login");
  };

  const openJob = (jobId) => {
    if (jobId) nav(`/recruiter/job/${jobId}`);
  };

  const openCandidate = (jobId) => {
    if (jobId) nav(`/recruiter/job/${jobId}`);
  };

  const contactCandidate = (candidate) => {
    if (!candidate?._id) return;
    nav("/messages", {
      state: {
        userId: candidate._id,
        name: candidate.name,
        avatar: candidate.avatar,
      },
    });
  };

  const callCandidate = (candidate) => {
    if (!candidate?._id) return;
    nav("/video-call", {
      state: {
        userId: candidate._id,
        name: candidate.name,
        avatar: candidate.avatar,
        role: "recruiter",
      },
    });
  };

  const nextAction = useMemo(() => {
    if (data.pendingReview > 0) {
      return {
        title: "Traitez vos nouvelles candidatures",
        subtitle: `${data.pendingReview} en attente de revue`,
        ctaLabel: "Ouvrir les candidatures",
        ctaAction: () => nav("/recruiter/candidatures"),
        hint: "Répondez sous 48h pour améliorer votre taux de réponse.",
      };
    }

    if (data.upcomingInterviews.length > 0) {
      const next = data.upcomingInterviews[0];
      return {
        title: "Préparez votre prochain entretien",
        subtitle: `${next.candidate?.name || "Candidat"} - ${
          next.job?.title || "Poste"
        }`,
        ctaLabel: "Voir l'agenda",
        ctaAction: () => nav("/jobconnect/agenda"),
        hint: "Partagez l'ordre du jour et les participants à l'avance.",
      };
    }

    if (data.activeJobs === 0) {
      return {
        title: "Publiez votre première offre",
        subtitle: "Attirez vos premiers talents dès aujourd'hui",
        ctaLabel: "Créer une offre",
        ctaAction: () => nav("/create-job"),
        hint: "Une description claire augmente le nombre de candidatures qualifiées.",
      };
    }

    return {
      title: "Boostez la visibilité de vos offres",
      subtitle: `${data.activeJobs} offre(s) en ligne actuellement`,
      ctaLabel: "Gérer mes offres",
      ctaAction: () => nav("/recruiter/candidatures"),
      hint: "Ajoutez des tags et une description concise.",
    };
  }, [data.activeJobs, data.pendingReview, data.upcomingInterviews, nav]);

  return (
    <JobConnectLayout
      user={data.user}
      onLogout={logout}
      eyebrow="Espace recruteur"
      titlePrefix="Bonjour"
      avatarFallback="R"
      menuItems={[
        { key: "home", label: "🏠 Accueil", path: "/fb/dashboard" },
        { key: "dashboard", label: "Tableau de bord", path: "/recruiter/dashboard" },
        { key: "offers", label: "Mes offres", path: "/recruiter/candidatures" },
        { key: "candidatures", label: "Candidatures", path: "/recruiter/candidatures" },
        { key: "messages", label: "Messages", path: "/messages" },
        { key: "profil", label: "Entreprise", path: "/profil" },
        { key: "settings", label: "Paramètres", path: "/settings" },
      ]}
    >
      <section className="hero" id="recent">
        <div className="hero__info">
          <div className="hero__badge">Action prioritaire</div>
          <h3>{nextAction.title}</h3>
          <p className="hero__subtitle">{nextAction.subtitle}</p>
          <p className="hero__hint">{nextAction.hint}</p>
          <div className="hero__actions">
            <button className="primary-btn" onClick={nextAction.ctaAction}>
              {nextAction.ctaLabel}
            </button>
            <button className="ghost-link subtle" onClick={() => nav("/create-job")}>
              Publier une offre
            </button>
          </div>
        </div>
        <div className="hero__highlights">
          <div className="hero-chip">
            <span>Offres actives</span>
            <strong>{data.activeJobs}</strong>
          </div>
          <div className="hero-chip">
            <span>Candidatures</span>
            <strong>{data.totalApplications}</strong>
          </div>
          <div className="hero-chip">
            <span>En revue</span>
            <strong>{data.pendingReview}</strong>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">Offres actives</p>
          <p className="stat-value text-indigo">{data.activeJobs}</p>
          <p className="stat-hint">Gardez-les à jour pour rester visibles.</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Candidatures reçues</p>
          <p className="stat-value text-orange">{data.totalApplications}</p>
          <p className="stat-hint">Répondez sous 48h pour améliorer l'expérience.</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Entretiens planifiés</p>
          <p className="stat-value text-emerald">{data.upcomingInterviews.length}</p>
          <p className="stat-hint">Préparez un plan d'évaluation commun.</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Messages non lus</p>
          <p className="stat-value text-purple">{data.messagesCount}</p>
          <p className="stat-hint">Répondez vite pour ne pas perdre de talents.</p>
        </div>
      </section>

      <div className="grid-two">
        <section className="card pipeline" aria-label="Pipeline de candidatures">
          <div className="card-header">
            <h3>Pipeline candidats</h3>
            <button className="ghost-link" onClick={() => nav("/recruiter/candidatures")}>
              Voir tout
            </button>
          </div>

          <RecruiterPipeline groupedApps={data.groupedApps} onOpen={openCandidate} />
        </section>

        <section className="card agenda-card" id="agenda">
          <div className="card-header">
            <h3>Entretiens à venir</h3>
            <button className="ghost-link" onClick={() => nav("/jobconnect/agenda")}>
              Voir l'agenda
            </button>
          </div>

          <div className="agenda-list">
            {data.upcomingInterviews.length === 0 && (
              <p className="empty-state small">Aucun entretien planifié.</p>
            )}

            {data.upcomingInterviews.map((event) => (
              <div key={event._id} className="agenda-item">
                <div>
                  <p className="agenda-title">{event.candidate?.name || "Candidat"}</p>
                  <p className="agenda-sub">{event.job?.title || "Poste"}</p>
                  {event.when && <p className="agenda-date">{new Date(event.when).toLocaleString()}</p>}
                </div>
                <div className="agenda-actions">
                  <button className="ghost-btn" onClick={() => contactCandidate(event.candidate)}>
                    Contacter
                  </button>
                  <button className="ghost-btn" onClick={() => callCandidate(event.candidate)}>
                    Appel vidéo
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="progress-block">
            <div className="progress-header">
              <span>Taux de réponse rapide</span>
              <span className="progress-tip">Objectif : répondre en 24h</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: "64%" }}></div>
            </div>
          </div>

          <div className="quick-actions">
            <button className="primary-btn ghost" onClick={() => nav("/messages")}>
              Ouvrir la messagerie
            </button>
          </div>
        </section>
      </div>

      <div className="grid-two">
        <section className="card" aria-label="Candidatures récentes">
          <div className="card-header">
            <div>
              <p className="eyebrow">Chronologie</p>
              <h3>Dernières candidatures</h3>
            </div>
            <button className="ghost-link" onClick={() => nav("/recruiter/candidatures")}>
              Tout voir
            </button>
          </div>

          {data.loadingJobs && <div className="loader">Chargement…</div>}
          {data.error && <div className="error-message">{data.error}</div>}
          {!data.loadingJobs && data.recentApplications.length === 0 && !data.error && (
            <div className="empty-state">Aucune candidature reçue pour le moment.</div>
          )}

          <div className="applications-list">
            {data.recentApplications.map((app) => (
              <div key={app._id} className="application-card" onClick={() => openJob(app.job?._id)}>
                <div className="application-card__header">
                  <div>
                    <p className="application-title">{app.candidate?.name || "Candidat"}</p>
                    <p className="application-sub">{app.job?.title || "Poste"}</p>
                  </div>
                  <span className="status-pill status-blue">{app.status || "Pending"}</span>
                </div>

                <div className="application-meta">
                  <span>
                    Reçue le {" "}
                    {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : "-"}
                  </span>
                  <span className="muted">{app.candidate?.email || "Email non renseigné"}</span>
                </div>

                <div className="application-actions">
                  <div className="application-hint">{app.candidate?.experience || "Profil en attente"}</div>
                  <div className="inline-actions">
                    <button
                      className="primary-btn ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        contactCandidate(app.candidate);
                      }}
                    >
                      Contacter
                    </button>
                    <button
                      className="primary-btn ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        callCandidate(app.candidate);
                      }}
                    >
                      Appel vidéo
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card" id="rd-jobs">
          <div className="card-header">
            <div>
              <p className="eyebrow">Offres</p>
              <h3>Vos offres publiées</h3>
            </div>
            <button className="ghost-link" onClick={() => nav("/create-job")}>
              Nouvelle offre
            </button>
          </div>

          {data.loadingJobs && <div className="loader">Chargement de vos offres…</div>}
          {data.error && <div className="error-message">{data.error}</div>}
          {!data.loadingJobs && data.jobs.length === 0 && !data.error && (
            <div className="empty-state">Vous n'avez pas encore publié d'offre.</div>
          )}

          <div className="mini-section">
            <div className="mini-section-header">
              <h4>Dernières offres</h4>
              <span className="mini-count">{data.jobs.length}</span>
            </div>
            <div className="mini-grid">
              {data.jobs.slice(0, 4).map((job) => (
                <div key={job._id} className="mini-card" onClick={() => openJob(job._id)}>
                  <div className="mini-card-top">
                    <div>
                      <p className="mini-title">{job.title}</p>
                      <p className="mini-sub">{job.location || "Localisation"}</p>
                    </div>
                    <span className="mini-count">{job.applications?.length || 0}</span>
                  </div>
                  <p className="mini-meta">
                    Publiée le {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "-"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </JobConnectLayout>
  );
}
