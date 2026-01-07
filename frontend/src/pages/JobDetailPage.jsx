import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { createJobConversation } from "../api/jobChatApi";
import { sendMessagePayload } from "../api/messagesApi";
import "../styles/RecruiterDashboard.css";
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
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");

  const [job, setJob] = useState(() => location.state?.job || null);
  const [loading, setLoading] = useState(!location.state?.job);
  const [error, setError] = useState(null);
  const [similarJobs, setSimilarJobs] = useState([]);
  const [applyMessage, setApplyMessage] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [contactFields, setContactFields] = useState({
    recruiterName: "",
    jobTitle: "",
    keySkill: "",
    candidateName: "",
  });
  const [contactMessage, setContactMessage] = useState("");
  const [contactMessageTouched, setContactMessageTouched] = useState(false);
  const [contactStatus, setContactStatus] = useState(null);
  const [isSendingContact, setIsSendingContact] = useState(false);
  const contactSectionRef = useRef(null);
  const contactSkillRef = useRef(null);

  const currentUser = useMemo(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch (err) {
      console.error("USER_PARSE_ERROR", err);
      return null;
    }
  }, []);
  const currentRole = (currentUser?.role || "").toLowerCase();
  const isCandidate = currentRole === "candidate" || currentRole === "candidat";

  const handleBack = useCallback(() => {
    if (location.state?.from === "/emplois") {
      navigate("/emplois");
      return;
    }

    if (window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      navigate("/emplois");
    }
  }, [location.state?.from, navigate]);

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

  useEffect(() => {
    if (!token) {
      setHasApplied(false);
      return;
    }

    const controller = new AbortController();

    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/applications/status?jobId=${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (!res.ok) return;
        const data = await res.json();
        const already = Boolean(data?.hasApplied);
        setHasApplied(already);
        if (already) setApplyMessage("Vous avez déjà postulé");
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("APPLICATION_STATUS_ERROR", err);
      }
    };

    fetchStatus();

    return () => controller.abort();
  }, [API_URL, id, token]);

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

  const recruiter = job?.recruiter || null;
  const recruiterId = recruiter?._id || recruiter;
  const recruiterName =
    recruiter?.name || recruiter?.companyName || jobDetails?.companyName || "";
  const candidateName =
    currentUser?.name ||
    currentUser?.fullName ||
    currentUser?.candidateProfile?.name ||
    currentUser?.professionalProfile?.name ||
    "";

  const contactEnabled = Boolean(token && isCandidate && hasApplied && recruiterId);

  const buildContactMessage = useCallback(
    ({ recruiterName: name, jobTitle, keySkill, candidateName: senderName }) => {
      const resolvedRecruiter = name || "[Nom]";
      const resolvedJobTitle = jobTitle || "[Intitulé du poste]";
      const resolvedSkill = keySkill || "[1 compétence clé]";
      const resolvedCandidate = senderName || "[Prénom Nom]";
      return `Bonjour ${resolvedRecruiter},\n` +
        `\n` +
        `J’ai postulé à votre offre ${resolvedJobTitle} et je souhaitais vous contacter brièvement pour confirmer mon intérêt.\n` +
        `Mon profil correspond notamment sur ${resolvedSkill}.\n` +
        `Merci pour votre temps,\n` +
        `${resolvedCandidate}`;
    },
    []
  );

  useEffect(() => {
    setContactFields((prev) => ({
      recruiterName: recruiterName || prev.recruiterName,
      jobTitle: job?.title || prev.jobTitle,
      keySkill: prev.keySkill || "",
      candidateName: candidateName || prev.candidateName,
    }));
  }, [recruiterName, job?.title, candidateName]);

  useEffect(() => {
    if (contactMessageTouched) return;
    setContactMessage(buildContactMessage(contactFields));
  }, [buildContactMessage, contactFields, contactMessageTouched]);

  const handleApply = useCallback(async () => {
    console.info("[JobDetail] Bouton Postuler cliqué", { jobId: id, title: job?.title });
    setApplyMessage("");

    if (!jobDetails) {
      setApplyMessage("Offre non disponible pour le moment.");
      return;
    }

    if (!token) {
      setApplyMessage("Veuillez vous connecter pour poursuivre votre candidature.");
      navigate("/login", {
        replace: false,
        state: {
          from: location.pathname + location.search,
          message: "Connectez-vous pour postuler à cette offre.",
        },
      });
      return;
    }

    if (hasApplied) {
      setApplyMessage("Vous avez déjà postulé à cette offre.");
      return;
    }

    const applicantName =
      currentUser?.name || currentUser?.fullName || currentUser?.companyName || "Candidat EmploisFacile";
    const applicantEmail =
      currentUser?.email ||
      currentUser?.professionalProfile?.email ||
      currentUser?.candidateProfile?.email ||
      null;

    if (!applicantEmail) {
      setApplyMessage("Votre profil ne contient pas d'email valide pour envoyer la candidature.");
      return;
    }

    const defaultMessage = `Bonjour,\n\nJe souhaite postuler au poste ${job?.title || ""} chez ${
      jobDetails.companyName || resolveCompanyName(job)
    }.\n\n${applicantName}\n${applicantEmail}`;

    try {
      setIsApplying(true);
      setApplyMessage("Envoi de votre candidature en cours...");

      const res = await fetch(`${API_URL}/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jobId: id,
          message: defaultMessage,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Impossible d'envoyer votre candidature.");
      }

      setHasApplied(true);
      setApplyMessage("Candidature envoyée");
    } catch (err) {
      console.error("APPLY_ERROR", err);
      const duplicate = err.message?.toLowerCase().includes("déjà postulé") || err.status === 400;
      if (duplicate) {
        setHasApplied(true);
        setApplyMessage("Vous avez déjà postulé à cette offre.");
      } else {
        setApplyMessage(err.message || "Erreur lors de l'envoi de votre candidature.");
      }
    } finally {
      setIsApplying(false);
    }
  }, [
    API_URL,
    currentUser,
    id,
    job,
    job?.title,
    jobDetails,
    location.pathname,
    location.search,
    navigate,
    token,
    hasApplied,
  ]);

  const handleContactFieldChange = useCallback((field, value) => {
    setContactFields((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleContactScroll = useCallback(() => {
    if (contactSectionRef.current) {
      contactSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (contactSkillRef.current) {
      contactSkillRef.current.focus();
    }
  }, []);

  const handleContactSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      setContactStatus(null);

      if (!contactEnabled) {
        setContactStatus({
          type: "error",
          message:
            "Veuillez finaliser votre candidature pour activer le contact recruteur.",
        });
        return;
      }

      if (!contactFields.keySkill.trim()) {
        setContactStatus({
          type: "error",
          message: "Ajoutez une compétence clé pour personnaliser votre message.",
        });
        return;
      }

      const trimmedMessage = contactMessage.trim();
      if (!trimmedMessage) {
        setContactStatus({
          type: "error",
          message: "Le message ne peut pas être vide.",
        });
        return;
      }

      try {
        setIsSendingContact(true);
        const conversation = await createJobConversation({
          participants: [currentUser?._id, recruiterId],
          jobId: id,
        });
        const { ok, data } = await sendMessagePayload({
          receiver: recruiterId,
          content: trimmedMessage,
          jobId: id,
          conversationId: conversation?._id,
        });

        if (!ok) {
          throw new Error(data?.message || data?.error || "Impossible d'envoyer le message.");
        }

        setContactStatus({
          type: "success",
          message: data?.message || "Message envoyé au recruteur.",
        });

        const basePath = currentRole === "recruiter" ? "/recruiter/messages" : "/candidate/messages";
        navigate(`${basePath}/${conversation?._id || recruiterId}`, {
          state: {
            jobId: id,
            jobTitle: job?.title,
            otherParticipant: recruiter,
          },
        });
      } catch (err) {
        setContactStatus({
          type: "error",
          message: err.message || "Erreur lors de l'envoi du message.",
        });
      } finally {
        setIsSendingContact(false);
      }
    },
    [
      contactEnabled,
      contactFields.keySkill,
      contactMessage,
      currentRole,
      currentUser?._id,
      id,
      job?.title,
      navigate,
      recruiter,
      recruiterId,
    ]
  );

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
        <div className="job-detail-header">
          <button className="ghost-link job-detail-back" type="button" onClick={handleBack}>
            ← Retour aux offres
          </button>
          <div className="job-detail-breadcrumbs" aria-label="Fil d'ariane">
            <span>Emplois</span>
            <span>›</span>
            <span>Détail</span>
          </div>
        </div>

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
              <button className="primary-btn" type="button" onClick={handleApply} disabled={isApplying || hasApplied}>
                {hasApplied ? "Vous avez déjà postulé" : isApplying ? "Envoi..." : "Postuler maintenant"}
              </button>
              <button className="primary-btn ghost" type="button" onClick={handleContactScroll}>
                Contacter le recruteur
              </button>
            </div>
            {applyMessage ? (
              <p className="hero__hint" role="status">
                {applyMessage}
              </p>
            ) : null}
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

          <aside className="card job-detail-card" aria-label="Contact recruteur" ref={contactSectionRef}>
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
                onClick={handleContactScroll}
                disabled={!contactEnabled}
              >
                Envoyer un message
              </button>
            </div>
            <form className="job-detail-contact-form" onSubmit={handleContactSubmit}>
              <div className="job-detail-contact-grid">
                <label>
                  Nom du recruteur
                  <input
                    type="text"
                    value={contactFields.recruiterName}
                    onChange={(event) =>
                      handleContactFieldChange("recruiterName", event.target.value)
                    }
                    disabled={!contactEnabled}
                  />
                </label>
                <label>
                  Intitulé du poste
                  <input
                    type="text"
                    value={contactFields.jobTitle}
                    onChange={(event) =>
                      handleContactFieldChange("jobTitle", event.target.value)
                    }
                    disabled={!contactEnabled}
                  />
                </label>
                <label>
                  Compétence clé
                  <input
                    type="text"
                    value={contactFields.keySkill}
                    onChange={(event) =>
                      handleContactFieldChange("keySkill", event.target.value)
                    }
                    disabled={!contactEnabled}
                    required={contactEnabled}
                    ref={contactSkillRef}
                    placeholder="Ex. gestion de projet"
                  />
                </label>
                <label>
                  Votre nom
                  <input
                    type="text"
                    value={contactFields.candidateName}
                    onChange={(event) =>
                      handleContactFieldChange("candidateName", event.target.value)
                    }
                    disabled={!contactEnabled}
                    required={contactEnabled}
                    placeholder="Prénom Nom"
                  />
                </label>
              </div>
              <label className="job-detail-contact-message">
                Message au recruteur
                <textarea
                  rows={6}
                  value={contactMessage}
                  onChange={(event) => {
                    setContactMessage(event.target.value);
                    setContactMessageTouched(true);
                  }}
                  disabled={!contactEnabled}
                />
                <span className="job-detail-contact-hint">
                  Le message est pré-rempli pour confirmer votre intérêt, vous pouvez le modifier.
                </span>
              </label>
              {!contactEnabled && (
                <p className="job-detail-contact-hint">
                  Postulez à l'offre pour activer le formulaire de contact.
                </p>
              )}
              {contactStatus && (
                <p className={`job-detail-contact-status ${contactStatus.type}`}>
                  {contactStatus.message}
                </p>
              )}
              <div className="job-detail-contact-actions">
                <button className="primary-btn" type="submit" disabled={!contactEnabled || isSendingContact}>
                  {isSendingContact ? "Envoi en cours..." : "Envoyer le message"}
                </button>
              </div>
            </form>
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
