import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function useRecruiterJobs() {
  const { token } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL;

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchJobs = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/jobs/my-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Impossible de charger vos offres.");
      }

      const jobsPayload = Array.isArray(data)
        ? data
        : data.jobs
        ? data.jobs
        : data.data || [];

      setJobs(jobsPayload);
    } catch (err) {
      setError(err.message);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [API_URL, token]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const addJob = useCallback((newJob) => {
    setJobs((prev) => [newJob, ...prev]);
  }, []);

  return { jobs, loading, error, refetch: fetchJobs, addJob };
}
