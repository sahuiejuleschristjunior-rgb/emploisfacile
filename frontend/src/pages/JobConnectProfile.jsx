import React from "react";
import { useNavigate } from "react-router-dom";
import JobConnectLayout from "../components/JobConnectLayout";
import useJobConnectData from "../hooks/useJobConnectData";

export default function JobConnectProfile() {
  const nav = useNavigate();
  const data = useJobConnectData();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    nav("/login");
  };

  return (
    <JobConnectLayout user={data.user} onLogout={handleLogout}>
      <section className="hero">
        <div className="hero__info">
          <p className="eyebrow">Profil</p>
          <h3>Optimisez votre candidature</h3>
          <p className="hero__subtitle">
            Consultez et mettez à jour votre profil pour améliorer vos chances auprès des recruteurs.
          </p>
          <div className="hero__actions">
            <button className="primary-btn" onClick={() => nav("/profil")}>Mettre à jour mon profil</button>
          </div>
        </div>
        <div className="hero__highlights">
          <div className="hero-chip">
            <span>Profil</span>
            <strong>{data.profileCompletion}%</strong>
          </div>
          <div className="hero-chip">
            <span>Vues</span>
            <strong>{data.profileViews}</strong>
          </div>
          <div className="hero-chip">
            <span>Messages</span>
            <strong>{data.messagesCount}</strong>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Conseils</p>
            <h3>Complétez votre profil</h3>
          </div>
        </div>
        <div className="progress-block">
          <div className="progress-header">
            <span>Profil complété à {data.profileCompletion}%</span>
            <span className="progress-tip">Ajoutez votre portfolio pour atteindre 100% !</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${data.profileCompletion}%` }}></div>
          </div>
        </div>
        <div className="quick-actions">
          <button className="primary-btn ghost" onClick={() => nav("/profil")}>
            Modifier mon profil
          </button>
          <button className="primary-btn ghost" onClick={() => nav("/jobconnect/candidatures")}>Retour aux candidatures</button>
        </div>
      </section>
    </JobConnectLayout>
  );
}
