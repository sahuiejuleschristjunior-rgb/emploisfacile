import { useEffect, useMemo, useRef, useState } from "react";
import {
  IconFullscreen,
  IconPause,
  IconPlay,
  IconVolumeOff,
  IconVolumeOn,
} from "./icons/FbIcons";
import "../styles/media-renderer.css";

const stopAll = (e) => {
  e.stopPropagation();
  e.preventDefault();
};

const DEFAULT_GAIN = 1.4;
const MAX_GAIN = 2;
const MIN_GAIN = 0;

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
  onExpand,
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [gainValue, setGainValue] = useState(DEFAULT_GAIN);
  const [isPlaying, setIsPlaying] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );
  const hideControlsTimeout = useRef(null);
  const lastVolumeRef = useRef(DEFAULT_GAIN);
  const videoRef = useRef(null);
  const progressRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);
  const gainNodeRef = useRef(null);
  const audioConnectedRef = useRef(false);

  const resumeAudioContext = async () => {
    const ctx = audioContextRef.current;
    if (ctx && ctx.state === "suspended") {
      await ctx.resume();
    }
  };

  const ensureAudioGraph = () => {
    if (!showVideo) return;
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const ctx = audioContextRef.current;

    if (!gainNodeRef.current) {
      gainNodeRef.current = ctx.createGain();
      gainNodeRef.current.gain.value = isMuted ? 0 : gainValue;
    }

    if (!audioSourceRef.current) {
      audioSourceRef.current = ctx.createMediaElementSource(videoEl);
      audioSourceRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(ctx.destination);
    }
  };

  const applyGainValue = (value, mutedState = isMuted) => {
    if (gainNodeRef.current) {
      const clamped = Math.min(Math.max(value, MIN_GAIN), MAX_GAIN);
      gainNodeRef.current.gain.value = mutedState ? 0 : clamped;
    }
  };

  const syncVideoMuteState = (muteState) => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    videoEl.muted = muteState;
    videoEl.volume = 1;
  };

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

  const baseEventBlockers = {
    onMouseDown: stopAll,
    onMouseUp: stopAll,
    onMouseMove: stopAll,
    onPointerDown: stopAll,
    onPointerMove: stopAll,
    onPointerUp: stopAll,
    onTouchStart: stopAll,
    onTouchMove: stopAll,
    onTouchEnd: stopAll,
  };

  const overlayEventBlockers = {
    ...baseEventBlockers,
    onClick: stopAll,
  };

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
    setIsMuted(true);
    setGainValue(DEFAULT_GAIN);
    lastVolumeRef.current = DEFAULT_GAIN;
    setDuration(0);
    setCurrentTime(0);
  }, [finalSrc, resolvedType]);

  useEffect(() => {
    const updateIsDesktop = () => {
      setIsDesktop(typeof window !== "undefined" ? window.innerWidth >= 1024 : true);
    };

    updateIsDesktop();
    window.addEventListener("resize", updateIsDesktop);

    return () => window.removeEventListener("resize", updateIsDesktop);
  }, []);

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
      videoEl.volume = 1;
      applyGainValue(gainValue, isMuted);
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
  }, [finalSrc, gainValue, isMuted]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext || !showVideo) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const ctx = audioContextRef.current;

    if (!gainNodeRef.current) {
      gainNodeRef.current = ctx.createGain();
    }

    if (!audioSourceRef.current) {
      audioSourceRef.current = ctx.createMediaElementSource(videoEl);
    }

    if (!audioConnectedRef.current && audioSourceRef.current && gainNodeRef.current) {
      audioSourceRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(ctx.destination);
      audioConnectedRef.current = true;
    }

    const clampedGain = Math.min(Math.max(gainValue, MIN_GAIN), MAX_GAIN);
    gainNodeRef.current.gain.value = isMuted ? 0 : clampedGain;
    videoEl.muted = isMuted;
    videoEl.volume = 1;
  }, [gainValue, isMuted, showVideo]);

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

  const toggleSound = async (event) => {
    stopAll(event);
    const videoEl = videoRef.current;
    if (!videoEl) return;

    await resumeAudioContext();

    if (isMuted) {
      const nextVolume = gainValue === 0 ? lastVolumeRef.current || DEFAULT_GAIN : gainValue;
      const clamped = Math.min(Math.max(nextVolume, MIN_GAIN), MAX_GAIN);
      syncVideoMuteState(false);
      applyGainValue(clamped, false);
      setGainValue(clamped);
      setIsMuted(false);
    } else {
      lastVolumeRef.current = gainValue || DEFAULT_GAIN;
      syncVideoMuteState(true);
      applyGainValue(gainValue, true);
      setIsMuted(true);
    }
  };

  const handleVolumeChange = async (event) => {
    stopAll(event);
    const videoEl = videoRef.current;
    if (!videoEl) return;

    await resumeAudioContext();

    const nextVolume = Math.min(
      Math.max(Number(event.target.value), MIN_GAIN),
      MAX_GAIN
    );

    setGainValue(nextVolume);

    if (nextVolume === 0) {
      lastVolumeRef.current = DEFAULT_GAIN;
      syncVideoMuteState(true);
      applyGainValue(nextVolume, true);
      setIsMuted(true);
    } else {
      lastVolumeRef.current = nextVolume;
      syncVideoMuteState(false);
      applyGainValue(nextVolume, false);
      setIsMuted(false);
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

  useEffect(() => {
    if (!showControls || !isDesktop) {
      setShowVolumeSlider(false);
    }
  }, [isDesktop, showControls]);

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
          {...overlayEventBlockers}
        >
          <div className="mr-controls" {...overlayEventBlockers}>
            <div className="mr-controls-left">
              <button
                type="button"
                className="mr-icon-btn"
                {...baseEventBlockers}
                onClick={handlePlayPause}
                aria-label={isPlaying ? "Mettre en pause" : "Lecture"}
              >
                {isPlaying ? <IconPause /> : <IconPlay />}
              </button>

              <div
                className={`mr-volume-container ${showVolumeSlider ? "is-open" : ""}`.trim()}
                onMouseEnter={() => isDesktop && setShowVolumeSlider(true)}
                onMouseLeave={() => isDesktop && setShowVolumeSlider(false)}
                {...overlayEventBlockers}
              >
                <button
                  type="button"
                  className="mr-icon-btn"
                  {...baseEventBlockers}
                  onClick={toggleSound}
                  aria-label={isMuted ? "Activer le son" : "Couper le son"}
                >
                  {isMuted ? <IconVolumeOff /> : <IconVolumeOn />}
                </button>

                {isDesktop ? (
                  showVolumeSlider && (
                    <div className="mr-volume-popover" {...overlayEventBlockers}>
                      <input
                        type="range"
                        className="mr-volume-slider"
                        min={MIN_GAIN}
                        max={MAX_GAIN}
                        step="0.05"
                        value={gainValue}
                        {...baseEventBlockers}
                        onClick={stopAll}
                        onChange={handleVolumeChange}
                        aria-label="Volume"
                      />
                    </div>
                  )
                ) : (
                  <div className="mr-volume-inline" {...overlayEventBlockers}>
                    <input
                      type="range"
                      min={MIN_GAIN}
                      max={MAX_GAIN}
                      step="0.05"
                      value={gainValue}
                      {...baseEventBlockers}
                      onClick={stopAll}
                      onChange={handleVolumeChange}
                      aria-label="Volume"
                    />
                  </div>
                )}
              </div>

              <div
                className="mr-progress"
                ref={progressRef}
                onClick={handleSeek}
                onTouchStart={handleSeek}
                {...baseEventBlockers}
                role="presentation"
              >
                <div className="mr-progress-track">
                  <div className="mr-progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            </div>

            <div className="mr-controls-right">
              <button
                type="button"
                className="mr-icon-btn mr-expand-btn"
                {...baseEventBlockers}
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
