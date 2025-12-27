import { useCallback, useEffect, useState } from "react";

export default function useJobApplications(currentUser = {}, { onFeedback } = {}) {
  const API_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");
  const userId = currentUser?._id || currentUser?.id;
  const role = (currentUser?.role || "").toLowerCase();

  const getAppliedKey = useCallback((user) => `appliedJobs:${user}`, []);

  const readApplied = useCallback(
    (user) => {
      if (!user) return [];

      try {
        const raw = localStorage.getItem(getAppliedKey(user));
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [];
      }
    },
    [getAppliedKey],
  );

  const writeApplied = useCallback(
    (user, jobIds) => {
      if (!user) return;
      localStorage.setItem(getAppliedKey(user), JSON.stringify([...new Set(jobIds)]));
    },
    [getAppliedKey],
  );

  const markApplied = useCallback(
    (user, jobId) => {
      if (!user || !jobId) return [];
      const current = readApplied(user);
      if (!current.includes(jobId)) {
        current.push(jobId);
        writeApplied(user, current);
      }
      return current;
    },
    [readApplied, writeApplied],
  );

  const [appliedSet, setAppliedSet] = useState(() => new Set(userId ? readApplied(userId) : []));
  const [applyingJobId, setApplyingJobId] = useState(null);

  const openFeedback = useCallback(
    (message) => {
      if (typeof onFeedback === "function") onFeedback(message);
      else alert(message); // eslint-disable-line no-alert
    },
    [onFeedback],
  );

  const syncAppliedFromJobs = useCallback(
    (jobs = []) => {
      if (!userId) return;
      const stored = new Set(readApplied(userId));

      jobs.forEach((job) => {
        if (job?.hasApplied) stored.add(job._id);
      });

      setAppliedSet((prev) => {
        const sameSize = prev.size === stored.size;
        const unchanged = sameSize && [...prev].every((id) => stored.has(id));
        if (unchanged) return prev;
        return new Set(stored);
      });
    },
    [readApplied, userId],
  );

  useEffect(() => {
    if (!userId) {
      setAppliedSet(new Set());
      return;
    }

    setAppliedSet(new Set(readApplied(userId)));
  }, [readApplied, userId]);

  const applyToJob = useCallback(
    async (jobId, jobTitle) => {
      if (!userId) {
        openFeedback("Connectez-vous pour postuler à cette offre.");
        return;
      }

      if (role === "recruiter" || role === "recruteur") {
        openFeedback("Les recruteurs ne peuvent pas postuler aux offres.");
        return;
      }

      const alreadyApplied = appliedSet.has(jobId);

      if (alreadyApplied) {
        openFeedback("Vous avez déjà postulé à cette offre");
        return;
      }

      if (!window.confirm(`Voulez-vous postuler pour "${jobTitle}" ?`)) return; // eslint-disable-line no-alert

      setApplyingJobId(jobId);

      try {
        const res = await fetch(`${API_URL}/applications`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ jobId }),
        });

        const data = await res.json();

        if (!res.ok) {
          const error = new Error(data?.message || "Échec de la candidature.");
          error.status = res.status;
          throw error;
        }

        const updated = markApplied(userId, jobId);
        setAppliedSet(new Set(updated));

        openFeedback("Votre candidature a bien été envoyée");
      } catch (err) {
        const alreadyAppliedError =
          err.status === 400 || err.message?.toLowerCase().includes("déjà postulé");

        if (alreadyAppliedError) {
          const updated = markApplied(userId, jobId);
          setAppliedSet(new Set(updated));
          openFeedback("Vous avez déjà postulé à cette offre");
          return;
        }

        console.error("APPLY ERROR:", err);
        openFeedback(err.message || "Erreur lors de l'envoi de la candidature.");
      } finally {
        setApplyingJobId(null);
      }
    },
    [API_URL, appliedSet, markApplied, openFeedback, role, token, userId],
  );

  return {
    appliedSet,
    applyingJobId,
    applyToJob,
    syncAppliedFromJobs,
  };
}
