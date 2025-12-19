import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getPageBySlug,
  toggleFollowPage,
  createPagePost,
  getPagePosts,
} from "../api/pagesApi";
import { getImageUrl } from "../utils/imageUtils";
import "../styles/page.css";

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

  if (loading) return <div className="page-shell page-profile-shell">Chargement...</div>;
  if (!pageData?.page)
    return <div className="page-shell page-profile-shell">Page introuvable</div>;

  const { page, permissions, isFollowing } = pageData;
  const coverUrl = getImageUrl(page.coverPhoto);
  const avatarUrl = getImageUrl(page.avatar);

  return (
    <div className="page-shell page-profile-shell">
      <div className="page-cover-wrapper">
        <div className="page-cover" style={{ backgroundImage: `url(${coverUrl})` }} />
        <div className="page-cover-overlay" />
        <div className="page-cover-content">
          <div
            className="page-avatar page-avatar-large"
            style={{ backgroundImage: `url(${avatarUrl})` }}
          />
          <div className="page-title-block">
            <h1>{page.name}</h1>
            <div className="page-meta">
              <span>{page.category || "Page"}</span>
              <span className="separator">•</span>
              <span>{page.followersCount || 0} abonnés</span>
            </div>
            {page.bio && <p className="page-short-bio">{page.bio}</p>}
          </div>
          <div className="page-action-buttons">
            <button
              className="btn-primary"
              onClick={handleFollow}
              disabled={followLoading}
            >
              {isFollowing ? "Abonné(e)" : "Suivre"}
            </button>
            <button className="btn-secondary" type="button">
              Partager
            </button>
          </div>
        </div>
      </div>

      <div className="page-nav">
        <div className="page-nav-links">
          <button className="nav-link active" type="button">
            Publications
          </button>
          <button className="nav-link" type="button" disabled>
            À propos
          </button>
          <button className="nav-link" type="button" disabled>
            Mentions J'aime
          </button>
          <button className="nav-link" type="button" disabled>
            Plus
          </button>
        </div>
        <div className="page-nav-meta">{posts.length} publication(s)</div>
      </div>

      <div className="page-body">
        <div className="page-left">
          <div className="page-info-card">
            <h3>À propos</h3>
            {page.bio ? (
              <p className="about-text">{page.bio}</p>
            ) : (
              <p className="about-text muted">
                Cette page n'a pas encore ajouté de description.
              </p>
            )}
            <div className="info-row">
              <span className="label">Catégorie</span>
              <span className="value">{page.category || "Non renseignée"}</span>
            </div>
            <div className="info-row">
              <span className="label">Abonnés</span>
              <span className="value">{page.followersCount || 0} personnes</span>
            </div>
            {permissions?.isAdmin && (
              <div className="info-row">
                <span className="label">Vous gérez cette page</span>
                <span className="value accent">Accès administrateur</span>
              </div>
            )}
          </div>

          <div className="page-media-card">
            <h3>Photos mises en avant</h3>
            <div className="media-grid">
              <div
                className="media-item cover"
                style={{ backgroundImage: `url(${coverUrl})` }}
              />
              <div
                className="media-item avatar"
                style={{ backgroundImage: `url(${avatarUrl})` }}
              />
            </div>
          </div>
        </div>

        <div className="page-right">
          {permissions?.isAdmin && (
            <div className="page-post-card page-post-creator">
              <div className="creator-header">Publier en tant que page</div>
              <textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="Exprimez-vous..."
              />
              <div className="creator-actions">
                <button className="btn-primary" onClick={handleCreatePost}>
                  Publier
                </button>
              </div>
            </div>
          )}

          <div className="page-posts">
            {posts.length === 0 && (
              <div className="empty">Aucun post pour le moment.</div>
            )}
            {posts.map((p) => (
              <div key={p._id} className="page-post-card">
                <div className="page-post-header">
                  <div
                    className="page-avatar"
                    style={{
                      backgroundImage: `url(${getImageUrl(p.page?.avatar || page.avatar)})`,
                    }}
                  />
                  <div>
                    <div className="page-post-author">{p.page?.name || page.name}</div>
                    <div className="page-meta">
                      {new Date(p.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <span className="post-badge">Publié par la page</span>
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
      </div>
    </div>
  );
}
