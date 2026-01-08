import { useCallback, useEffect, useRef, useState } from "react";
import JobPostCard from "./JobPostCard";
import SkeletonPost from "./SkeletonPost";
import "../styles/facebook-feed.css";
import "../styles/post.css";

const PAGE_SIZE = 6;

const normalizeJobList = (data) => {
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.jobs)) return data.jobs;
  if (Array.isArray(data)) return data;
  return [];
};

const mergeJobs = (existing, incoming) => {
  const seen = new Set(existing.map((job) => String(job?._id)));
  const merged = [...existing];

  incoming.forEach((job) => {
    if (!job?._id) return;
    const id = String(job._id);
    if (seen.has(id)) return;
    seen.add(id);
    merged.push(job);
  });

  return merged;
};

export default function JobFeed() {
  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const API_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");
  const sentinelRef = useRef(null);
  const jobsRef = useRef([]);

  const loadJobs = useCallback(
    async (pageToLoad, isInitial = false) => {
      if (!API_URL) return;
      if (isInitial) {
        setLoadingInitial(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const params = new URLSearchParams({
          page: String(pageToLoad),
          limit: String(PAGE_SIZE),
        });

        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`${API_URL}/jobs/search?${params.toString()}`, {
          headers,
        });

        if (!res.ok) {
          throw new Error("Échec de la récupération des offres.");
        }

        const data = await res.json();
        const incoming = normalizeJobList(data);

        const previousJobs = jobsRef.current;
        const nextJobs = pageToLoad === 1 ? incoming : mergeJobs(previousJobs, incoming);
        const addedCount = nextJobs.length - previousJobs.length;

        jobsRef.current = nextJobs;
        setJobs(nextJobs);

        if (incoming.length < PAGE_SIZE || addedCount === 0) {
          setHasMore(false);
        }
      } catch (err) {
        console.error("JOB FEED ERROR:", err);
        setError(err.message || "Erreur lors de la récupération des offres.");
        setHasMore(false);
      } finally {
        setLoadingInitial(false);
        setLoadingMore(false);
      }
    },
    [API_URL, token]
  );

  useEffect(() => {
    jobsRef.current = [];
    setJobs([]);
    setPage(1);
    setHasMore(true);
    setError("");
  }, [API_URL, token]);

  useEffect(() => {
    loadJobs(page, page === 1);
  }, [loadJobs, page]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || loadingInitial || loadingMore || !hasMore) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setPage((prev) => prev + 1);
          }
        });
      },
      { rootMargin: "220px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingInitial, loadingMore]);

  return (
    <div className="fb-feed fb-feed--jobs">
      {loadingInitial &&
        [...Array(4)].map((_, idx) => <SkeletonPost key={`job-skel-${idx}`} />)}

      {!loadingInitial &&
        jobs.map((job) => <JobPostCard key={job._id} job={job} />)}

      {!loadingInitial && !error && jobs.length === 0 && (
        <div className="fb-empty">Aucune offre disponible pour le moment.</div>
      )}

      {error && <div className="fb-empty">{error}</div>}

      {loadingMore && <SkeletonPost />}

      <div ref={sentinelRef} />
    </div>
  );
}
