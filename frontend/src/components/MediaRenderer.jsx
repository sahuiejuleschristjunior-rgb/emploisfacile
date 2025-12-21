import { useMemo, useState } from "react";
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
  autoPlay,
  loop,
  muted,
  controls,
  playsInline = true,
  preload = "metadata",
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

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

  const handleReady = () => {
    setLoaded(true);
  };

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
          onLoadedData={handleReady}
          onCanPlay={handleReady}
          onError={handleError}
          poster={finalPoster}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          controls={controls}
          playsInline={playsInline}
          preload={preload}
          aria-label={alt}
        >
          {finalSrc ? <source src={finalSrc} type={mimeType || media?.mimeType} /> : null}
        </video>
      ) : (
        <img
          src={finalSrc}
          alt={alt}
          loading="lazy"
          className={`media-element ${mediaClassName} ${loaded ? "is-visible" : ""}`.trim()}
          onLoad={handleReady}
          onError={handleError}
        />
      )}

      {errored && <div className="media-fallback">Média indisponible</div>}
    </div>
  );
}
