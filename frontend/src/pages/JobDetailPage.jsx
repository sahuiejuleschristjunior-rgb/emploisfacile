import { useMemo } from "react";
import "../styles/job-detail.css";

export default function JobDetailPage() {
  const job = useMemo(
    () => ({
      id: "JOB-2024-0198",
      title: "Product Designer Senior",
      companyName: "Nova Studio",
      location: "Lyon, France",
      workMode: "Hybride",
      publishedAt: "2024-05-12",
      contractType: "CDI",
      experienceLevel: "5+ ans",
      salaryMin: 52000,
      salaryMax: 68000,
      description:
        "Nous recherchons un·e Product Designer pour concevoir des expériences élégantes et accessibles pour notre suite SaaS. Vous travaillerez en étroite collaboration avec les équipes produit et engineering pour livrer des interfaces claires, impactantes et centrées utilisateur.",
      responsibilities: [
        "Concevoir des parcours utilisateurs de bout en bout.",
        "Créer des wireframes, prototypes et UI détaillées.",
        "Animer des ateliers de co-conception avec les parties prenantes.",
        "Collaborer avec les développeurs pour garantir la qualité UI.",
      ],
      profile: [
        "5 ans d'expérience minimum sur un poste similaire.",
        "Excellente maîtrise de Figma et des design systems.",
        "Bonne culture produit et sens des priorités.",
        "Approche data-driven et sens de l'empathie.",
      ],
      benefits: [
        "Mutuelle premium et carte déjeuner.",
        "Budget annuel formation et conférences.",
        "2 jours de télétravail/semaine.",
        "Participation et plan d'épargne entreprise.",
      ],
      recruitmentProcess:
        "Entretien RH, échange métier avec le Lead Design, puis atelier collaboratif avec l'équipe produit.",
      deadline: "2024-06-30",
      recruiterEmail: "recrutement@novastudio.fr",
      similarJobs: [
        {
          id: "JOB-2024-0201",
          title: "UX/UI Designer",
          companyName: "PixelCraft",
          location: "Paris",
          workMode: "Remote",
          contractType: "CDI",
          salaryMin: 45000,
          salaryMax: 60000,
        },
        {
          id: "JOB-2024-0204",
          title: "Product Designer",
          companyName: "Flowly",
          location: "Marseille",
          workMode: "Hybride",
          contractType: "CDD",
          salaryMin: 42000,
          salaryMax: 52000,
        },
        {
          id: "JOB-2024-0208",
          title: "Design System Specialist",
          companyName: "Orbit Labs",
          location: "Bordeaux",
          workMode: "On-site",
          contractType: "CDI",
          salaryMin: 50000,
          salaryMax: 65000,
        },
      ],
    }),
    []
  );

  const salaryLabel = `${job.salaryMin.toLocaleString("fr-FR")}€ - ${job.salaryMax.toLocaleString(
    "fr-FR"
  )}€`;

  return (
    <div className="job-detail-page" role="main">
      <div className="job-detail-wrapper">
        <header className="job-detail-header" aria-label="Fil d'Ariane">
          <nav className="job-detail-breadcrumbs">
            <span>Accueil</span>
            <span aria-hidden="true">/</span>
            <span>Emplois</span>
            <span aria-hidden="true">/</span>
            <span>Détail</span>
          </nav>
          <div className="job-detail-header-actions">
            <button className="job-detail-btn ghost" type="button">
              Sauvegarder
            </button>
            <button className="job-detail-btn ghost" type="button">
              Partager
            </button>
          </div>
        </header>

        <section className="job-detail-hero" aria-label="Résumé de l'offre">
          <div className="job-detail-hero-main">
            <p className="job-detail-overline">Offre #{job.id}</p>
            <h1>{job.title}</h1>
            <div className="job-detail-company">
              <span className="job-detail-company-name">{job.companyName}</span>
              <span className="job-detail-dot" aria-hidden="true">
                •
              </span>
              <span>{job.location}</span>
            </div>
            <div className="job-detail-tags" role="list">
              <span role="listitem">{job.contractType}</span>
              <span role="listitem">{job.workMode}</span>
              <span role="listitem">{job.experienceLevel}</span>
              <span role="listitem">Publié le {job.publishedAt}</span>
            </div>
          </div>
          <div className="job-detail-hero-cta">
            <button className="job-detail-btn primary" type="button">
              Postuler maintenant
            </button>
            <button className="job-detail-btn secondary" type="button">
              Sauvegarder l'offre
            </button>
          </div>
        </section>

        <div className="job-detail-grid">
          <main className="job-detail-content">
            <section className="job-detail-section" aria-labelledby="description-title">
              <h2 id="description-title">Description</h2>
              <p>{job.description}</p>
            </section>

            <section className="job-detail-section" aria-labelledby="responsibilities-title">
              <h2 id="responsibilities-title">Responsabilités</h2>
              <ul>
                {job.responsibilities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="job-detail-section" aria-labelledby="profile-title">
              <h2 id="profile-title">Profil recherché</h2>
              <ul>
                {job.profile.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="job-detail-section" aria-labelledby="benefits-title">
              <h2 id="benefits-title">Avantages</h2>
              <ul>
                {job.benefits.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="job-detail-section" aria-labelledby="process-title">
              <h2 id="process-title">Process de recrutement</h2>
              <p>{job.recruitmentProcess}</p>
            </section>

            <section className="job-detail-section" aria-labelledby="similar-title">
              <div className="job-detail-section-head">
                <h2 id="similar-title">Offres similaires</h2>
                <button className="job-detail-btn ghost" type="button">
                  Voir tout
                </button>
              </div>
              <div className="job-detail-similar">
                {job.similarJobs.map((similarJob) => (
                  <article key={similarJob.id} className="job-detail-similar-card">
                    <div>
                      <p className="job-detail-similar-title">{similarJob.title}</p>
                      <p className="job-detail-similar-meta">
                        {similarJob.companyName} • {similarJob.location}
                      </p>
                    </div>
                    <div className="job-detail-similar-tags">
                      <span>{similarJob.contractType}</span>
                      <span>{similarJob.workMode}</span>
                      <span>
                        {similarJob.salaryMin.toLocaleString("fr-FR")}€ -{" "}
                        {similarJob.salaryMax.toLocaleString("fr-FR")}€
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="job-detail-section" aria-labelledby="apply-title">
              <h2 id="apply-title">Postuler</h2>
              <form className="job-detail-form" aria-label="Formulaire de candidature">
                <div className="job-detail-form-row">
                  <label htmlFor="candidate-name">Nom complet</label>
                  <input
                    id="candidate-name"
                    name="candidate-name"
                    type="text"
                    placeholder="Votre nom"
                  />
                </div>
                <div className="job-detail-form-row">
                  <label htmlFor="candidate-email">Email</label>
                  <input
                    id="candidate-email"
                    name="candidate-email"
                    type="email"
                    placeholder="prenom@email.com"
                  />
                </div>
                <div className="job-detail-form-row">
                  <label htmlFor="candidate-message">Message</label>
                  <textarea
                    id="candidate-message"
                    name="candidate-message"
                    rows="4"
                    placeholder="Parlez-nous de vous"
                  />
                </div>
                <button className="job-detail-btn primary" type="submit">
                  Envoyer ma candidature
                </button>
              </form>
            </section>
          </main>

          <aside className="job-detail-sidebar" aria-label="Informations clés">
            <div className="job-detail-card">
              <p className="job-detail-card-label">Salaire annuel</p>
              <p className="job-detail-card-value">{salaryLabel}</p>
              <p className="job-detail-card-sub">Brut • Selon expérience</p>
            </div>

            <div className="job-detail-card">
              <p className="job-detail-card-title">Infos clés</p>
              <ul className="job-detail-info">
                <li>
                  <span>Type de contrat</span>
                  <strong>{job.contractType}</strong>
                </li>
                <li>
                  <span>Expérience</span>
                  <strong>{job.experienceLevel}</strong>
                </li>
                <li>
                  <span>Mode</span>
                  <strong>{job.workMode}</strong>
                </li>
                <li>
                  <span>Clôture</span>
                  <strong>{job.deadline}</strong>
                </li>
              </ul>
            </div>

            <div className="job-detail-card job-detail-actions">
              <button className="job-detail-btn primary" type="button">
                Postuler
              </button>
              <button className="job-detail-btn secondary" type="button">
                Sauvegarder
              </button>
              <button className="job-detail-btn ghost" type="button">
                Partager
              </button>
            </div>

            <div className="job-detail-card">
              <p className="job-detail-card-title">Contact recruteur</p>
              <p className="job-detail-card-value">{job.companyName}</p>
              <p className="job-detail-card-sub">{job.recruiterEmail}</p>
              <button className="job-detail-btn ghost" type="button">
                Envoyer un message
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
