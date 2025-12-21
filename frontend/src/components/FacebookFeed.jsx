// FacebookFeed.jsx
import StoriesFB from "../components/StoriesFB";
import CreatePostFB from "./CreatePostFB";
import SkeletonPost from "./SkeletonPost";
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/facebook-feed.css";
import { getAvatarStyle, getImageUrl } from "../utils/imageUtils";
import FBIcon from "../components/FBIcon";
import { io } from "socket.io-client";
import MediaRenderer from "./MediaRenderer";

/* Nouveau composant commentaires */
import CommentsModal from "../components/CommentsModal";
import "../styles/comments-modal.css";

/* ============================================================
   CONFIG RÉACTIONS (si tu veux réactiver plus tard)
============================================================ */
const REACTION_CONFIG = {
  like: { label: "J’aime", emoji: "👍" },
  love: { label: "J’adore", emoji: "❤️" },
  haha: { label: "Haha", emoji: "😂" },
  wow: { label: "Wouah", emoji: "😮" },
  sad: { label: "Triste", emoji: "😢" },
  angry: { label: "Grrr", emoji: "😡" },
};

function getReactionSummary(reactions = []) {
  if (!reactions || reactions.length === 0) return { total: 0, types: [] };

  const counts = {};
  reactions.forEach((r) => {
    if (!r?.type) return;
    counts[r.type] = (counts[r.type] || 0) + 1;
  });

  return {
    total: reactions.length,
    types: Object.keys(counts),
  };
}

/* ICON Pouce */
const svgThumb = (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
       viewBox="0 0 24 24" fill="none" stroke="#b0b3b8"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28
             a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7
             22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </svg>
);

export default function FacebookFeed() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const API_URL = import.meta.env.VITE_API_URL;
  const nav = useNavigate();

  const textButtonStyle = {
    background: "none",
    border: "none",
    padding: 0,
    margin: 0,
    color: "inherit",
    font: "inherit",
    cursor: "pointer",
  };

  /* EXTRACTION USER ID */
  let userId = null;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      userId = payload.id || payload._id || payload.userId || null;
    } catch {
      userId = null;
    }
  }

  /* =================================================================
        STATES DU FEED (AUCUN COMMENTAIRE ICI)
  ================================================================= */
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [hasMore, setHasMore] = useState(true);

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [expanded, setExpanded] = useState({});

  /* Nouveau système modal commentaires */
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [activePostForComments, setActivePostForComments] = useState(null);

  /* Media Viewer */
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [mediaViewer, setMediaViewer] = useState({ postId: null, index: 0 });

  const socketRef = useRef(null);

  const addOptimisticPost = (post) => {
    if (!post) return;
    setPosts((prev) => [post, ...prev]);
  };

  const applyCacheBust = (media = []) =>
    media.map((m) => {
      if (!m?.url) return m;
      if (m.url.startsWith("blob:")) return m;

      const cacheKey = Date.now();
      return {
        ...m,
        url: `${m.url}${m.url.includes("?") ? "&" : "?"}v=${cacheKey}`,
      };
    });

  const switchMediaToServer = (postId, mediaIndex, finalUrl) => {
    if (!postId || !finalUrl) return;

    setPosts((prev) =>
      prev.map((p) => {
        if (p._id !== postId || !p.media?.[mediaIndex]) return p;

        const updatedMedia = [...p.media];
        updatedMedia[mediaIndex] = {
          ...updatedMedia[mediaIndex],
          url: finalUrl,
          isLocal: false,
          previewUrl: undefined,
          serverUrl: undefined,
        };

        return { ...p, media: updatedMedia };
      })
    );
  };

  const preloadServerMedia = (postId, mediaIndex, serverPath) => {
    const finalUrl = getImageUrl(serverPath);
    if (!finalUrl) return;

    const img = new Image();
    img.onload = () => switchMediaToServer(postId, mediaIndex, serverPath);
    img.onerror = () => switchMediaToServer(postId, mediaIndex, serverPath);
    img.src = finalUrl;
  };

  const mergeMediaWithPreview = (postId, incomingMedia = [], existingMedia = []) =>
    incomingMedia.map((mediaItem, idx) => {
      const existing = existingMedia[idx];
      if (existing?.isLocal && existing?.url && mediaItem?.url) {
        const serverUrl = mediaItem.url;
        const mediaWithPreview = {
          ...mediaItem,
          url: existing.url,
          previewUrl: existing.url,
          serverUrl,
          isLocal: true,
        };

        if (mediaItem.type === "image") {
          preloadServerMedia(postId, idx, serverUrl);
        } else {
          switchMediaToServer(postId, idx, serverUrl);
        }

        return mediaWithPreview;
      }

      return mediaItem;
    });

  const replaceOptimisticPost = (tempId, savedPost) => {
    if (!tempId || !savedPost) return;

    const postWithCacheBust = {
      ...savedPost,
      media: applyCacheBust(savedPost.media),
    };

    setPosts((prev) => {
      const existing = prev.find((p) => p._id === tempId);
      const mergedMedia = mergeMediaWithPreview(
        postWithCacheBust._id || savedPost._id,
        postWithCacheBust.media,
        existing?.media
      );

      const nextPost = {
        ...postWithCacheBust,
        media: mergedMedia,
      };

      const exists = prev.some((p) => p._id === tempId);
      if (!exists) return [nextPost, ...prev];

      return prev.map((p) => (p._id === tempId ? nextPost : p));
    });
  };

  const removeOptimisticPost = (tempId) => {
    if (!tempId) return;
    setPosts((prev) => prev.filter((p) => p._id !== tempId));
  };

  /* =================================================================
        LOAD POSTS
  ================================================================= */
  const loadPosts = async (pageToLoad = page, isInitial = false) => {
    try {
      if (isInitial) setLoadingInitial(true);
      else setLoadingMore(true);

      const res = await fetch(
        `${API_URL}/posts/paginated?page=${pageToLoad}&limit=${limit}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json();
      if (!res.ok || !Array.isArray(data.posts)) {
        if (isInitial) setPosts([]);
        return;
      }

      if (isInitial) setPosts(data.posts);
      else setPosts((prev) => [...prev, ...data.posts]);

      setHasMore(Boolean(data.hasMore));
      setPage(pageToLoad);
    } catch (err) {
      console.error("LOAD POSTS ERROR:", err);
    } finally {
      isInitial ? setLoadingInitial(false) : setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadPosts(1, true);
  }, []);

  /* =================================================================
        SOCKET REALTIME
  ================================================================= */
  useEffect(() => {
    if (!token) return;

    const SOCKET_URL =
      import.meta.env.VITE_SOCKET_URL || "https://emploisfacile.org";

    const s = io(SOCKET_URL, {
      auth: { token },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionAttempts: 20,
    });

    socketRef.current = s;

    s.on("connect", () => console.log("📡 Socket connecté :", s.id));
    s.on("disconnect", (reason) => console.log("📡 Déconnecté :", reason));

    s.on("post:update", (updatedPost) => {
      if (!updatedPost?._id) return;

      setPosts((prev) =>
        prev.map((p) => (p._id === updatedPost._id ? updatedPost : p))
      );
    });

    s.on("post:new", (newPost) => {
      if (!newPost?._id) return;
      setPosts((prev) => [newPost, ...prev]);
    });

    return () => {
      try {
        s.disconnect();
      } catch {}
    };
  }, [token]);

  /* =================================================================
        SCROLL INFINI
  ================================================================= */
  const handleScroll = useCallback(() => {
    if (loadingMore || !hasMore) return;

    if (
      window.innerHeight + window.scrollY >=
      document.body.offsetHeight - 300
    ) {
      loadPosts(page + 1);
    }
  }, [loadingMore, hasMore, page]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () =>
      window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  /* =================================================================
        LIKE POST
  ================================================================= */
  const handleLike = async (post) => {
    try {
      const res = await fetch(`${API_URL}/posts/${post._id}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) return;

      setPosts((prev) =>
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
      console.log("LIKE ERROR:", err);
    }
  };

  /* =================================================================
        TEXTE TRONQUÉ
  ================================================================= */
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
          onClick={() =>
            setExpanded((prev) => ({ ...prev, [postId]: true }))
          }
          className="fb-see-more-btn"
        >
          Voir plus
        </button>
      </>
    );
  };

  /* =================================================================
        MEDIA VIEWER
  ================================================================= */
  const openMediaViewer = (postId, index) => {
    setMediaViewer({ postId, index });
    setMediaViewerOpen(true);
    document.body.classList.add("fb-no-scroll");
  };

  const openReels = (postId) => {
    if (!postId) return;
    nav(`/reels?videoId=${postId}`);
  };

  const closeMediaViewer = () => {
    setMediaViewerOpen(false);
    setMediaViewer({ postId: null, index: 0 });
    document.body.classList.remove("fb-no-scroll");
  };

  const showNextMedia = () => {
    setMediaViewer((prev) => {
      const post = posts.find((p) => p._id === prev.postId);
      if (!post?.media?.length) return prev;

      return {
        ...prev,
        index: (prev.index + 1) % post.media.length,
      };
    });
  };

  const showPrevMedia = () => {
    setMediaViewer((prev) => {
      const post = posts.find((p) => p._id === prev.postId);
      if (!post?.media?.length) return prev;

      return {
        ...prev,
        index:
          (prev.index - 1 + post.media.length) % post.media.length,
      };
    });
  };

  /* =================================================================
        OUVRIR / FERMER MODAL COMMENTAIRE
  ================================================================= */
  const openCommentsModal = (post) => {
    setActivePostForComments(post);
    setIsCommentsModalOpen(true);
  };

  const closeCommentsModal = () => {
    setActivePostForComments(null);
    setIsCommentsModalOpen(false);
  };

  const resolveMediaUrl = (media) => {
    if (!media?.url && !media?.previewUrl) return null;

    const candidate = media.previewUrl || media.url;
    if (media.isLocal || candidate?.startsWith("blob:")) return candidate;

    return getImageUrl(candidate);
  };

  /* =================================================================
        RENDER FEED
  ================================================================= */
  return (
    <div className="fb-feed">
      <CreatePostFB
        onOptimisticPost={addOptimisticPost}
        onPostCreated={replaceOptimisticPost}
        onPostError={removeOptimisticPost}
      />
      <StoriesFB />

      {/* LOADER INITIAL */}
      {loadingInitial &&
        [...Array(4)].map((_, i) => <SkeletonPost key={i} />)}

      {/* POSTS */}
      {!loadingInitial &&
        posts.map((post) => {
          const isPagePost = post.authorType === "page";
          const postAvatarStyle = getAvatarStyle(
            isPagePost ? post.page?.avatar : post.user?.avatar
          );
          const displayName = isPagePost ? post.page?.name : post.user?.name;
          const likes = post.likes?.length || 0;
          const commentsCount = post.comments?.length || 0;

          return (
            <article key={post._id} className="fb-post">

              {/* HEADER */}
              <div className="fb-post-header">
                <div
                  className="fb-post-avatar"
                  style={postAvatarStyle}
                />
                <div className="fb-post-user">
                  <div className="fb-post-author">{displayName}</div>
                  <div className="fb-post-meta">
                    {new Date(post.createdAt).toLocaleString()}
                  </div>
                </div>
                <button className="fb-post-menu-btn">⋮</button>
              </div>

              {/* TEXTE */}
              {post.text && (
                <div className="fb-post-text">
                  {truncateText(post.text, post._id)}
                </div>
              )}

              {/* MEDIA */}
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
                    const isLocalMedia = Boolean(m.isLocal);
                    const isVideo =
                      (m.type && m.type.startsWith("video")) ||
                      /(mp4|webm|mov)$/i.test(m.url || "");

                    if (!mediaUrl) return null;

                    return (
                      <div
                        key={idx}
                        className="fb-post-media"
                        onClick={() => {
                          if (isLocalMedia) return;
                          return isVideo
                            ? openReels(post._id)
                            : openMediaViewer(post._id, idx);
                        }}
                      >
                        <MediaRenderer
                          media={m}
                          src={mediaUrl}
                          type={m.type}
                          mimeType={m.mimeType}
                          mediaClassName={isVideo ? "fb-post-video" : "fb-post-image"}
                          className="fb-post-media-renderer"
                          alt=""
                          muted={isVideo}
                          autoPlay={m.autoPlay}
                          onExpand={() => openReels(post._id)}
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

              {/* STATS */}
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
                        onClick={() => nav(`/likes/${post._id}`)}
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

              {/* ACTIONS */}
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

      {/* INFINITE SCROLL LOADER */}
      {loadingMore && <SkeletonPost />}

      {/* =================================================================
            MEDIA VIEWER FULLSCREEN
      ================================================================= */}
      {mediaViewerOpen && (() => {
        const viewerPost = posts.find((p) => p._id === mediaViewer.postId);
        if (!viewerPost) return null;

        const viewerMedia = viewerPost.media?.[mediaViewer.index];
        if (!viewerMedia) return null;

        return (
          <div
            className="fb-media-viewer-backdrop"
            onClick={closeMediaViewer}
          >
            <div
              className="fb-media-viewer"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="fb-media-viewer-close"
                onClick={closeMediaViewer}
              >
                ✕
              </button>

              {viewerPost.media.length > 1 && (
                <button
                  className="fb-media-viewer-prev"
                  onClick={showPrevMedia}
                >
                  ‹
                </button>
              )}

              <div className="fb-media-viewer-content">
                {viewerMedia.type === "image" ? (
                  <img
                    src={getImageUrl(viewerMedia.url)}
                    className="fb-media-viewer-img"
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <video
                    className="fb-media-viewer-video"
                    controls
                    autoPlay
                  >
                    <source src={getImageUrl(viewerMedia.url)} />
                  </video>
                )}

                {viewerPost.media.length > 1 && (
                  <div className="fb-media-viewer-counter">
                    {mediaViewer.index + 1} / {viewerPost.media.length}
                  </div>
                )}
              </div>

              {viewerPost.media.length > 1 && (
                <button
                  className="fb-media-viewer-next"
                  onClick={showNextMedia}
                >
                  ›
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* =================================================================
            COMMENTS MODAL (NOUVEAU)
      ================================================================= */}
      {isCommentsModalOpen && activePostForComments && (
        <CommentsModal
          post={activePostForComments}
          onClose={closeCommentsModal}
        />
      )}
    </div>
  );
}
