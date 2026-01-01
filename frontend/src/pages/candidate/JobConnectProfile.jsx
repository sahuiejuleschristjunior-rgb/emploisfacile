import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CandidateLayout from "../../layouts/CandidateLayout";
import useCandidateDashboardData from "../../hooks/candidate/useCandidateDashboardData";

export default function JobConnectProfile() {
  const nav = useNavigate();
  const data = useCandidateDashboardData();
  const [formValues, setFormValues] = useState({
    name: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    experience: "",
    skills: "",
    availability: "",
    portfolio: "",
    linkedin: "",
    bio: "",
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!data.user) return;
    setFormValues((prev) => ({
      ...prev,
      name: data.user?.name || "",
      title: data.user?.title || data.user?.jobTitle || "",
      email: data.user?.email || "",
      phone: data.user?.phone || "",
      location: data.user?.location || "",
      experience: data.user?.experience || "",
      skills: Array.isArray(data.user?.skills) ? data.user.skills.join(", ") : data.user?.skills || "",
      availability: data.user?.availability || "",
      portfolio: data.user?.portfolio || "",
      linkedin: data.user?.linkedin || "",
      bio: data.user?.bio || "",
    }));
  }, [data.user]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    nav("/login");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setIsSaving(true);
    setStatusMessage("");

    const updatedProfile = {
      ...(data.user || {}),
      ...formValues,
      skills: formValues.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),
    };

    localStorage.setItem("user", JSON.stringify(updatedProfile));

    setTimeout(() => {
      setIsSaving(false);
      setStatusMessage("Profil candidat mis à jour avec succès.");
    }, 500);
  };

  return (
    <CandidateLayout user={data.user} onLogout={handleLogout}>
      <section className="hero">
        <div className="hero__info">
          <p className="eyebrow">Profil</p>
          <h3>Optimisez votre candidature</h3>
          <p className="hero__subtitle">
            Consultez et mettez à jour votre profil pour améliorer vos chances auprès des recruteurs.
          </p>
          <div className="hero__actions">
            <button className="primary-btn" onClick={() => nav("/profil")}>Voir mon profil public</button>
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

      <section className="card candidate-profile-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Mon profil</p>
            <h3>Ajouter ou mettre à jour votre profil candidat</h3>
          </div>
          <button className="primary-btn ghost" onClick={() => nav("/candidate/candidatures")}>
            Retour aux candidatures
          </button>
        </div>
        <form className="candidate-profile-form" onSubmit={handleSubmit}>
          <div className="profile-form-grid">
            <div className="profile-form-field">
              <label htmlFor="name">Nom complet</label>
              <input id="name" name="name" value={formValues.name} onChange={handleChange} placeholder="Ex : Nina Laurent" />
            </div>
            <div className="profile-form-field">
              <label htmlFor="title">Métier ciblé</label>
              <input
                id="title"
                name="title"
                value={formValues.title}
                onChange={handleChange}
                placeholder="Ex : Développeuse front-end"
              />
            </div>
            <div className="profile-form-field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" value={formValues.email} onChange={handleChange} />
            </div>
            <div className="profile-form-field">
              <label htmlFor="phone">Téléphone</label>
              <input id="phone" name="phone" value={formValues.phone} onChange={handleChange} placeholder="+33 6 00 00 00 00" />
            </div>
            <div className="profile-form-field">
              <label htmlFor="location">Localisation</label>
              <input id="location" name="location" value={formValues.location} onChange={handleChange} placeholder="Ex : Lyon" />
            </div>
            <div className="profile-form-field">
              <label htmlFor="availability">Disponibilité</label>
              <input
                id="availability"
                name="availability"
                value={formValues.availability}
                onChange={handleChange}
                placeholder="Ex : Immédiate, 2 semaines"
              />
            </div>
          </div>
          <div className="profile-form-grid">
            <div className="profile-form-field">
              <label htmlFor="experience">Expérience clé</label>
              <input
                id="experience"
                name="experience"
                value={formValues.experience}
                onChange={handleChange}
                placeholder="Ex : 5 ans en React, 2 ans en design system"
              />
            </div>
            <div className="profile-form-field">
              <label htmlFor="skills">Compétences (séparées par des virgules)</label>
              <input
                id="skills"
                name="skills"
                value={formValues.skills}
                onChange={handleChange}
                placeholder="React, TypeScript, UX"
              />
            </div>
            <div className="profile-form-field">
              <label htmlFor="portfolio">Portfolio</label>
              <input
                id="portfolio"
                name="portfolio"
                value={formValues.portfolio}
                onChange={handleChange}
                placeholder="https://"
              />
            </div>
            <div className="profile-form-field">
              <label htmlFor="linkedin">LinkedIn</label>
              <input
                id="linkedin"
                name="linkedin"
                value={formValues.linkedin}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
          </div>
          <div className="profile-form-field full-width">
            <label htmlFor="bio">Présentation</label>
            <textarea
              id="bio"
              name="bio"
              value={formValues.bio}
              onChange={handleChange}
              rows={4}
              placeholder="Décrivez votre parcours, vos motivations et ce que vous recherchez."
            />
          </div>
          {statusMessage && <p className="profile-form-status">{statusMessage}</p>}
          <div className="profile-form-actions">
            <button className="primary-btn" type="submit" disabled={isSaving}>
              {isSaving ? "Mise à jour..." : "Enregistrer les modifications"}
            </button>
            <button className="primary-btn ghost" type="button" onClick={() => nav("/profil")}>
              Ouvrir mon profil public
            </button>
          </div>
        </form>
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
      </section>
    </CandidateLayout>
  );
}
