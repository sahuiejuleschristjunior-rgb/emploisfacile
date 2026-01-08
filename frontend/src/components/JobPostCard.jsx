import PostCard from "./PostCard";

const getCompanyName = (job) =>
  job?.recruiter?.companyName || job?.recruiter?.name || job?.company || "Entreprise";

const getJobLogo = (job) => job?.recruiter?.avatar || job?.companyLogo || job?.logo || null;

const getJobImage = (job) =>
  job?.image ||
  job?.coverImage ||
  job?.banner ||
  job?.media?.[0]?.url ||
  job?.media?.[0] ||
  null;

export default function JobPostCard({ job }) {
  if (!job) return null;

  const jobImage = getJobImage(job);
  const post = {
    _id: job._id,
    isJobPost: true,
    createdAt: job.createdAt || job.date || job.updatedAt || new Date().toISOString(),
    jobData: {
      ...job,
      company: getCompanyName(job),
      logo: getJobLogo(job),
    },
    media: jobImage ? [{ url: jobImage, type: "image" }] : [],
    likes: [],
    comments: [],
  };

  return <PostCard post={post} context="jobs" />;
}
