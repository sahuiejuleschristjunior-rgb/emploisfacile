import React, { useMemo, useState } from "react";

export default function FacebookImage({
  src,
  alt = "",
  className = "",
  style = {},
  objectFit = "contain",
  height = "auto",
  onClick,
  ...rest
}) {
  const [loaded, setLoaded] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1);

  if (!src) return null;

  const wrapperClassName = ["fb-facebook-image-wrapper", className]
    .filter(Boolean)
    .join(" ");

  const handleImageLoad = (event) => {
    const { naturalWidth, naturalHeight } = event?.target || {};
    if (naturalWidth && naturalHeight) {
      setAspectRatio(naturalWidth / naturalHeight);
    }
    setLoaded(true);
  };

  const handleImageError = () => setLoaded(true);

  const computedAspectRatio = useMemo(
    () => (aspectRatio && Number.isFinite(aspectRatio) ? aspectRatio : 1),
    [aspectRatio]
  );

  return (
    <div
      className={wrapperClassName}
      style={{
        aspectRatio: computedAspectRatio,
        ...style,
      }}
      onClick={onClick}
    >
      {!loaded && <div className="media-skeleton" aria-hidden="true" />}

      <img
        src={src}
        alt={alt}
        className={`fb-facebook-image ${loaded ? "is-visible" : ""}`.trim()}
        style={{
          width: "100%",
          height,
          objectFit,
          display: "block",
          background: "#000",
        }}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading="lazy"
        {...rest}
      />
    </div>
  );
}
