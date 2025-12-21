import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import "../styles/reels.css";
import { getImageUrl } from "../utils/imageUtils";

export default function ReelsPage() {
  const API_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");
  const location = useLocation();

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(false);

  const containerRef = useRef(null);
  const videoRefs = useRef([]);
  const hasUnlockedSound = useRef(false);
  const activeIndexRef = useRef(0);
  const isScrollingRef = useRef(false);

  /* =====================================================
     VIDEO ID FROM URL
  ===================================================== */
  const selectedVideoId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("videoId");
  }, [location.search]);

  /* =====================================================
     FETCH VIDEOS
  ===================================================== */
  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_URL}/posts/videos`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok || !Array.isArray(data)) {
        setVideos([]);
        setError("Impossible de charger les vidéos.");
        return;
      }

      setVideos(data);
    } catch (err) {
      console.error(err);
      setError("Erreur lors du chargement.");
    } finally {
      setLoading(false);
    }
  }, [API_URL, token]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  /* =====================================================
     LOCK BODY SCROLL
  ===================================================== */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prev;
      videoRefs.current.forEach((v) => v?.pause());
    };
  }, []);

  /* =====================================================
     INTERSECTION OBSERVER (AUTO PLAY)
  ===================================================== */
  useEffect(() => {
    if (!videos.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          const visible =
            entry.isIntersecting && entry.intersectionRatio >= 0.7;

          if (visible) {
            videoRefs.current.forEach((v) => v && v !== video && v.pause());

            const index = Number(video.dataset.index);
            activeIndexRef.current = index;

            video.muted = !soundEnabled;
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.7, root: containerRef.current }
    );

    videoRefs.current.forEach((v) => v && observer.observe(v));

    return () => observer.disconnect();
  }, [videos, soundEnabled]);

  /* =====================================================
     APPLY SOUND STATE
  ===================================================== */
  useEffect(() => {
    videoRefs.current.forEach((v) => {
      if (v) v.muted = !soundEnabled;
    });
  }, [soundEnabled]);

  /* =====================================================
     SCROLL TO SELECTED VIDEO
  ===================================================== */
  useEffect(() => {
    if (!videos.length) return;

    const index = selectedVideoId
      ? videos.findIndex((v) => String(v._id) === String(selectedVideoId))
      : 0;

    if (index < 0) return;

    const video = videoRefs.current[index];
    if (video) {
      video.scrollIntoView({ behavior: "auto", block: "start" });
      video.play().catch(() => {});
      activeIndexRef.current = index;
    }
  }, [videos, selectedVideoId]);

  /* =====================================================
     SCROLL CONTROL (WHEEL = 1 VIDEO)
  ===================================================== */
  const scrollToVideo = useCallback((index) => {
    const target = videoRefs.current[index];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e) => {
      e.preventDefault();
      if (isScrollingRef.current) return;

      const dir = e.deltaY > 0 ? 1 : -1;
      const next = Math.min(
        Math.max(activeIndexRef.current + dir, 0),
        videos.length - 1
      );

      if (next === activeIndexRef.current) return;

      isScrollingRef.current = true;
      scrollToVideo(next);

      setTimeout(() => (isScrollingRef.current = false), 550);
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [videos.length, scrollToVideo]);

  /* =====================================================
     UNLOCK SOUND ON TAP
  ===================================================== */
  const enableSound = useCallback((video) => {
    if (hasUnlockedSound.current) return;

    hasUnlockedSound.current = true;
    setSoundEnabled(true);

    video.muted = false;
    video.play().catch(() => {});
  }, []);

  /* =====================================================
     PROGRESS BAR
  ===================================================== */
  useEffect(() => {
    videoRefs.current.forEach((video) => {
      if (!video) return;

      const bar = video.parentElement.querySelector(".reels-progress-bar");

      const update = () => {
        if (!video.duration) return;
        bar.style.width = `${(video.currentTime / video.duration) * 100}%`;
      };

      video.addEventListener("timeupdate", update);
      return () => video.removeEventListener("timeupdate", update);
    });
  }, [videos]);

  /* =====================================================
     AUTO NEXT VIDEO
  ===================================================== */
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;

      const onEnd = () => {
        if (index + 1 < videos.length) scrollToVideo(index + 1);
      };

      video.addEventListener("ended", onEnd);
      return () => video.removeEventListener("ended", onEnd);
    });
  }, [videos, scrollToVideo]);

  /* =====================================================
     RENDER
  ===================================================== */
  return (
    <div className="reels-page">
      <div className="reels-container" ref={containerRef}>
        {loading && <div className="reels-status">Chargement…</div>}
        {error && <div className="reels-status">{error}</div>}

        {!loading &&
          !error &&
          videos.map((video, index) => (
            <section key={video._id} className="reels-item">
              <video
                ref={(el) => (videoRefs.current[index] = el)}
                data-index={index}
                className="reels-video"
                src={getImageUrl(video.media)}
                muted={!soundEnabled}
                playsInline
                preload="metadata"
                onClick={() => enableSound(videoRefs.current[index])}
              />

              {/* INFOS */}
              <div className="reels-overlay">
                <div className="reels-user">
                  {video.user?.name || "Utilisateur"}
                </div>
                <div className="reels-meta">
                  <span>{video.likesCount ?? 0} j’aime</span>
                  <span>{video.commentsCount ?? 0} commentaires</span>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="reels-actions">
                <button>❤️<span>{video.likesCount ?? 0}</span></button>
                <button>💬<span>{video.commentsCount ?? 0}</span></button>
                <button>↗️</button>
              </div>

              {/* PROGRESS */}
              <div className="reels-progress">
                <div className="reels-progress-bar" />
              </div>
            </section>
          ))}
      </div>
    </div>
  );
}
