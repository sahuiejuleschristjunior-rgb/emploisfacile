import React from "react";
import { useNavigate } from "react-router-dom";
import JobConnectLayout from "../components/JobConnectLayout";
import useJobConnectData from "../hooks/useJobConnectData";
import { ApplicationCard } from "../components/jobconnect/JobConnectWidgets";

export default function JobConnectInterviews() {
  const nav = useNavigate();
  const data = useJobConnectData();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    nav("/login");
  };

  const goToJob = (jobId) => {
    if (jobId) nav(`/emplois/${jobId}`);
  };

  const contactRecruiter = (recruiter) => {
    nav("/messages", {
      state: {
        userId: recruiter?._id,
        name: recruiter?.name || recruiter?.companyName,
        avatar: recruiter?.avatar,
      },
    });
  };

  const callRecruiter = (recruiter) => {
    nav("/video-call", {
      state: {
        userId: recruiter?._id,
        name: recruiter?.name || recruiter?.companyName,
        avatar: recruiter?.avatar,
        role: "candidate",
      },
    });
  };

  const interviewApps = data.groupedApps.interview;

  return (
    <JobConnectLayout user={data.user} onLogout={handleLogout}>
      <section className="hero">
        <div className="hero__info">
          <p className="eyebrow">Entretiens</p>
          <h3>Préparez vos entretiens</h3>
          <p className="hero__subtitle">
            Retrouvez vos entretiens planifiés, contactez les recruteurs et relisez les offres avant
            le jour J.
          </p>
          <div className="hero__actions">
            <button className="primary-btn" onClick={() => nav("/fb/dashboard")}>Découvrir d'autres offres</button>
          </div>
        </div>
        <div className="hero__highlights">
          <div className="hero-chip">
            <span>Entretiens</span>
            <strong>{data.upcomingInterviews}</strong>
          </div>
          <div className="hero-chip">
            <span>Candidatures actives</span>
            <strong>{data.totalApplications}</strong>
          </div>
          <div className="hero-chip">
            <span>Favoris</span>
            <strong>{data.savedJobs.length}</strong>
          </div>
        </div>
      </section>

      <section className="card" aria-label="Entretiens planifiés">
        <div className="card-header">
          <h3>Vos entretiens à venir</h3>
          <button className="ghost-link" onClick={() => nav("/jobconnect/agenda")}>Voir l'agenda</button>
        </div>

        {data.loadingApps && <div className="loader">Chargement…</div>}
        {!data.loadingApps && interviewApps.length === 0 && (
          <div className="empty-state">Aucun entretien prévu pour l'instant.</div>
        )}

        <div className="applications-list">
          {interviewApps.map((app) => (
            <ApplicationCard
              key={app._id}
              app={app}
              onOpen={goToJob}
              onContact={contactRecruiter}
              onCall={callRecruiter}
            />
          ))}
        </div>
      </section>
    </JobConnectLayout>
  );
}
