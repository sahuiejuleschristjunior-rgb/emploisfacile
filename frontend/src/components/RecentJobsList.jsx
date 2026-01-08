import { memo, useMemo } from "react";
import RecentJobItem from "./RecentJobItem";

const RecentJobsList = memo(function RecentJobsList({ jobs, loading, error }) {
  const showSkeleton = loading && (!jobs || jobs.length === 0);
  const preparedJobs = useMemo(() => jobs || [], [jobs]);

  return (
    <section className="right-sidebar-section">
      <div className="right-sidebar-header">
        <h4 className="right-sidebar-title">Offres récentes</h4>
      </div>

      {showSkeleton && (
        <div className="right-sidebar-skeleton-list">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="right-sidebar-skeleton-job">
              <div className="right-sidebar-skeleton line" />
              <div className="right-sidebar-skeleton line short" />
            </div>
          ))}
        </div>
      )}

      {!showSkeleton && error && (
        <div className="right-sidebar-empty">{error}</div>
      )}

      {!showSkeleton && !error && preparedJobs.length === 0 && (
        <div className="right-sidebar-empty">Aucune offre récente pour le moment.</div>
      )}

      {!showSkeleton && !error && preparedJobs.length > 0 && (
        <div className="right-sidebar-list">
          {preparedJobs.map((job) => (
            <RecentJobItem key={job.jobId} job={job} />
          ))}
        </div>
      )}
    </section>
  );
});

export default RecentJobsList;
