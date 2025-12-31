import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import "../styles/job-detail.css";

const formatDate = (value) => {
  if (!value) return "Date inconnue";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const resolveCompanyName = (job) =>
  job?.recruiter?.companyName || job?.recruiter?.name || job?.companyName || "Entreprise inconnue";

export default function JobDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const API_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");

  const [job, setJob] = useState(() => location.state?.job || null);
  const [loading, setLoading] = useState(!location.state?.job);
  const [error, setError] = useState(null);
  const [similarJobs, setSimilarJobs] = useState([]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchJob = async () => {
      setError(null);
      if (!location.state?.job) {
        setLoading(true);
      }

      try {
        const res = await fetch(`${API_URL}/jobs/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error("Impossible de charger cette offre.");
        }

        const data = await res.json();
        const payload = data?.job || data?.data || data;

        if (!controller.signal.aborted) {
          setJob(payload);
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("JOB DETAIL ERROR:", err);
        setError(err.message || "Erreur lors du chargement de l'offre.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchJob();

    return () => controller.abort();
  }, [API_URL, id, token, location.state?.job]);

  useEffect(() => {
    if (!job?.contractType) {
      setSimilarJobs([]);
      return;
    }

    const controller = new AbortController();

    const fetchSimilarJobs = async () => {
      try {
        const params = new URLSearchParams();
        if (job.contractType) params.append("contract", job.contractType);

        const res = await fetch(`${API_URL}/jobs/search?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (!res.ok) return;

        const data = await res.json();
        const list = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.jobs)
            ? data.jobs
            : Array.isArray(data)
              ? data
              : [];

        if (!controller.signal.aborted) {
          setSimilarJobs(list.filter((item) => item._id !== job._id).slice(0, 3));
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("SIMILAR JOBS ERROR:", err);
        setSimilarJobs([]);
      }
    };

    fetchSimilarJobs();

    return () => controller.abort();
  }, [API_URL, job, token]);

  const jobDetails = useMemo(() => {
    if (!job) return null;

    const companyName = resolveCompanyName(job);
    const locationLabel = job.location || "Lieu non précisé";
    const contractType = job.contractType || "Contrat non précisé";
    const workMode = job.workMode || "Mode non précisé";
    const experienceLevel = job.experienceLevel || "Expérience non précisée";
    const salaryLabel = job.salaryRange || "Salaire non communiqué";
    const publishedAt = formatDate(job.createdAt);
    const recruiterEmail = job.recruiter?.email || job.recruiterEmail || "Email non communiqué";

    const tags = [contractType, workMode, experienceLevel, `Publié le ${publishedAt}`];

    return {
      companyName,
      locationLabel,
      contractType,
      workMode,
      experienceLevel,
      salaryLabel,
      publishedAt,
      recruiterEmail,
      tags,
    };
  }, [job]);

  if (loading) {
    return (
      <div className="job-detail-page" role="main">
        <div className="job-detail-wrapper">
          <div className="job-detail-loading">Chargement de l'offre...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="job-detail-page" role="main">
        <div className="job-detail-wrapper">
          <div className="job-detail-error">{error}</div>
        </div>
      </div>
    );
  }

  if (!job || !jobDetails) {
    return (
      <div className="job-detail-page" role="main">
        <div className="job-detail-wrapper">
          <div className="job-detail-error">Offre introuvable.</div>
        </div>
      </div>
    );
  }

  const responsibilities = Array.isArray(job.responsibilities) ? job.responsibilities : [];
  const profile = Array.isArray(job.profile) ? job.profile : [];
  const benefits = Array.isArray(job.benefits) ? job.benefits : [];

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
            <p className="job-detail-overline">Offre #{job._id}</p>
            <h1>{job.title}</h1>
            <div className="job-detail-company">
              <span className="job-detail-company-name">{jobDetails.companyName}</span>
              <span className="job-detail-dot" aria-hidden="true">
                •
              </span>
              <span>{jobDetails.locationLabel}</span>
            </div>
            <div className="job-detail-tags" role="list">
              {jobDetails.tags.map((tag) => (
                <span key={tag} role="listitem">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="job-detail-hero-cta" />
        </section>

        <div className="job-detail-grid">
          <main className="job-detail-content">
            <section className="job-detail-section" aria-labelledby="description-title">
              <h2 id="description-title">Description</h2>
              <p>{job.description || "Aucune description fournie."}</p>
            </section>

            <section className="job-detail-section" aria-labelledby="responsibilities-title">
              <h2 id="responsibilities-title">Responsabilités</h2>
              {responsibilities.length ? (
                <ul>
                  {responsibilities.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p>Les responsabilités détaillées ne sont pas précisées.</p>
              )}
            </section>

            <section className="job-detail-section" aria-labelledby="profile-title">
              <h2 id="profile-title">Profil recherché</h2>
              {profile.length ? (
                <ul>
                  {profile.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p>Le profil recherché n'est pas renseigné.</p>
              )}
            </section>

            <section className="job-detail-section" aria-labelledby="benefits-title">
              <h2 id="benefits-title">Avantages</h2>
              {benefits.length ? (
                <ul>
                  {benefits.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p>Les avantages ne sont pas communiqués pour cette offre.</p>
              )}
            </section>

            <section className="job-detail-section" aria-labelledby="process-title">
              <h2 id="process-title">Process de recrutement</h2>
              <p>{job.recruitmentProcess || "Process non communiqué."}</p>
            </section>

            <section className="job-detail-section" aria-labelledby="similar-title">
              <div className="job-detail-section-head">
                <h2 id="similar-title">Offres similaires</h2>
                <button className="job-detail-btn ghost" type="button">
                  Voir tout
                </button>
              </div>
              <div className="job-detail-similar">
                {similarJobs.length ? (
                  similarJobs.map((similarJob) => (
                    <article key={similarJob._id} className="job-detail-similar-card">
                      <div>
                        <p className="job-detail-similar-title">{similarJob.title}</p>
                        <p className="job-detail-similar-meta">
                          {resolveCompanyName(similarJob)} • {similarJob.location || "Lieu non précisé"}
                        </p>
                      </div>
                      <div className="job-detail-similar-tags">
                        <span>{similarJob.contractType || "Contrat non précisé"}</span>
                        <span>{similarJob.workMode || "Mode non précisé"}</span>
                        <span>{similarJob.salaryRange || "Salaire non communiqué"}</span>
                      </div>
                    </article>
                  ))
                ) : (
                  <p>Aucune offre similaire disponible pour le moment.</p>
                )}
              </div>
            </section>

          </main>

          <aside className="job-detail-sidebar" aria-label="Informations clés">
            <div className="job-detail-card">
              <p className="job-detail-card-label">Salaire</p>
              <p className="job-detail-card-value">{jobDetails.salaryLabel}</p>
              <p className="job-detail-card-sub">Selon expérience</p>
            </div>

            <div className="job-detail-card">
              <p className="job-detail-card-title">Infos clés</p>
              <ul className="job-detail-info">
                <li>
                  <span>Type de contrat</span>
                  <strong>{jobDetails.contractType}</strong>
                </li>
                <li>
                  <span>Expérience</span>
                  <strong>{jobDetails.experienceLevel}</strong>
                </li>
                <li>
                  <span>Mode</span>
                  <strong>{jobDetails.workMode}</strong>
                </li>
                <li>
                  <span>Publié</span>
                  <strong>{jobDetails.publishedAt}</strong>
                </li>
              </ul>
            </div>

            <div className="job-detail-card">
              <p className="job-detail-card-title">Contact recruteur</p>
              <p className="job-detail-card-value">{jobDetails.companyName}</p>
              <p className="job-detail-card-sub">{jobDetails.recruiterEmail}</p>
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
