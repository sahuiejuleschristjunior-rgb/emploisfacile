import { memo, useCallback, useEffect, useRef } from "react";
import { getImageUrl } from "../utils/imageUtils";

const SponsoredAdItem = memo(function SponsoredAdItem({ ad, onImpression, onClick }) {
  const itemRef = useRef(null);
  const hasTrackedRef = useRef(false);

  const handleClick = useCallback(
    (event) => {
      if (!ad?.url) {
        event.preventDefault();
        return;
      }
      onClick?.(ad.id);
    },
    [ad?.id, ad?.url, onClick]
  );

  useEffect(() => {
    if (!itemRef.current || hasTrackedRef.current) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTrackedRef.current) {
          hasTrackedRef.current = true;
          onImpression?.(ad.id);
          observer.disconnect();
        }
      },
      { threshold: 0.6 }
    );

    observer.observe(itemRef.current);

    return () => observer.disconnect();
  }, [ad.id, onImpression]);

  const imageUrl = ad?.image ? getImageUrl(ad.image) : "";

  return (
    <a
      ref={itemRef}
      className="sponsored-ad-item"
      href={ad?.url || "#"}
      target="_blank"
      rel="noreferrer"
      onClick={handleClick}
    >
      <div className="sponsored-ad-thumb-wrapper">
        {imageUrl ? (
          <img src={imageUrl} alt={ad?.title || "Publicité"} className="sponsored-ad-thumb" loading="lazy" />
        ) : (
          <div className="sponsored-ad-thumb placeholder" />
        )}
      </div>
      <div className="sponsored-ad-content">
        <div className="sponsored-ad-badge">Sponsorisé</div>
        <div className="sponsored-ad-title">{ad?.title || "Annonce"}</div>
        {ad?.description && (
          <div className="sponsored-ad-desc">{ad.description}</div>
        )}
        <div className="sponsored-ad-advertiser">{ad?.advertiserName || ""}</div>
      </div>
    </a>
  );
});

export default SponsoredAdItem;
