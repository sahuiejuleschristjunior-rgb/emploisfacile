import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getImageUrl } from "../utils/imageUtils";
import "../styles/EmploisMobile.css";

const PAGE_SIZE = 6;
const MOBILE_DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default function EmploisMobile() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const token = localStorage.getItem("token");
  const API_URL = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  const searchAbortRef = useRef(null);

  const getRecruiterName = (job) =>
    job.recruiter?.companyName || job.recruiter?.name || "Entreprise inconnue";

  const getLocation = (job) => job.location || job.city || "Lieu non précisé";
  const getContract = (job) => job.contractType || "Contrat non précisé";

  const getJobDate = (job) => {
    const rawDate = job.date || job.createdAt || job.updatedAt;
    if (!rawDate) return null;

    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return null;
    return MOBILE_DATE_FORMAT.format(parsed);
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, jobs.length));
  };

  useEffect(() => {
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }

    const controller = new AbortController();
    searchAbortRef.current = controller;

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.append("q", searchQuery.trim());
        if (locationQuery.trim()) params.append("city", locationQuery.trim());

        const queryString = params.toString();
        const url = `${API_URL}/jobs/search${queryString ? `?${queryString}` : ""}`;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const res = await fetch(url, {
          headers,
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("Échec de la récupération des offres.");

        const data = await res.json();
        let jobList = [];

        if (Array.isArray(data?.data)) jobList = data.data;
        else if (Array.isArray(data?.jobs)) jobList = data.jobs;
        else if (Array.isArray(data)) jobList = data;

        if (!controller.signal.aborted) {
          setJobs(jobList);
          setVisibleCount(Math.min(PAGE_SIZE, jobList.length));
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("JOB FEED MOBILE ERROR:", err);
        setError(err.message || "Erreur lors de la récupération des offres.");
        setJobs([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [API_URL, token, searchQuery, locationQuery]);

  const visibleJobs = useMemo(() => jobs.slice(0, visibleCount), [jobs, visibleCount]);

  return (
    <div className="emplois-mobile">
      <header className="emplois-mobile__header">
        <div>
          <p className="emplois-mobile__eyebrow">EmploisFacile</p>
          <h1>Offres d&apos;emploi</h1>
          <p className="emplois-mobile__subtitle">
            Trouvez rapidement un poste grâce à la recherche mobile.
          </p>
        </div>
      </header>

      <section className="emplois-mobile__filters">
        <label className="emplois-mobile__field">
          <span>Recherche</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Métier, compétence, entreprise..."
          />
        </label>
        <label className="emplois-mobile__field">
          <span>Localisation</span>
          <input
            type="search"
            value={locationQuery}
            onChange={(event) => setLocationQuery(event.target.value)}
            placeholder="Ville, région..."
          />
        </label>
      </section>

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
                  <div>
                    <h2>{job.title}</h2>
                    <p className="emplois-mobile__company">{companyName}</p>
                  </div>
                </div>

                <div className="emplois-mobile__meta">
                  <span>{getLocation(job)}</span>
                  <span>{getContract(job)}</span>
                  {jobDate && <span>{jobDate}</span>}
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
                  Voir l&apos;offre
                </button>
              </article>
            );
          })}
        </div>

        {!loading && !error && visibleCount < jobs.length && (
          <button type="button" className="emplois-mobile__load" onClick={handleLoadMore}>
            Charger plus
          </button>
        )}
      </section>
    </div>
  );
}
