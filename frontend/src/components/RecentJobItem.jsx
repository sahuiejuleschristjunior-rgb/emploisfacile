import { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";

function formatRelativeDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "à l’instant";
  if (minutes < 60) return `il y a ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `il y a ${weeks} sem`;

  const months = Math.floor(days / 30);
  if (months < 12) return `il y a ${months} mois`;

  const years = Math.floor(days / 365);
  return `il y a ${years} an${years > 1 ? "s" : ""}`;
}

const RecentJobItem = memo(function RecentJobItem({ job }) {
  const navigate = useNavigate();

  const relativeDate = useMemo(
    () => formatRelativeDate(job?.createdAt),
    [job?.createdAt]
  );

  const handleClick = () => {
    if (!job?.jobId) return;
    navigate(`/emplois/${job.jobId}`);
  };

  return (
    <button type="button" className="recent-job-item" onClick={handleClick}>
      <div className="recent-job-title">{job?.title}</div>
      <div className="recent-job-meta">
        <span>{job?.company}</span>
        {job?.location && <span>• {job.location}</span>}
      </div>
      <div className="recent-job-foot">
        {job?.type && <span className="recent-job-type">{job.type}</span>}
        {relativeDate && <span className="recent-job-date">{relativeDate}</span>}
      </div>
    </button>
  );
});

export default RecentJobItem;
