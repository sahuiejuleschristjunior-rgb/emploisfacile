import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getPageBySlug,
  toggleFollowPage,
  createPagePost,
  getPagePosts,
} from "../api/pagesApi";
import { getImageUrl } from "../utils/imageUtils";
import "../styles/page.css";
import Post from "../components/Post";
import CommentSection from "../components/CommentSection";

export default function PageProfile() {
  const { slug } = useParams();
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [postText, setPostText] = useState("");
  const [mediaItems, setMediaItems] = useState([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [posts, setPosts] = useState([]);
  const fileInputRef = useRef(null);

  const token = localStorage.getItem("token");
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  })();

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

  useEffect(() => {
    return () => {
      mediaItems.forEach((item) => item.preview && URL.revokeObjectURL(item.preview));
    };
  }, [mediaItems]);

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

  const resetMedia = () => {
    setMediaItems((prev) => {
      prev.forEach((item) => item.preview && URL.revokeObjectURL(item.preview));
      return [];
    });
  };

  const handleFileChange = (e) => {
    const incoming = Array.from(e.target.files || []);
    if (!incoming.length) return;

    const allowed = incoming.filter((file) =>
      ["image/", "video/"].some((t) => file.type.startsWith(t))
    );

    if (allowed.length === 0) return;

    const MAX_MEDIA = 10;
    const available = MAX_MEDIA - mediaItems.length;
    const toAdd = allowed.slice(0, Math.max(0, available));

    const mapped = toAdd.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setMediaItems((prev) => [...prev, ...mapped]);
    e.target.value = "";
  };

  const handleRemoveMedia = (index) => {
    setMediaItems((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return next;
    });
  };

  const handleCreatePost = async () => {
    if (!postText.trim() && mediaItems.length === 0) return;
    try {
      setCreateLoading(true);
      const res = await createPagePost(
        slug,
        { text: postText },
        mediaItems.map((m) => m.file)
      );
      if (res?._id) {
        setPosts((prev) => [res, ...(prev || [])]);
        setPostText("");
        resetMedia();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreateLoading(false);
    }
  };

  const updatePostState = (postId, updater) => {
    setPosts((prev) => prev.map((p) => (p._id === postId ? updater(p) : p)));
  };

  const handleLike = async (postId) => {
    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) return;

      const liked = data.liked;
      const userId = currentUser?._id;

      updatePostState(postId, (p) => {
        const hasLike = p.likes?.includes(userId);
        let newLikes = p.likes || [];

        if (liked && !hasLike) newLikes = [...newLikes, userId];
        if (!liked && hasLike) newLikes = newLikes.filter((l) => l !== userId);

        return { ...p, likes: newLikes };
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleComment = async (postId, text) => {
    try {
      const res = await fetch(`/api/posts/${postId}/comment`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const updated = await res.json();
      if (!res.ok) return;

      updatePostState(postId, () => updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReply = async (postId, commentId, text) => {
    try {
      const res = await fetch(`/api/posts/${postId}/comment/${commentId}/reply`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const updated = await res.json();
      if (!res.ok) return;

      updatePostState(postId, () => updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      const res = await fetch(`/api/posts/${postId}/comment/${commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const updated = await res.json();
      if (!res.ok) return;

      updatePostState(postId, () => updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteReply = async (postId, commentId, replyId) => {
    try {
      const res = await fetch(
        `/api/posts/${postId}/comment/${commentId}/reply/${replyId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const updated = await res.json();
      if (!res.ok) return;

      updatePostState(postId, () => updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm("Supprimer le post ?")) return;

    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p._id !== postId));
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
  const categoryLabel =
    page.categories?.length > 0
      ? page.categories.join(" • ")
      : page.category || "Page";

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
              <span>{categoryLabel}</span>
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
              <span className="value">{categoryLabel || "Non renseignée"}</span>
            </div>
            {page.location && (
              <div className="info-row">
                <span className="label">Localisation</span>
                <span className="value">{page.location}</span>
              </div>
            )}
            {page.phone && (
              <div className="info-row">
                <span className="label">Téléphone</span>
                <span className="value">{page.phone}</span>
              </div>
            )}
            {page.contact && (
              <div className="info-row">
                <span className="label">Email</span>
                <span className="value">{page.contact}</span>
              </div>
            )}
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
                <div className="creator-media-actions">
                  <button
                    type="button"
                    className="creator-attach-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📷 Ajouter photo / vidéo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                  {mediaItems.length > 0 && (
                    <span className="creator-media-count">
                      {mediaItems.length} média sélectionné(s)
                    </span>
                  )}
                </div>
                <button
                  className="btn-primary"
                  onClick={handleCreatePost}
                  disabled={createLoading}
                >
                  {createLoading ? "Publication..." : "Publier"}
                </button>
              </div>

              {mediaItems.length > 0 && (
                <div className="page-preview-grid">
                  {mediaItems.map((item, idx) => (
                    <div key={idx} className="page-preview-item">
                      <button
                        className="page-preview-remove"
                        type="button"
                        onClick={() => handleRemoveMedia(idx)}
                        aria-label="Retirer le média"
                      >
                        ✕
                      </button>

                      {item.file.type.startsWith("video/") ? (
                        <video src={item.preview} controls muted />
                      ) : (
                        <img src={item.preview} alt="Prévisualisation" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="page-posts">
            {posts.length === 0 && (
              <div className="empty">Aucun post pour le moment.</div>
            )}

            {posts.map((p) => (
              <div key={p._id} className="page-post-card">
                <Post
                  post={p}
                  currentUser={currentUser}
                  onLike={() => handleLike(p._id)}
                  onComment={(text) => handleComment(p._id, text)}
                  onReply={(commentId, text) => handleReply(p._id, commentId, text)}
                  onDeleteComment={(commentId) => handleDeleteComment(p._id, commentId)}
                  onDeleteReply={(commentId, replyId) =>
                    handleDeleteReply(p._id, commentId, replyId)
                  }
                  onDeletePost={() => handleDeletePost(p._id)}
                />

                <CommentSection
                  post={p}
                  onComment={(text) => handleComment(p._id, text)}
                  onReply={(commentId, text) => handleReply(p._id, commentId, text)}
                  onDeleteComment={(commentId) => handleDeleteComment(p._id, commentId)}
                  onDeleteReply={(commentId, replyId) =>
                    handleDeleteReply(p._id, commentId, replyId)
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentSection({ post, onComment, onReply, onDeleteComment, onDeleteReply }) {
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(false);

  let currentUser = null;
  try {
    currentUser = JSON.parse(localStorage.getItem("user"));
  } catch {}

  const send = async () => {
    if (!text.trim()) return;

    setLoading(true);

    if (replyTo) await onReply(replyTo.id, text);
    else await onComment(text);

    setText("");
    setReplyTo(null);
    setLoading(false);
  };

  return (
    <div className="comment-section">
      <div className="comment-input-wrapper">
        <input
          id={`comment-box-${post._id || post.id}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            replyTo ? `Répondre à ${replyTo.name}` : "Ajouter un commentaire…"
          }
          className="comment-input"
        />

        {loading ? (
          <div className="heartbeat"></div>
        ) : (
          <button className="comment-send-btn" onClick={send}>
            Envoyer
          </button>
        )}
      </div>

      {(post.comments || []).map((c) => {
        const isCommentAuthor =
          String(c.user?._id) === String(currentUser?._id);

        return (
          <div key={c._id} className="comment-item">
            <div className="comment-avatar" />

            <div className="comment-content">
              <div className="comment-header">
                <strong>{c.user?.name}</strong>
                <span className="comment-date">
                  {new Date(c.createdAt).toLocaleString()}
                </span>

                <div className="comment-menu">
                  <button className="comment-menu-btn">⋮</button>

                  <div className="comment-menu-popup">
                    <button onClick={() => setReplyTo({ id: c._id, name: c.user?.name })}>
                      Répondre
                    </button>

                    {isCommentAuthor && (
                      <button
                        className="delete-btn"
                        onClick={() => onDeleteComment(c._id)}
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="comment-text">{c.text}</div>

              <div className="reply-list">
                {(c.replies || []).map((r) => {
                  const isReplyAuthor =
                    String(r.user?._id) === String(currentUser?._id);

                  return (
                    <div key={r._id} className="reply-item">
                      <div className="reply-avatar" />

                      <div className="reply-content">
                        <div className="comment-header">
                          <strong>{r.user?.name}</strong>
                          <span className="comment-date">
                            {new Date(r.createdAt).toLocaleString()}
                          </span>

                          <div className="comment-menu">
                            <button className="comment-menu-btn">⋮</button>
                            <div className="comment-menu-popup">
                              {isReplyAuthor && (
                                <button
                                  className="delete-btn"
                                  onClick={() => onDeleteReply(c._id, r._id)}
                                >
                                  Supprimer
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="comment-text">{r.text}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
