import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "../styles/RecruiterDashboard.css";
import "../styles/job-detail.css";
import { createJobConversation } from "../api/jobChatApi";

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
  const nav = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");
  // L'utilisateur est stocké côté frontend dans localStorage ("user")
  const storedUser = localStorage.getItem("user");
  let user = null;
  if (storedUser) {
    try {
      user = JSON.parse(storedUser);
    } catch (err) {
      console.error("Impossible de lire l'utilisateur depuis le localStorage.", err);
      user = null;
    }
  }
  const locationJob = location.state?.job;

  const [job, setJob] = useState(() => locationJob || null);
  const [loading, setLoading] = useState(!locationJob);
  const [error, setError] = useState(null);
  const [similarJobs, setSimilarJobs] = useState([]);
  // États uniques pour gérer la candidature (source de vérité = hasApplied).
  const [hasApplied, setHasApplied] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [contactError, setContactError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchJob = async () => {
      setError(null);
      setLoading(true);
      setJob(null);

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

    if (locationJob) {
      setError(null);
      setJob(locationJob);
      setLoading(false);
      return () => controller.abort();
    }

    fetchJob();

    return () => controller.abort();
  }, [API_URL, id, token, locationJob]);

  useEffect(() => {
    if (!id) return;

    // Vérification unique du statut (pas de relance après soumission).
    let isMounted = true;
    const fetchApplicationStatus = async () => {
      if (!user || !token) {
        if (isMounted) {
          setHasApplied(false);
          setCheckingStatus(false);
        }
        return;
      }

      try {
        const res = await fetch(`${API_URL}/applications/status?jobId=${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) return;

        const data = await res.json();

        if (isMounted) {
          setHasApplied(Boolean(data?.hasApplied));
        }
      } catch (err) {
        console.error("APPLICATION STATUS ERROR:", err);
      } finally {
        if (isMounted) {
          setCheckingStatus(false);
        }
      }
    };

    fetchApplicationStatus();

    return () => {
      isMounted = false;
    };
  }, [id]);

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

  const handleContactRecruiter = async () => {
    setContactError(null);
    if (!user || user.role !== "candidate") {
      nav("/login");
      return;
    }

    if (!hasApplied) {
      setContactError("Vous devez d'abord postuler à cette offre.");
      return;
    }

    const recruiterId = job?.recruiter?._id || job?.recruiter;
    if (!recruiterId) {
      setContactError("Recruteur introuvable.");
      return;
    }

    try {
      let applicationId = null;
      let candidateId = user?._id;
      let resolvedRecruiterId = recruiterId;

      const res = await fetch(`${API_URL}/applications/my-applications`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (res.ok) {
        const data = await res.json();
        const apps = Array.isArray(data) ? data : data.applications || [];
        const match = apps.find((app) => String(app?.job?._id) === String(job?._id));
        applicationId = match?._id || null;
        candidateId = match?.candidate?._id || candidateId;
        resolvedRecruiterId =
          match?.job?.recruiter?._id || match?.job?.recruiter || resolvedRecruiterId;
      }

      if (!applicationId) {
        setContactError("Aucune candidature liée à cette offre.");
        return;
      }

      const conversation = await createJobConversation({
        participants: [user._id, recruiterId],
        jobId: job._id,
        applicationId,
        candidateId,
        recruiterId: resolvedRecruiterId,
      });

      nav(`/candidate/messages/${conversation._id}`, {
        state: {
          jobId: job._id,
          jobTitle: job.title,
          otherParticipant: job.recruiter,
          applicationId,
          candidateId,
          recruiterId: resolvedRecruiterId,
        },
      });
    } catch (err) {
      setContactError(err.message || "Impossible d'ouvrir la conversation.");
    }
  };

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
  const isRecruiter = user?.role === "recruiter";
  const isJobOwner = job?.recruiter?._id === user?._id;
  const canApply = user && !isRecruiter && !isJobOwner;

  // Libellé et état unique du bouton (anti-tremblement).
  let applyLabel = "Postuler maintenant";
  let applyDisabled = false;

  if (checkingStatus) {
    applyLabel = "Vérification…";
    applyDisabled = true;
  } else if (hasApplied) {
    applyLabel = "Déjà postulé ✔";
    applyDisabled = true;
  } else if (isSubmitting) {
    applyLabel = "Envoi en cours…";
    applyDisabled = true;
  }

  const handleApply = async () => {
    if (hasApplied || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitSuccess(false);
    setSubmitError(null);

    try {
      const res = await fetch(`${API_URL}/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ jobId: id }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.message || "Erreur lors de la candidature");
      }

      // ✅ SUCCÈS DÉFINITIF
      setHasApplied(true);
      setSubmitSuccess(true);
    } catch (err) {
      console.error("APPLICATION ERROR:", err);
      setSubmitError(err.message || "Erreur lors de l'envoi de la candidature.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="job-detail-page" role="main">
      <div className="job-detail-wrapper">
        <section className="hero job-detail-hero" aria-label="Résumé de l'offre">
          <div className="hero__info">
            <span className="hero__badge">Offre en détail</span>
            <h1 className="job-detail-title">{job.title}</h1>
            <p className="hero__subtitle">
              {jobDetails.companyName} • {jobDetails.locationLabel}
            </p>
            <div className="job-detail-tags" role="list">
              {jobDetails.tags.map((tag) => (
                <span key={tag} role="listitem">
                  {tag}
                </span>
              ))}
            </div>
            <p className="hero__hint">Offre publiée le {jobDetails.publishedAt}</p>
            <div className="hero__actions">
              {canApply && (
                <button
                  className="primary-btn"
                  type="button"
                  onClick={handleApply}
                  disabled={applyDisabled}
                >
                  {applyLabel}
                </button>
              )}
              <button className="primary-btn ghost" type="button">
                Contacter le recruteur
              </button>
            </div>
            {canApply && (submitSuccess || submitError) && (
              <div className="job-detail-feedback" role="status">
                {submitSuccess && (
                  <p className="job-detail-alert job-detail-alert--success">
                    Votre candidature a été envoyée avec succès
                  </p>
                )}
                {submitError && (
                  <p className="job-detail-alert job-detail-alert--error">{submitError}</p>
                )}
              </div>
            )}
          </div>
          <div className="hero__highlights">
            <div className="hero-chip">
              <span>Salaire</span>
              <strong>{jobDetails.salaryLabel}</strong>
            </div>
            <div className="hero-chip">
              <span>Contrat</span>
              <strong>{jobDetails.contractType}</strong>
            </div>
          </div>
        </section>

        <section className="stats-grid" aria-label="Infos principales">
          <div className="stat-card">
            <p className="stat-label">Mode de travail</p>
            <p className="stat-value text-emerald">{jobDetails.workMode}</p>
            <p className="stat-hint">Organisation flexible</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Expérience attendue</p>
            <p className="stat-value text-indigo">{jobDetails.experienceLevel}</p>
            <p className="stat-hint">Niveau recommandé</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Publié le</p>
            <p className="stat-value text-orange">{jobDetails.publishedAt}</p>
            <p className="stat-hint">Dernière mise à jour</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Contact</p>
            <p className="stat-value stat-email text-purple">{jobDetails.recruiterEmail}</p>
            <p className="stat-hint">Réponse rapide recommandée</p>
          </div>
        </section>

        <div className="grid-two">
          <section className="card job-detail-card" aria-labelledby="description-title">
            <div className="card-header">
              <div>
                <p className="eyebrow">Présentation</p>
                <h3 id="description-title">Description du poste</h3>
              </div>
            </div>
            <p className="job-detail-text">{job.description || "Aucune description fournie."}</p>

            <div className="job-detail-split">
              <div>
                <h4 id="responsibilities-title">Responsabilités</h4>
                {responsibilities.length ? (
                  <ul>
                    {responsibilities.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="job-detail-muted">Les responsabilités détaillées ne sont pas précisées.</p>
                )}
              </div>
              <div>
                <h4 id="profile-title">Profil recherché</h4>
                {profile.length ? (
                  <ul>
                    {profile.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="job-detail-muted">Le profil recherché n'est pas renseigné.</p>
                )}
              </div>
            </div>
          </section>

          <aside className="card job-detail-card" aria-label="Contact recruteur">
            <div className="card-header">
              <div>
                <p className="eyebrow">Recruteur</p>
                <h3>Contact recruteur</h3>
              </div>
            </div>
            <div className="job-detail-contact">
              <div>
                <p className="job-detail-contact-title">{jobDetails.companyName}</p>
                <p className="job-detail-muted">{jobDetails.recruiterEmail}</p>
              </div>
              <button
                className="primary-btn ghost"
                type="button"
                disabled={checkingStatus || !hasApplied}
                onClick={handleContactRecruiter}
              >
                Contacter le recruteur
              </button>
              {contactError && (
                <p className="job-detail-muted" style={{ marginTop: 8 }}>
                  {contactError}
                </p>
              )}
            </div>
            <div className="job-detail-info">
              <div>
                <span>Type de contrat</span>
                <strong>{jobDetails.contractType}</strong>
              </div>
              <div>
                <span>Expérience</span>
                <strong>{jobDetails.experienceLevel}</strong>
              </div>
              <div>
                <span>Mode</span>
                <strong>{jobDetails.workMode}</strong>
              </div>
              <div>
                <span>Publié</span>
                <strong>{jobDetails.publishedAt}</strong>
              </div>
            </div>
          </aside>
        </div>

        <div className="grid-two">
          <section className="card job-detail-card" aria-labelledby="benefits-title">
            <div className="card-header">
              <div>
                <p className="eyebrow">Avantages</p>
                <h3 id="benefits-title">Ce que propose l'entreprise</h3>
              </div>
            </div>
            {benefits.length ? (
              <ul>
                {benefits.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="job-detail-muted">Les avantages ne sont pas communiqués pour cette offre.</p>
            )}

            <div className="job-detail-divider" />

            <h4 id="process-title">Process de recrutement</h4>
            <p className="job-detail-text">{job.recruitmentProcess || "Process non communiqué."}</p>
          </section>

          <section className="card job-detail-card" aria-labelledby="similar-title">
            <div className="card-header">
              <div>
                <p className="eyebrow">Suggestions</p>
                <h3 id="similar-title">Offres similaires</h3>
              </div>
              <button className="ghost-link" type="button">
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
                <p className="job-detail-muted">Aucune offre similaire disponible pour le moment.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
