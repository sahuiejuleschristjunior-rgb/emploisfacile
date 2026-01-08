import { useEffect, useMemo, useState } from "react";
import FacebookImage from "./FacebookImage";
import SmartVideo from "./SmartVideo";
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
  onClick,
  alt = "",
  onLoadedMetadata,
  style,
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

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
  }, [finalSrc, resolvedType]);

  const handleImageLoad = () => {
    setLoaded(true);
  };

  const handleVideoLoadedData = () => {
    setLoaded(true);
  };

  const handleError = () => {
    setErrored(true);
    setLoaded(true);
  };

  return (
    <div
      className={`media-renderer fb-media ${className}`.trim()}
      onClick={showVideo ? undefined : onClick}
      style={style}
    >
      {!loaded && <div className="media-skeleton" aria-hidden="true" />}

      {showVideo ? (
        <SmartVideo
          videoClassName={`media-element ${mediaClassName} ${loaded ? "is-visible" : ""}`.trim()}
          src={finalSrc}
          poster={finalPoster}
          onLoadedData={handleVideoLoadedData}
          onLoadedMetadata={onLoadedMetadata}
          onError={handleError}
          ariaLabel={alt}
          onClick={onClick}
        />
      ) : (
        <FacebookImage
          src={finalSrc}
          alt={alt}
          className={`media-element ${mediaClassName} ${loaded ? "is-visible" : ""}`.trim()}
          onLoad={handleImageLoad}
          onError={handleError}
          onClick={onClick}
        />
      )}

      {errored && <div className="media-fallback">Média indisponible</div>}
    </div>
  );
}
