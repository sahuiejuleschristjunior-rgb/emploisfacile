import React, { useEffect, useMemo, useRef, useState } from "react";
import PostCard from "./PostCard";
import "../styles/JobFeed.css";

const DEFAULT_CITY_OPTIONS = ["Abidjan", "Cocody", "Plateau"];
const DEFAULT_MODE_OPTIONS = ["Remote", "Hybride", "Présentiel"];
const DEFAULT_CONTRACT_OPTIONS = ["CDI", "CDD", "Stage", "Freelance", "Alternance", "Temps Partiel"];

export default function JobFeed() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [contractFilter, setContractFilter] = useState("");
  const [modeFilter, setModeFilter] = useState("");

  const token = localStorage.getItem("token");
  const API_URL = import.meta.env.VITE_API_URL; // https://emploisfacile.org/api
  const searchAbortRef = useRef(null);

  const collectOptions = (items) => {
    const uniq = Array.from(new Set(items.map((value) => value?.trim()).filter(Boolean)));
    uniq.sort((a, b) => a.localeCompare(b));
    return uniq;
  };

  const getRecruiterName = (job) =>
    job.recruiter?.companyName || job.recruiter?.name || "Entreprise inconnue";

  const getLocation = (job) => job.location || job.city || "Lieu non précisé";
  const getContract = (job) => job.contractType || "Contrat non précisé";
  const getMode = (job) => job.workMode || job.mode || "Mode non précisé";
  const getSalary = (job) => job.salaryRange || "Salaire non précisé";

  const tags = (job) => {
    const rawTags = [job.category, job.experienceLevel, job.contractType, job.workMode].filter(Boolean);
    return Array.from(new Set(rawTags)).slice(0, 4);
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
        if (cityFilter.trim()) params.append("city", cityFilter.trim());
        if (contractFilter.trim()) params.append("contract", contractFilter.trim());
        if (modeFilter.trim()) params.append("mode", modeFilter.trim());

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
        }
      } catch (err) {
        if (err.name === "AbortError") return;

        console.error("JOB FEED ERROR:", err);
        setError(err.message || "Erreur lors de la récupération des offres.");
        setJobs([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 400);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [API_URL, token, searchQuery, cityFilter, contractFilter, modeFilter]);

  const cityOptions = useMemo(() => {
    const values = collectOptions(jobs.map((job) => job.location || job.city));
    return values.length ? values : DEFAULT_CITY_OPTIONS;
  }, [jobs]);

  const modeOptions = useMemo(() => {
    const values = collectOptions(jobs.map((job) => job.workMode || job.mode));
    return values.length ? values : DEFAULT_MODE_OPTIONS;
  }, [jobs]);

  const contractOptions = useMemo(() => {
    const values = collectOptions(jobs.map((job) => job.contractType));
    return values.length ? values : DEFAULT_CONTRACT_OPTIONS;
  }, [jobs]);

  const topTags = useMemo(() => {
    const counts = new Map();
    jobs.forEach((job) => {
      tags(job).forEach((tag) => {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      });
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([tag]) => tag);
  }, [jobs]);

  const handleReset = () => {
    setSearchQuery("");
    setCityFilter("");
    setContractFilter("");
    setModeFilter("");
  };

  return (
    <div className="job-feed-screen job-feed-screen--facebook">
      <div className="fb-feed jobs-feed">
        <section className="fb-post jobs-feed-card">
          <div className="jobs-feed-header">
            <div>
              <h1>Offres d’emploi</h1>
              <p>Recherche par mot-clé, ville, type et mode de travail.</p>
            </div>
            <div className="jobs-feed-count">{jobs.length} offre(s)</div>
          </div>

          <div className="jobs-feed-filters">
            <label className="jobs-feed-field" htmlFor="jobs-q">
              <span>Recherche</span>
              <input
                id="jobs-q"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Titre, compétences, entreprise (ex: marketer, react…)"
              />
            </label>
            <label className="jobs-feed-field" htmlFor="jobs-city">
              <span>Ville</span>
              <select
                id="jobs-city"
                value={cityFilter}
                onChange={(event) => setCityFilter(event.target.value)}
              >
                <option value="">Toutes villes</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>
            <label className="jobs-feed-field" htmlFor="jobs-type">
              <span>Contrat</span>
              <select
                id="jobs-type"
                value={contractFilter}
                onChange={(event) => setContractFilter(event.target.value)}
              >
                <option value="">Tous contrats</option>
                {contractOptions.map((contract) => (
                  <option key={contract} value={contract}>
                    {contract}
                  </option>
                ))}
              </select>
            </label>
            <label className="jobs-feed-field" htmlFor="jobs-mode">
              <span>Mode</span>
              <select
                id="jobs-mode"
                value={modeFilter}
                onChange={(event) => setModeFilter(event.target.value)}
              >
                <option value="">Tous modes</option>
                {modeOptions.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="jobs-feed-reset" onClick={handleReset}>
              Réinitialiser
            </button>
          </div>

          <div className="jobs-feed-tags">
            <span>Top tags :</span>
            {topTags.length ? (
              topTags.map((tag) => (
                <span key={tag} className="jobs-feed-tag">
                  {tag}
                </span>
              ))
            ) : (
              <>
                <span className="jobs-feed-tag">React</span>
                <span className="jobs-feed-tag">Marketing</span>
                <span className="jobs-feed-tag">SQL / BI</span>
                <span className="jobs-feed-tag">Remote</span>
              </>
            )}
          </div>
        </section>

        {loading && <div className="fb-loader">Chargement des offres...</div>}
        {error && <div className="fb-empty">{error}</div>}
        {!loading && !error && jobs.length === 0 && (
          <div className="fb-empty">Aucune offre ne correspond à votre recherche.</div>
        )}

        <div className="jobs-feed-list">
          {jobs.map((job) => {
            const jobTags = tags(job);
            const jobPost = {
              _id: job._id,
              createdAt: job.createdAt || job.updatedAt || new Date().toISOString(),
              isJobPost: true,
              jobData: {
                ...job,
                company: getRecruiterName(job),
                description: job.description || job.summary || job.mission,
                image: job.image || job.recruiter?.avatar,
              },
            };

            return (
              <div key={job._id} className="jobs-feed-post">
                <PostCard post={jobPost} context="jobs" />
                {jobTags.length > 0 && (
                  <div className="jobs-feed-tagline">
                    {jobTags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                )}
                <div className="jobs-feed-meta">
                  <span>{getLocation(job)}</span>
                  <span>{getContract(job)}</span>
                  <span>{getMode(job)}</span>
                  <span>{getSalary(job)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
