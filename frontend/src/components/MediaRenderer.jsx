import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/media-renderer.css";

const IMAGE_EXT = /(\.jpe?g|\.png|\.webp|\.gif|\.avif)$/i;
const VIDEO_EXT = /(\.mp4|\.mov|\.webm|\.m4v|\.avi)$/i;

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
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [volume, setVolume] = useState(muted ? 0 : 0.6);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const hideControlsTimeout = useRef(null);
  const lastVolumeRef = useRef(0.6);
  const videoRef = useRef(null);
  const progressRef = useRef(null);

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
    };

    videoEl.addEventListener("loadedmetadata", handleLoadedMetadata);
    videoEl.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      videoEl.removeEventListener("loadedmetadata", handleLoadedMetadata);
      videoEl.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [finalSrc, isMuted, volume]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    videoEl.muted = isMuted;
    videoEl.volume = isMuted ? 0 : volume || 0.6;
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
    }
  };

  const toggleSound = (event) => {
    event?.stopPropagation?.();
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (isMuted) {
      const nextVolume = volume === 0 ? lastVolumeRef.current || 0.6 : volume;
      videoEl.muted = false;
      videoEl.volume = nextVolume;
      setVolume(nextVolume);
      setIsMuted(false);
    } else {
      lastVolumeRef.current = volume || 0.6;
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

    const nextVolume = Number(event.target.value);
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
        <div className={`mr-controls ${showControls ? "is-visible" : ""}`.trim()}>
          <button
            type="button"
            className="mr-sound-btn"
            onClick={toggleSound}
            aria-label={isMuted ? "Activer le son" : "Couper le son"}
          >
            {isMuted ? "🔇" : "🔊"}
          </button>

          <div
            className="mr-progress"
            ref={progressRef}
            onClick={handleSeek}
            onTouchStart={handleSeek}
            role="presentation"
          >
            <div className="mr-progress-track">
              <div className="mr-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className="mr-volume">
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
        </div>
      )}

      {errored && <div className="media-fallback">Média indisponible</div>}
    </div>
  );
}
