import { useCallback, useEffect, useMemo, useState } from "react";
import CreatePostFB from "../components/CreatePostFB";
import CommentsModal from "../components/CommentsModal";
import MediaRenderer from "../components/MediaRenderer";
import FBIcon from "../components/FBIcon";
import SkeletonPost from "../components/SkeletonPost";
import StoriesFB from "../components/StoriesFB";
import { getAvatarStyle, getImageUrl } from "../utils/imageUtils";
import "../styles/facebook-feed.css";

const API_URL = import.meta.env.VITE_API_URL;

export default function PagesFeed() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const [rawPool, setRawPool] = useState([]);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [activePostForComments, setActivePostForComments] = useState(null);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);

  const buildPageFeed = useCallback((source = []) => {
    const seenProfiles = new Set();

    const sorted = [...source].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const curated = [];

    sorted.forEach((post) => {
      if (!post) return;
      if (post.page) {
        curated.push(post);
        return;
      }

      const userId = post.user?._id || post.user?.id;
      if (!userId || seenProfiles.has(userId)) return;

      seenProfiles.add(userId);
      curated.push(post);
    });

    return curated;
  }, []);

  const mergeIntoPool = useCallback((incoming = [], reset = false) => {
    setRawPool((prev) => {
      const base = reset ? [] : prev;
      const map = new Map(base.map((p) => [p?._id, p]));

      incoming.forEach((post) => {
        if (post?._id) map.set(post._id, post);
      });

      return Array.from(map.values());
    });
  }, []);

  useEffect(() => {
    setPosts(buildPageFeed(rawPool));
  }, [rawPool, buildPageFeed]);

  const loadPosts = useCallback(
    async (pageToLoad = page, isInitial = false) => {
      if (!token) return;

      try {
        if (isInitial) setLoading(true);
        else setLoadingMore(true);

      const res = await fetch(
        `${API_URL}/posts/paginated?page=${pageToLoad}&limit=10&includeAds=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

        const data = await res.json();
        if (!res.ok || !Array.isArray(data.posts)) {
          if (isInitial) setRawPool([]);
          return;
        }

        mergeIntoPool(data.posts, isInitial);
        setHasMore(Boolean(data.hasMore));
        setPage(pageToLoad);
      } catch (err) {
        console.error("Erreur chargement feed des pages", err);
      } finally {
        isInitial ? setLoading(false) : setLoadingMore(false);
      }
    },
    [API_URL, mergeIntoPool, page, token]
  );

  useEffect(() => {
    loadPosts(1, true);
  }, [loadPosts]);

  const handleScroll = useCallback(() => {
    if (!hasMore || loadingMore) return;

    if (
      window.innerHeight + window.scrollY >= document.body.offsetHeight - 300
    ) {
      loadPosts(page + 1);
    }
  }, [hasMore, loadingMore, loadPosts, page]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const addOptimisticPost = (post) => {
    if (!post) return;
    mergeIntoPool([post]);
  };

  const replaceOptimisticPost = (tempId, savedPost) => {
    if (!tempId || !savedPost) return;
    mergeIntoPool([{ ...savedPost }]);
  };

  const removeOptimisticPost = (tempId) => {
    if (!tempId) return;
    setRawPool((prev) => prev.filter((p) => p._id !== tempId));
  };

  const handleLike = async (post) => {
    try {
      const res = await fetch(`${API_URL}/posts/${post._id}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) return;

      setRawPool((prev) =>
        prev.map((p) =>
          p._id === post._id
            ? {
                ...p,
                likes: data.liked
                  ? [...(p.likes || []), "you"]
                  : (p.likes || []).filter((id) => id !== "you"),
              }
            : p
        )
      );
    } catch (err) {
      console.error("Erreur like", err);
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      const res = await fetch(`${API_URL}/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setRawPool((prev) => prev.filter((p) => p._id !== postId));
      }
    } catch (err) {
      console.error("Erreur suppression post", err);
    }
  };

  const openCommentsModal = (post) => {
    setActivePostForComments(post);
    setIsCommentsModalOpen(true);
  };

  const closeCommentsModal = () => {
    setActivePostForComments(null);
    setIsCommentsModalOpen(false);
  };

  const truncateText = (text, postId) => {
    if (!text) return "";
    const limit = 180;
    const isExpanded = expanded[postId];

    if (text.length <= limit || isExpanded) {
      return (
        <>
          {text}
          {text.length > limit && (
            <button
              onClick={() =>
                setExpanded((prev) => ({ ...prev, [postId]: false }))
              }
              className="fb-see-more-btn"
            >
              Voir moins
            </button>
          )}
        </>
      );
    }

    return (
      <>
        {text.slice(0, limit)}…
        <button
          onClick={() => setExpanded((prev) => ({ ...prev, [postId]: true }))}
          className="fb-see-more-btn"
        >
          Voir plus
        </button>
      </>
    );
  };

  const resolveMediaUrl = (media) => {
    if (!media?.url && !media?.previewUrl) return null;

    const candidate = media.previewUrl || media.url;
    if (media.isLocal || candidate?.startsWith("blob:")) return candidate;

    return getImageUrl(candidate);
  };

  const textButtonStyle = useMemo(
    () => ({
      background: "none",
      border: "none",
      padding: 0,
      margin: 0,
      color: "inherit",
      font: "inherit",
      cursor: "pointer",
    }),
    []
  );

  return (
    <div className="fb-feed">
      <CreatePostFB
        onOptimisticPost={addOptimisticPost}
        onPostCreated={replaceOptimisticPost}
        onPostError={removeOptimisticPost}
      />

      <StoriesFB />

      {loading && [...Array(4)].map((_, i) => <SkeletonPost key={i} />)}

      {!loading &&
        posts.map((post) => {
          const isPagePost = post.authorType === "page" || Boolean(post.page);
          const postAvatarStyle = getAvatarStyle(
            isPagePost ? post.page?.avatar : post.user?.avatar
          );
          const displayName = isPagePost ? post.page?.name : post.user?.name;
          const likes = post.likes?.length || 0;
          const commentsCount = post.comments?.length || 0;

          return (
            <article key={post._id} className="fb-post">
              <div className="fb-post-header">
                <div className="fb-post-avatar" style={postAvatarStyle} />
                <div className="fb-post-user">
                  <div className="fb-post-author">{displayName}</div>
                  <div className="fb-post-meta">
                    {new Date(post.createdAt).toLocaleString()}
                  </div>
                </div>
                <button
                  className="fb-post-menu-btn"
                  onClick={() => {
                    if (window.confirm("Supprimer la publication ?")) {
                      handleDeletePost(post._id);
                    }
                  }}
                >
                  ⋮
                </button>
              </div>

              {post.text && (
                <div className="fb-post-text">
                  {truncateText(post.text, post._id)}
                </div>
              )}

              {post.media?.length > 0 && (
                <div
                  className={
                    post.media.length === 1
                      ? "fb-post-media-wrapper fb-post-media-wrapper--single"
                      : "fb-post-media-wrapper fb-post-media-wrapper--multi"
                  }
                >
                  {post.media.map((m, idx) => {
                    const mediaUrl = resolveMediaUrl(m);
                    const isVideo =
                      (m.type && m.type.startsWith("video")) ||
                      /(mp4|webm|mov)$/i.test(m.url || "");

                    if (!mediaUrl) return null;

                    return (
                      <div key={idx} className="fb-post-media">
                        <MediaRenderer
                          media={m}
                          src={mediaUrl}
                          type={m.type}
                          mimeType={m.mimeType}
                          mediaClassName={
                            isVideo ? "fb-post-video" : "fb-post-image"
                          }
                          className="fb-post-media-renderer"
                          alt=""
                          muted={isVideo}
                          autoPlay={m.autoPlay}
                        />

                        {post.media.length > 4 &&
                          idx === 3 && (
                            <div className="fb-post-media-more">
                              +{post.media.length - 4}
                            </div>
                          )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="fb-post-stats">
                <div className="fb-post-stats-left">
                  {likes > 0 && (
                    <>
                      <span className="fb-reactions-bubble">
                        <FBIcon name="like" size={14} />
                      </span>
                      <button
                        type="button"
                        className="fb-post-stats-text"
                        style={textButtonStyle}
                      >
                        {likes} j’aime
                      </button>
                    </>
                  )}
                </div>

                <div className="fb-post-stats-right">
                  <button
                    type="button"
                    className="fb-post-stats-text fb-comments-link"
                    style={textButtonStyle}
                    onClick={() => openCommentsModal(post)}
                  >
                    {commentsCount} commentaires
                  </button>
                </div>
              </div>

              <div className="fb-post-actions">
                <button
                  className="fb-post-action-btn"
                  onClick={() => handleLike(post)}
                >
                  <FBIcon name="like" size={18} /> J’aime
                </button>

                <button
                  className="fb-post-action-btn"
                  onClick={() => openCommentsModal(post)}
                >
                  <FBIcon name="comment" size={18} /> Commenter
                </button>

                <button
                  className="fb-post-action-btn"
                  onClick={() =>
                    navigator.clipboard.writeText(
                      `${window.location.origin}/post/${post._id}`
                    )
                  }
                >
                  <FBIcon name="share" size={18} /> Partager
                </button>
              </div>
            </article>
          );
        })}

      {loadingMore && <SkeletonPost />}

      {isCommentsModalOpen && activePostForComments && (
        <CommentsModal
          post={activePostForComments}
          onClose={closeCommentsModal}
        />
      )}
    </div>
  );
}
