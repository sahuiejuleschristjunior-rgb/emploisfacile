import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getPageBySlug,
  toggleFollowPage,
  createPagePost,
  getPagePosts,
} from "../api/pagesApi";
import { getImageUrl } from "../utils/imageUtils";

export default function PageProfile() {
  const { slug } = useParams();
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [postText, setPostText] = useState("");
  const [posts, setPosts] = useState([]);

  const loadPage = async () => {
    try {
      const res = await getPageBySlug(slug);
      setPageData(res);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      const res = await getPagePosts(slug, 1, 10);
      if (Array.isArray(res.posts)) setPosts(res.posts);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadPage();
    loadPosts();
  }, [slug]);

  const handleFollow = async () => {
    if (!pageData) return;
    setFollowLoading(true);
    try {
      const res = await toggleFollowPage(slug);
      setPageData((prev) =>
        prev
          ? {
              ...prev,
              isFollowing: res.following,
              page: {
                ...prev.page,
                followersCount: res.followersCount,
                followers: prev.page.followers,
              },
            }
          : prev
      );
    } finally {
      setFollowLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!postText.trim()) return;
    try {
      const res = await createPagePost(slug, { text: postText });
      if (res?._id) {
        setPosts((prev) => [res, ...(prev || [])]);
        setPostText("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="page-shell">Chargement...</div>;
  if (!pageData?.page) return <div className="page-shell">Page introuvable</div>;

  const { page, permissions, isFollowing } = pageData;
  const coverUrl = getImageUrl(page.coverPhoto);
  const avatarUrl = getImageUrl(page.avatar);

  return (
    <div className="page-shell">
      <div className="page-cover" style={{ backgroundImage: `url(${coverUrl})` }} />
      <div className="page-header">
        <div className="page-header-left">
          <div
            className="page-avatar"
            style={{ backgroundImage: `url(${avatarUrl})` }}
          />
          <div>
            <h1>{page.name}</h1>
            <div className="page-meta">
              <span>{page.category}</span>
              <span>•</span>
              <span>{page.followersCount || 0} abonnés</span>
            </div>
            {page.bio && <p className="page-bio">{page.bio}</p>}
          </div>
        </div>
        <div className="page-header-actions">
          <button
            className="btn-primary"
            onClick={handleFollow}
            disabled={followLoading}
          >
            {isFollowing ? "Se désabonner" : "Suivre"}
          </button>
        </div>
      </div>

      {permissions?.isAdmin && (
        <div className="page-post-creator">
          <h3>Publier en tant que page</h3>
          <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            placeholder="Exprimez-vous..."
          />
          <button className="btn-primary" onClick={handleCreatePost}>
            Publier
          </button>
        </div>
      )}

      <div className="page-posts">
        <h3>Publications</h3>
        {posts.length === 0 && <div className="empty">Aucun post pour le moment.</div>}
        {posts.map((p) => (
          <div key={p._id} className="page-post-item">
            <div className="page-post-header">
              <div
                className="page-avatar"
                style={{ backgroundImage: `url(${getImageUrl(p.page?.avatar || page.avatar)})` }}
              />
              <div>
                <div className="page-post-author">{p.page?.name || page.name}</div>
                <div className="page-meta">
                  {new Date(p.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
            {p.text && <div className="page-post-text">{p.text}</div>}
            {p.media?.length > 0 && (
              <div className="page-post-media">
                {p.media.map((m, idx) => (
                  <img key={idx} src={getImageUrl(m.url)} alt="media" />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
