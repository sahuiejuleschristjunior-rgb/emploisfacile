import { memo } from "react";
import SponsoredAdItem from "./SponsoredAdItem";

const SponsoredAdsList = memo(function SponsoredAdsList({
  ads,
  loading,
  error,
  onImpression,
  onClick,
}) {
  const showSkeleton = loading && (!ads || ads.length === 0);

  return (
    <section className="right-sidebar-section">
      <div className="right-sidebar-header">
        <h4 className="right-sidebar-title">Sponsorisé</h4>
      </div>

      {showSkeleton && (
        <div className="right-sidebar-skeleton-list">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="right-sidebar-skeleton-card">
              <div className="right-sidebar-skeleton thumb" />
              <div className="right-sidebar-skeleton-lines">
                <div className="right-sidebar-skeleton line" />
                <div className="right-sidebar-skeleton line short" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!showSkeleton && error && (
        <div className="right-sidebar-empty">{error}</div>
      )}

      {!showSkeleton && !error && (!ads || ads.length === 0) && (
        <div className="right-sidebar-empty">Aucune publicité pour le moment.</div>
      )}

      {!showSkeleton && !error && ads?.length > 0 && (
        <div className="right-sidebar-list">
          {ads.map((ad) => (
            <SponsoredAdItem
              key={ad.id}
              ad={ad}
              onImpression={onImpression}
              onClick={onClick}
            />
          ))}
        </div>
      )}
    </section>
  );
});

export default SponsoredAdsList;
