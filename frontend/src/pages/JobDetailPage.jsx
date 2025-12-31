import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/job-detail.css";

export default function JobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;
  const [job, setJob] = useState(null);
  const [similarJobs, setSimilarJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const toArray = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === "string") {
      return value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  };

  const toNumber = (value) => {
    if (value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const normalizeSimilarJob = (apiJob) => ({
    id: apiJob?.id || apiJob?._id || apiJob?.jobId || "",
    title: apiJob?.title || apiJob?.jobTitle || "Offre",
    companyName:
      apiJob?.company?.name || apiJob?.companyName || apiJob?.employerName || "",
    location:
      apiJob?.location ||
      [apiJob?.city, apiJob?.area].filter(Boolean).join(", "),
    workMode: apiJob?.workMode || apiJob?.remoteType || apiJob?.mode || "",
    contractType: apiJob?.contractType || apiJob?.type || "",
    salaryMin: toNumber(apiJob?.salaryMin ?? apiJob?.salary?.min) ?? 0,
    salaryMax: toNumber(apiJob?.salaryMax ?? apiJob?.salary?.max) ?? 0,
  });

  const normalizeJob = (apiJob) => {
    const location =
      apiJob?.location || [apiJob?.city, apiJob?.area].filter(Boolean).join(", ");
    return {
      id: apiJob?.id || apiJob?._id || jobId || "",
      title: apiJob?.title || apiJob?.jobTitle || "",
      companyName:
        apiJob?.company?.name || apiJob?.companyName || apiJob?.employerName || "",
      location,
      workMode: apiJob?.workMode || apiJob?.remoteType || apiJob?.mode || "",
      publishedAt: formatDate(apiJob?.createdAt || apiJob?.publishedAt),
      contractType: apiJob?.contractType || apiJob?.type || "",
      experienceLevel: apiJob?.experienceLevel || apiJob?.level || "",
      salaryMin: toNumber(apiJob?.salaryMin ?? apiJob?.salary?.min) ?? 0,
      salaryMax: toNumber(apiJob?.salaryMax ?? apiJob?.salary?.max) ?? 0,
      description: apiJob?.description || apiJob?.details || "",
      responsibilities: toArray(apiJob?.responsibilities || apiJob?.tasks),
      profile: toArray(apiJob?.profile || apiJob?.requirements),
      benefits: toArray(apiJob?.benefits || apiJob?.perks),
      recruitmentProcess: apiJob?.recruitmentProcess || apiJob?.process || "",
      deadline: formatDate(apiJob?.deadline || apiJob?.closingDate),
      recruiterEmail: apiJob?.recruiterEmail || apiJob?.contactEmail || "",
      similarJobs: toArray(apiJob?.similarJobs),
    };
  };

  const makeHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchJobById = async (id) => {
    const base = API_URL ? API_URL.replace(/\/$/, "") : "";
    const endpoints = [
      `${base}/jobs/${id}`,
      `${base}/api/jobs/${id}`,
      `${base}/JobRoutes/${id}`,
    ];

    let lastError;
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, { headers: makeHeaders() });
        if (response.ok) {
          const payload = await response.json();
          return payload?.job || payload?.data || payload;
        }
        if (response.status !== 404) {
          lastError = new Error(`Erreur ${response.status} sur ${endpoint}`);
        }
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error("Offre introuvable.");
  };

  const fetchSimilarJobs = async (apiJob) => {
    const base = API_URL ? API_URL.replace(/\/$/, "") : "";
    const endpoints = [];
    if (jobId) {
      endpoints.push(`${base}/jobs?similarTo=${jobId}`);
    }
    if (apiJob?.category) {
      endpoints.push(`${base}/jobs?category=${encodeURIComponent(apiJob.category)}`);
    }

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, { headers: makeHeaders() });
        if (!response.ok) continue;
        const payload = await response.json();
        const list = payload?.jobs || payload?.data || payload;
        if (Array.isArray(list)) {
          return list.map((item) => normalizeSimilarJob(item));
        }
      } catch (err) {
        continue;
      }
    }

    return [];
  };

  useEffect(() => {
    if (!jobId) return;
    let isActive = true;

    const loadJob = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiJob = await fetchJobById(jobId);
        if (!isActive) return;
        const normalizedJob = normalizeJob(apiJob);
        setJob(normalizedJob);
        const similar =
          normalizedJob.similarJobs.length > 0
            ? normalizedJob.similarJobs.map((item) => normalizeSimilarJob(item))
            : await fetchSimilarJobs(apiJob);
        if (isActive) {
          setSimilarJobs(similar);
        }
      } catch (err) {
        if (isActive) {
          setError("Impossible de charger l'offre pour le moment.");
          setJob(null);
          setSimilarJobs([]);
        }
      } finally {
        if (isActive) setLoading(false);
      }
    };

    loadJob();

    return () => {
      isActive = false;
    };
  }, [jobId]);

  const displayJob = useMemo(
    () => ({
      id: job?.id || jobId || "—",
      title: job?.title || (loading ? "Chargement..." : "Offre"),
      companyName: job?.companyName || (loading ? "Chargement..." : ""),
      location: job?.location || (loading ? "—" : ""),
      workMode: job?.workMode || (loading ? "—" : ""),
      publishedAt: job?.publishedAt || (loading ? "—" : ""),
      contractType: job?.contractType || (loading ? "—" : ""),
      experienceLevel: job?.experienceLevel || (loading ? "—" : ""),
      salaryMin: job?.salaryMin ?? 0,
      salaryMax: job?.salaryMax ?? 0,
      description: job?.description || (loading ? "Chargement..." : ""),
      responsibilities:
        job?.responsibilities?.length > 0
          ? job.responsibilities
          : loading
            ? ["Chargement..."]
            : [],
      profile:
        job?.profile?.length > 0
          ? job.profile
          : loading
            ? ["Chargement..."]
            : [],
      benefits:
        job?.benefits?.length > 0
          ? job.benefits
          : loading
            ? ["Chargement..."]
            : [],
      recruitmentProcess:
        job?.recruitmentProcess || (loading ? "Chargement..." : ""),
      deadline: job?.deadline || (loading ? "—" : ""),
      recruiterEmail: job?.recruiterEmail || (loading ? "—" : ""),
      similarJobs: similarJobs.length > 0 ? similarJobs : [],
    }),
    [job, jobId, loading, similarJobs]
  );

  const salaryLabel = `${displayJob.salaryMin.toLocaleString(
    "fr-FR"
  )}€ - ${displayJob.salaryMax.toLocaleString("fr-FR")}€`;

  const handleApplySubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const payload = {
      jobId: formData.get("jobId"),
      jobTitle: formData.get("jobTitle"),
      companyName: formData.get("companyName"),
      fullname: formData.get("candidate-name"),
      email: formData.get("candidate-email"),
      message: formData.get("candidate-message"),
    };

    console.info("Candidature prête à être envoyée :", payload);
  };

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
            <p className="job-detail-overline">Offre #{displayJob.id}</p>
            <h1>{displayJob.title}</h1>
            <div className="job-detail-company">
              <span className="job-detail-company-name">{displayJob.companyName}</span>
              <span className="job-detail-dot" aria-hidden="true">
                •
              </span>
              <span>{displayJob.location}</span>
            </div>
            <div className="job-detail-tags" role="list">
              <span role="listitem">{displayJob.contractType}</span>
              <span role="listitem">{displayJob.workMode}</span>
              <span role="listitem">{displayJob.experienceLevel}</span>
              <span role="listitem">Publié le {displayJob.publishedAt}</span>
            </div>
            {error ? (
              <div className="job-detail-error" role="alert">
                <p>{error}</p>
                <button
                  className="job-detail-btn ghost"
                  type="button"
                  onClick={() => navigate(-1)}
                >
                  Retour
                </button>
              </div>
            ) : null}
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
              <p>{displayJob.description}</p>
            </section>

            <section className="job-detail-section" aria-labelledby="responsibilities-title">
              <h2 id="responsibilities-title">Responsabilités</h2>
              <ul>
                {displayJob.responsibilities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="job-detail-section" aria-labelledby="profile-title">
              <h2 id="profile-title">Profil recherché</h2>
              <ul>
                {displayJob.profile.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="job-detail-section" aria-labelledby="benefits-title">
              <h2 id="benefits-title">Avantages</h2>
              <ul>
                {displayJob.benefits.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="job-detail-section" aria-labelledby="process-title">
              <h2 id="process-title">Process de recrutement</h2>
              <p>{displayJob.recruitmentProcess}</p>
            </section>

            <section className="job-detail-section" aria-labelledby="similar-title">
              <div className="job-detail-section-head">
                <h2 id="similar-title">Offres similaires</h2>
                <button className="job-detail-btn ghost" type="button">
                  Voir tout
                </button>
              </div>
              <div className="job-detail-similar">
                {displayJob.similarJobs.map((similarJob) => (
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
              <form
                className="job-detail-form"
                aria-label="Formulaire de candidature"
                onSubmit={handleApplySubmit}
              >
                <input type="hidden" name="jobId" value={displayJob.id} />
                <input type="hidden" name="jobTitle" value={displayJob.title} />
                <input type="hidden" name="companyName" value={displayJob.companyName} />
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
                  <strong>{displayJob.contractType}</strong>
                </li>
                <li>
                  <span>Expérience</span>
                  <strong>{displayJob.experienceLevel}</strong>
                </li>
                <li>
                  <span>Mode</span>
                  <strong>{displayJob.workMode}</strong>
                </li>
                <li>
                  <span>Clôture</span>
                  <strong>{displayJob.deadline}</strong>
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
              <p className="job-detail-card-value">{displayJob.companyName}</p>
              <p className="job-detail-card-sub">{displayJob.recruiterEmail}</p>
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
