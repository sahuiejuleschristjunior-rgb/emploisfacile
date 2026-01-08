import { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_CITY_OPTIONS = ["Abidjan", "Cocody", "Plateau"];
const DEFAULT_MODE_OPTIONS = ["Remote", "Hybride", "Présentiel"];
const DEFAULT_CONTRACT_OPTIONS = ["CDI", "CDD", "Stage", "Freelance", "Alternance", "Temps Partiel"];

export default function useJobSearch() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [contractFilter, setContractFilter] = useState("");
  const [modeFilter, setModeFilter] = useState("");

  const token = localStorage.getItem("token");
  const API_URL = import.meta.env.VITE_API_URL;
  const searchAbortRef = useRef(null);

  const collectOptions = (items) => {
    const uniq = Array.from(new Set(items.map((value) => value?.trim()).filter(Boolean)));
    uniq.sort((a, b) => a.localeCompare(b));
    return uniq;
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

  const handleReset = () => {
    setSearchQuery("");
    setCityFilter("");
    setContractFilter("");
    setModeFilter("");
  };

  return {
    jobs,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    cityFilter,
    setCityFilter,
    contractFilter,
    setContractFilter,
    modeFilter,
    setModeFilter,
    cityOptions,
    contractOptions,
    modeOptions,
    handleReset,
  };
}
