import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SponsoredAdsList from "./SponsoredAdsList";
import RecentJobsList from "./RecentJobsList";
import { fetchActiveAds, trackAdEvent } from "../api/adsApi";
import { fetchRecentJobs } from "../api/jobsApi";
import "../styles/right-sidebar.css";

const REFRESH_INTERVAL = 60000;
const DESKTOP_QUERY = "(min-width: 1024px)";

export default function RightSidebar() {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  const [ads, setAds] = useState([]);
  const [jobs, setJobs] = useState([]);

  const [loadingAds, setLoadingAds] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const [adsError, setAdsError] = useState("");
  const [jobsError, setJobsError] = useState("");

  const adsSignatureRef = useRef("");
  const jobsSignatureRef = useRef("");

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mediaQuery = window.matchMedia(DESKTOP_QUERY);
    if (!mediaQuery.matches) return undefined;

    const node = containerRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const updateAds = useCallback((nextAds) => {
    const signature = nextAds.map((ad) => ad.id).join("|");
    if (signature !== adsSignatureRef.current) {
      adsSignatureRef.current = signature;
      setAds(nextAds);
    }
  }, []);

  const updateJobs = useCallback((nextJobs) => {
    const signature = nextJobs.map((job) => job.jobId).join("|");
    if (signature !== jobsSignatureRef.current) {
      jobsSignatureRef.current = signature;
      setJobs(nextJobs);
    }
  }, []);

  useEffect(() => {
    if (!isVisible) return undefined;

    let cancelled = false;

    const loadAds = async (background = false) => {
      if (!background) {
        setLoadingAds(true);
      }

      try {
        const data = await fetchActiveAds();
        if (cancelled) return;
        updateAds(Array.isArray(data) ? data : []);
        setAdsError("");
      } catch (err) {
        if (cancelled) return;
        setAdsError("Impossible de charger les publicités.");
      } finally {
        if (!cancelled) {
          setLoadingAds(false);
        }
      }
    };

    loadAds();

    const interval = setInterval(() => {
      loadAds(true);
    }, REFRESH_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isVisible, updateAds]);

  useEffect(() => {
    if (!isVisible) return undefined;

    let cancelled = false;

    const loadJobs = async (background = false) => {
      if (!background) {
        setLoadingJobs(true);
      }

      try {
        const data = await fetchRecentJobs(5);
        if (cancelled) return;
        updateJobs(Array.isArray(data) ? data : []);
        setJobsError("");
      } catch (err) {
        if (cancelled) return;
        setJobsError("Impossible de charger les offres.");
      } finally {
        if (!cancelled) {
          setLoadingJobs(false);
        }
      }
    };

    loadJobs();

    const interval = setInterval(() => {
      loadJobs(true);
    }, REFRESH_INTERVAL * 2);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isVisible, updateJobs]);

  const handleAdImpression = useCallback(async (adId) => {
    if (!adId) return;

    try {
      await trackAdEvent({ sponsoredPostId: adId, type: "impression" });
    } catch (err) {
      // tracking best effort
    }
  }, []);

  const handleAdClick = useCallback(async (adId) => {
    if (!adId) return;

    try {
      await trackAdEvent({ sponsoredPostId: adId, type: "click" });
    } catch (err) {
      // tracking best effort
    }
  }, []);

  const memoAds = useMemo(() => ads, [ads]);
  const memoJobs = useMemo(() => jobs, [jobs]);

  return (
    <div ref={containerRef} className="right-sidebar">
      <SponsoredAdsList
        ads={memoAds}
        loading={loadingAds}
        error={adsError}
        onImpression={handleAdImpression}
        onClick={handleAdClick}
      />
      <RecentJobsList jobs={memoJobs} loading={loadingJobs} error={jobsError} />
    </div>
  );
}
