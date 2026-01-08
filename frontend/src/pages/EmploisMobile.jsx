import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getImageUrl } from "../utils/imageUtils";
import useJobSearch from "../hooks/useJobSearch";
import "../styles/EmploisMobile.css";

const MOBILE_DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default function EmploisMobile() {
  const {
    jobs,
    loading,
    error,
  } = useJobSearch();

  const navigate = useNavigate();

  const getRecruiterName = (job) =>
    job.recruiter?.companyName || job.recruiter?.name || "Entreprise inconnue";

  const getLocation = (job) => job.location || job.city || "Lieu non précisé";
  const getContract = (job) => job.contractType || "Contrat non précisé";
  const getMode = (job) => job.workMode || job.mode || "Mode non précisé";
  const getDescription = (job) =>
    job.description || job.summary || job.mission || "Description non précisée.";

  const getJobDate = (job) => {
    const rawDate = job.date || job.createdAt || job.updatedAt;
    if (!rawDate) return null;

    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return null;
    return MOBILE_DATE_FORMAT.format(parsed);
  };

  const visibleJobs = useMemo(() => jobs, [jobs]);

  return (
    <div className="emplois-mobile page--jobs">
      <header className="emplois-mobile__header">
        <div className="emplois-mobile__header-title">
          <h1>Offres d&apos;emploi</h1>
          <span className="emplois-mobile__count">{jobs.length} offres</span>
        </div>
      </header>

      <section className="emplois-mobile__results" aria-live="polite">
        {loading && <div className="emplois-mobile__state">Chargement des offres...</div>}
        {error && <div className="emplois-mobile__state emplois-mobile__state--error">{error}</div>}
        {!loading && !error && jobs.length === 0 && (
          <div className="emplois-mobile__state">Aucune offre ne correspond à votre recherche.</div>
        )}

        <div className="emplois-mobile__list">
          {visibleJobs.map((job) => {
            const companyName = getRecruiterName(job);
            const logoUrl = getImageUrl(job.recruiter?.avatar);
            const jobDate = getJobDate(job);

            return (
              <article
                key={job._id}
                className="emplois-mobile__card"
                onClick={() =>
                  navigate(`/emplois/${job._id}`, {
                    state: { job, from: "/emplois" },
                  })
                }
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    navigate(`/emplois/${job._id}`, {
                      state: { job, from: "/emplois" },
                    });
                  }
                }}
              >
                <div className="emplois-mobile__card-head">
                  <div className="emplois-mobile__logo">
                    {logoUrl ? (
                      <img src={logoUrl} alt={`Logo ${companyName}`} />
                    ) : (
                      <span>{companyName.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="emplois-mobile__card-title">
                    <div className="emplois-mobile__company-row">
                      <span className="emplois-mobile__company">{companyName}</span>
                      {jobDate && <span className="emplois-mobile__date">{jobDate}</span>}
                    </div>
                    <h2>{job.title}</h2>
                  </div>
                </div>

                <p className="emplois-mobile__description">{getDescription(job)}</p>

                <div className="emplois-mobile__meta">
                  <span>{getContract(job)}</span>
                  <span>{getMode(job)}</span>
                  <span>{getLocation(job)}</span>
                </div>

                <button
                  type="button"
                  className="emplois-mobile__cta"
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/emplois/${job._id}`, {
                      state: { job, from: "/emplois" },
                    });
                  }}
                >
                  Postuler
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
