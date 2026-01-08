import { useCallback, useEffect, useId, useRef, useState } from "react";
import { IconPlay } from "./icons/FbIcons";
import "../styles/smart-video.css";

let activeVideoId = null;
let activeVideoEl = null;
const activeVideoListeners = new Set();

const notifyActiveVideo = (id, element) => {
  if (activeVideoEl && activeVideoEl !== element) {
    activeVideoEl.pause();
  }

  activeVideoId = id;
  activeVideoEl = element;
  activeVideoListeners.forEach((listener) => listener(id, element));
};

const clearActiveVideo = (id, element) => {
  if (activeVideoId === id && activeVideoEl === element) {
    activeVideoId = null;
    activeVideoEl = null;
    activeVideoListeners.forEach((listener) => listener(null, null));
  }
};

export default function SmartVideo({
  src,
  poster,
  className = "",
  videoClassName = "",
  controls = true,
  playsInline = true,
  preload = "metadata",
  controlsList = "nodownload noplaybackrate",
  loop,
  onClick,
  onLoadedMetadata,
  onLoadedData,
  onError,
  ariaLabel,
  style,
  videoStyle,
}) {
  const videoId = useId();
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayRequest = useCallback(
    (event) => {
      event?.stopPropagation?.();
      const videoEl = videoRef.current;
      if (!videoEl) return;

      if (videoEl.paused) {
        notifyActiveVideo(videoId, videoEl);
        videoEl.play().catch(() => {});
      } else {
        videoEl.pause();
      }
    },
    [videoId]
  );

  const handleWrapperClick = useCallback(
    (event) => {
      const videoEl = videoRef.current;
      if (!videoEl) return;

      if (videoEl.paused) {
        handlePlayRequest(event);
        return;
      }

      if (typeof onClick === "function" && event.target === event.currentTarget) {
        onClick(event);
      }
    },
    [handlePlayRequest, onClick]
  );

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return undefined;

    const handlePlay = () => {
      setIsPlaying(true);
      notifyActiveVideo(videoId, videoEl);
    };

    const handlePause = () => {
      setIsPlaying(false);
      clearActiveVideo(videoId, videoEl);
    };

    videoEl.addEventListener("play", handlePlay);
    videoEl.addEventListener("pause", handlePause);

    return () => {
      videoEl.removeEventListener("play", handlePlay);
      videoEl.removeEventListener("pause", handlePause);
    };
  }, [videoId]);

  useEffect(() => {
    const listener = (nextId) => {
      if (nextId !== videoId && videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    };

    activeVideoListeners.add(listener);
    return () => {
      activeVideoListeners.delete(listener);
    };
  }, [videoId]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            videoEl.pause();
          }
        });
      },
      { threshold: 0.15 }
    );

    observer.observe(videoEl);

    return () => observer.disconnect();
  }, []);

  return (
    <div className={`smart-video ${className}`.trim()} style={style} onClick={handleWrapperClick}>
      <video
        ref={videoRef}
        className={`smart-video__media ${videoClassName}`.trim()}
        src={src}
        poster={poster}
        controls={controls}
        playsInline={playsInline}
        preload={preload}
        controlsList={controlsList}
        loop={loop}
        onLoadedMetadata={onLoadedMetadata}
        onLoadedData={onLoadedData}
        onError={onError}
        aria-label={ariaLabel}
        style={videoStyle}
      />

      {!isPlaying && (
        <button
          type="button"
          className="smart-video__play"
          aria-label="Lire la vidéo"
          onClick={handlePlayRequest}
        >
          <span className="smart-video__play-icon">
            <IconPlay />
          </span>
        </button>
      )}
    </div>
  );
}
