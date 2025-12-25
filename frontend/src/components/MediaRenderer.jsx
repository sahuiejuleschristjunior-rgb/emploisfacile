import { useEffect, useMemo, useRef, useState } from "react";
import {
  IconFullscreen,
  IconPause,
  IconPlay,
  IconVolumeOff,
  IconVolumeOn,
} from "./icons/FbIcons";
import "../styles/media-renderer.css";

const IMAGE_EXT = /(\.jpe?g|\.png|\.webp|\.gif|\.avif)$/i;
const VIDEO_EXT = /(\.mp4|\.mov|\.webm|\.m4v|\.avi)$/i;
const DEFAULT_VOLUME = 0.6;

const getMediaType = ({ type, mimeType, url = "" }) => {
  const hint = type || mimeType || "";
  if (hint.startsWith("video")) return "video";
  if (hint.startsWith("image")) return "image";
  if (VIDEO_EXT.test(url)) return "video";
  if (IMAGE_EXT.test(url)) return "image";
  return "image";
};

export default function MediaRenderer({
  media,
  src,
  type,
  mimeType,
  poster,
  className = "",
  mediaClassName = "",
  onClick,
  alt = "",
  autoPlay = true,
  loop,
  muted = true,
  controls,
  playsInline = true,
  preload = "metadata",
  onExpand,
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [volume, setVolume] = useState(muted ? 0 : DEFAULT_VOLUME);
  const [isPlaying, setIsPlaying] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const hideControlsTimeout = useRef(null);
  const lastVolumeRef = useRef(DEFAULT_VOLUME);
  const videoRef = useRef(null);
  const progressRef = useRef(null);

  const finalSrc = src || media?.url || media?.src;
  const finalPoster = poster || media?.poster || media?.thumbnail;

  const resolvedType = useMemo(
    () => getMediaType({ type: type || media?.type, mimeType: mimeType || media?.mimeType, url: finalSrc }),
    [type, mimeType, media?.type, media?.mimeType, finalSrc]
  );

  const showVideo = resolvedType === "video";

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
    setIsMuted(Boolean(muted));
    setVolume(muted ? 0 : DEFAULT_VOLUME);
    lastVolumeRef.current = DEFAULT_VOLUME;
    setDuration(0);
    setCurrentTime(0);
  }, [finalSrc, resolvedType, muted]);

  useEffect(() => {
    if (!finalSrc || loaded) return undefined;

    const timeout = setTimeout(() => {
      setLoaded(true);
      if (showVideo && videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
    }, showVideo ? 2500 : 1500);

    return () => clearTimeout(timeout);
  }, [finalSrc, loaded, showVideo]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return undefined;

    const handleLoadedMetadata = () => {
      setDuration(videoEl.duration || 0);
      setCurrentTime(videoEl.currentTime || 0);
      videoEl.muted = isMuted;
      videoEl.volume = isMuted ? 0 : volume || DEFAULT_VOLUME;
    };

    const handleTimeUpdate = () => {
      setCurrentTime(videoEl.currentTime || 0);
      setIsPlaying(!videoEl.paused);
    };

    videoEl.addEventListener("loadedmetadata", handleLoadedMetadata);
    videoEl.addEventListener("timeupdate", handleTimeUpdate);
    videoEl.addEventListener("play", handleTimeUpdate);
    videoEl.addEventListener("pause", handleTimeUpdate);

    return () => {
      videoEl.removeEventListener("loadedmetadata", handleLoadedMetadata);
      videoEl.removeEventListener("timeupdate", handleTimeUpdate);
      videoEl.removeEventListener("play", handleTimeUpdate);
      videoEl.removeEventListener("pause", handleTimeUpdate);
    };
  }, [finalSrc, isMuted, volume]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    videoEl.muted = isMuted;
    videoEl.volume = isMuted ? 0 : volume || DEFAULT_VOLUME;
  }, [isMuted, volume]);

  const handleImageLoad = () => {
    setLoaded(true);
  };

  const handleVideoLoadedData = () => {
    setLoaded(true);
    const videoEl = videoRef.current;
    if (videoEl) {
      setDuration(videoEl.duration || 0);
      setCurrentTime(videoEl.currentTime || 0);
      videoEl.play().catch(() => {});
      setIsPlaying(!videoEl.paused);
    }
  };

  const toggleSound = (event) => {
    event?.stopPropagation?.();
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (isMuted) {
      const nextVolume = volume === 0 ? lastVolumeRef.current || DEFAULT_VOLUME : volume;
      videoEl.muted = false;
      videoEl.volume = nextVolume;
      setVolume(nextVolume);
      setIsMuted(false);
    } else {
      lastVolumeRef.current = volume || DEFAULT_VOLUME;
      videoEl.muted = true;
      videoEl.volume = 0;
      setVolume(0);
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (event) => {
    event.stopPropagation();
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const nextVolume = Math.min(Math.max(Number(event.target.value), 0), 1);
    setVolume(nextVolume);

    if (nextVolume === 0) {
      videoEl.volume = 0;
      videoEl.muted = true;
      setIsMuted(true);
    } else {
      videoEl.volume = nextVolume;
      videoEl.muted = false;
      setIsMuted(false);
      lastVolumeRef.current = nextVolume;
    }
  };

  const handlePlayPause = (event) => {
    event.stopPropagation();
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (videoEl.paused) {
      videoEl.play();
      setIsPlaying(true);
    } else {
      videoEl.pause();
      setIsPlaying(false);
    }
  };

  const handleExpand = (event) => {
    event.stopPropagation();
    if (typeof onExpand === "function") {
      onExpand();
    }
  };

  const stopControlsPropagation = (event) => {
    event.stopPropagation();
  };

  const progressPercent = duration ? Math.min((currentTime / duration) * 100, 100) : 0;

  const handleSeek = (event) => {
    event.stopPropagation();
    const videoEl = videoRef.current;
    const bar = progressRef.current;
    if (!videoEl || !bar || !duration) return;

    const rect = bar.getBoundingClientRect();
    const clientX = event.nativeEvent?.touches?.[0]?.clientX || event.clientX;
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    const newTime = ratio * duration;
    videoEl.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    hideControlsTimeout.current = setTimeout(() => setShowControls(false), 2500);
  };

  useEffect(() => () => {
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
  }, []);

  const handleError = () => {
    setErrored(true);
    setLoaded(true);
  };

  return (
    <div
      className={`media-renderer fb-media ${className}`.trim()}
      onClick={onClick}
    >
      {!loaded && <div className="media-skeleton" aria-hidden="true" />}

      {showVideo ? (
        <video
          className={`media-element ${mediaClassName} ${loaded ? "is-visible" : ""}`.trim()}
          ref={videoRef}
          onLoadedData={handleVideoLoadedData}
          onError={handleError}
          poster={finalPoster}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          controls={controls}
          playsInline={playsInline}
          preload={preload}
          aria-label={alt}
          onClick={showControlsTemporarily}
          onMouseEnter={showControlsTemporarily}
          onMouseMove={showControlsTemporarily}
          onTouchStart={showControlsTemporarily}
        >
          {finalSrc ? <source src={finalSrc} type={mimeType || media?.mimeType} /> : null}
        </video>
      ) : (
        <img
          src={finalSrc}
          alt={alt}
          loading="lazy"
          className={`media-element ${mediaClassName} ${loaded ? "is-visible" : ""}`.trim()}
          onLoad={handleImageLoad}
          onError={handleError}
        />
      )}

      {showVideo && (
        <div
          className={`mr-controls-overlay ${showControls ? "is-visible" : ""}`.trim()}
          onPointerDown={stopControlsPropagation}
          onMouseDown={stopControlsPropagation}
          onTouchStart={stopControlsPropagation}
          onClick={stopControlsPropagation}
        >
          <div className="mr-controls">
            <div className="mr-controls-left">
              <button
                type="button"
                className="mr-icon-btn"
                onClick={handlePlayPause}
                aria-label={isPlaying ? "Mettre en pause" : "Lecture"}
              >
                {isPlaying ? <IconPause /> : <IconPlay />}
              </button>

              <button
                type="button"
                className="mr-icon-btn"
                onClick={toggleSound}
                aria-label={isMuted ? "Activer le son" : "Couper le son"}
              >
                {isMuted ? <IconVolumeOff /> : <IconVolumeOn />}
              </button>

              <div
                className="mr-progress"
                ref={progressRef}
                onClick={handleSeek}
                onTouchStart={handleSeek}
                onPointerDown={stopControlsPropagation}
                role="presentation"
              >
                <div className="mr-progress-track">
                  <div className="mr-progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            </div>

            <div className="mr-controls-right">
              <div
                className="mr-volume"
                onPointerDown={stopControlsPropagation}
                onClick={stopControlsPropagation}
              >
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={handleVolumeChange}
                  aria-label="Volume"
                />
              </div>

              <button
                type="button"
                className="mr-icon-btn mr-expand-btn"
                onClick={handleExpand}
                aria-label="Agrandir la vidéo"
              >
                <IconFullscreen />
              </button>
            </div>
          </div>
        </div>
      )}

      {errored && <div className="media-fallback">Média indisponible</div>}
    </div>
  );
}
