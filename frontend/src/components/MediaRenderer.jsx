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

const stopAll = (event) => {
  event?.stopPropagation?.();
  event?.preventDefault?.();
};

const AUDIO_GAIN_MULTIPLIER = 1.6;

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
  aspectRatio,
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
  const [volume, setVolume] = useState(muted ? 0 : 0.6);
  const [isPlaying, setIsPlaying] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const hideControlsTimeout = useRef(null);
  const lastVolumeRef = useRef(0.6);
  const videoRef = useRef(null);
  const progressRef = useRef(null);
  const audioContextRef = useRef(null);
  const gainNodeRef = useRef(null);
  const mediaSourceRef = useRef(null);

  const finalSrc = src || media?.url || media?.src;
  const finalPoster = poster || media?.poster || media?.thumbnail;

  const resolvedType = useMemo(
    () => getMediaType({ type: type || media?.type, mimeType: mimeType || media?.mimeType, url: finalSrc }),
    [type, mimeType, media?.type, media?.mimeType, finalSrc]
  );

  const ratio = useMemo(() => {
    if (aspectRatio) return aspectRatio;
    if (media?.ratio) return media.ratio;
    if (media?.width && media?.height) return `${media.width}/${media.height}`;
    return "16/9";
  }, [aspectRatio, media?.ratio, media?.width, media?.height]);

  const showVideo = resolvedType === "video";

  const ensureAudioGraph = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    if (ctx?.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    if (!mediaSourceRef.current && ctx) {
      try {
        mediaSourceRef.current = ctx.createMediaElementSource(videoEl);
        gainNodeRef.current = ctx.createGain();
        mediaSourceRef.current.connect(gainNodeRef.current);
        gainNodeRef.current.connect(ctx.destination);
      } catch (err) {
        console.error("AUDIO GRAPH ERROR", err);
      }
    }
  };

  const applyVolume = (nextVolume, mutedState) => {
    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.volume = mutedState ? 0 : nextVolume;
      videoEl.muted = mutedState;
    }

    const gainNode = gainNodeRef.current;
    if (gainNode) {
      const gainValue = mutedState ? 0 : Math.min(nextVolume * AUDIO_GAIN_MULTIPLIER, 3);
      gainNode.gain.value = gainValue;
    }
  };

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
    setIsMuted(true);
    setVolume(0);
    setDuration(0);
    setCurrentTime(0);
  }, [finalSrc, resolvedType]);

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
      videoEl.volume = isMuted ? 0 : volume || 0.6;
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

    ensureAudioGraph();
    applyVolume(volume || 0.6, isMuted);
  }, [isMuted, volume]);

  const handleImageLoad = () => {
    setLoaded(true);
  };

  const handleVideoLoadedData = () => {
    setLoaded(true);
    const videoEl = videoRef.current;
    if (videoEl) {
      ensureAudioGraph();
      applyVolume(volume || 0.6, isMuted);
      setDuration(videoEl.duration || 0);
      setCurrentTime(videoEl.currentTime || 0);
      videoEl.play().catch(() => {});
      setIsPlaying(!videoEl.paused);
    }
  };

  const toggleSound = (event) => {
    stopAll(event);
    const videoEl = videoRef.current;
    if (!videoEl) return;

    ensureAudioGraph();

    if (isMuted) {
      const nextVolume = volume === 0 ? lastVolumeRef.current || 0.6 : volume;
      applyVolume(nextVolume, false);
      setVolume(nextVolume);
      setIsMuted(false);
      audioContextRef.current?.resume?.().catch(() => {});
    } else {
      lastVolumeRef.current = volume || 0.6;
      applyVolume(0, true);
      setVolume(0);
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (event) => {
    stopAll(event);
    const videoEl = videoRef.current;
    if (!videoEl) return;

    ensureAudioGraph();

    const nextVolume = Number(event.target.value);
    setVolume(nextVolume);

    if (nextVolume === 0) {
      applyVolume(0, true);
      setIsMuted(true);
    } else {
      applyVolume(nextVolume, false);
      setIsMuted(false);
      lastVolumeRef.current = nextVolume;
      audioContextRef.current?.resume?.().catch(() => {});
    }
  };

  const handlePlayPause = (event) => {
    stopAll(event);
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
    stopAll(event);
    if (typeof onExpand === "function") {
      onExpand();
    }
  };

  const stopControlsPropagation = (event) => {
    stopAll(event);
  };

  const progressPercent = duration ? Math.min((currentTime / duration) * 100, 100) : 0;

  const handleSeek = (event) => {
    stopAll(event);
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
      className={`media-renderer ${className}`.trim()}
      style={{ "--mr-aspect": ratio }}
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
          onMouseMove={stopControlsPropagation}
          onPointerMove={stopControlsPropagation}
          onTouchStart={stopControlsPropagation}
          onTouchMove={stopControlsPropagation}
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
                onPointerMove={stopControlsPropagation}
                onMouseDown={stopControlsPropagation}
                onMouseMove={stopControlsPropagation}
                onTouchMove={stopControlsPropagation}
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
                onPointerMove={stopControlsPropagation}
                onMouseDown={stopControlsPropagation}
                onMouseMove={stopControlsPropagation}
                onTouchMove={stopControlsPropagation}
                onClick={stopControlsPropagation}
              >
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={handleVolumeChange}
                  onInput={handleVolumeChange}
                  onClick={stopControlsPropagation}
                  onMouseDown={stopControlsPropagation}
                  onMouseMove={stopControlsPropagation}
                  onPointerDown={stopControlsPropagation}
                  onPointerMove={stopControlsPropagation}
                  onTouchStart={stopControlsPropagation}
                  onTouchMove={stopControlsPropagation}
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
