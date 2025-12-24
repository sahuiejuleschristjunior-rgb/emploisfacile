// FacebookFeed.jsx
import StoriesFB from "../components/StoriesFB";
import CreatePostFB from "./CreatePostFB";
import SkeletonPost from "./SkeletonPost";
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/facebook-feed.css";
import "../styles/post.css";
import { getAvatarStyle, getImageUrl } from "../utils/imageUtils";
import FBIcon from "../components/FBIcon";
import { io } from "socket.io-client";
import MediaRenderer from "./MediaRenderer";

/* Nouveau composant commentaires */
import CommentsModal from "../components/CommentsModal";
import "../styles/comments-modal.css";
import PostEditModal from "./PostEditModal";

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
  let userRole = null;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      userId = payload.id || payload._id || payload.userId || null;
      userRole = payload.role || null;
    } catch {
      userId = null;
      userRole = null;
    }
  }

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  })();

  if (!userRole) {
    userRole = currentUser?.role || null;
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
  const [menuOpen, setMenuOpen] = useState({});
  const [editingPost, setEditingPost] = useState(null);
  const [actionToast, setActionToast] = useState("");

  /* Nouveau système modal commentaires */
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [activePostForComments, setActivePostForComments] = useState(null);

  /* Media Viewer */
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [mediaViewer, setMediaViewer] = useState({ postId: null, index: 0 });

  const [sponsorModalPost, setSponsorModalPost] = useState(null);
  const [budgetTotal, setBudgetTotal] = useState("");
  const [budgetDaily, setBudgetDaily] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sponsorError, setSponsorError] = useState("");
  const [sponsorLoading, setSponsorLoading] = useState(false);
  const [sponsorToast, setSponsorToast] = useState("");

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
        `${API_URL}/posts/paginated?page=${pageToLoad}&limit=${limit}&includeAds=1`,
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
        MENU HELPERS
  ================================================================= */
  useEffect(() => {
    const closeAllMenus = () => setMenuOpen({});
    document.addEventListener("click", closeAllMenus);
    return () => document.removeEventListener("click", closeAllMenus);
  }, []);

  const toggleMenu = (e, postId) => {
    e?.stopPropagation();
    setMenuOpen((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const closeMenu = (postId) =>
    setMenuOpen((prev) => ({ ...prev, [postId]: false }));

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
        ACTIONS CONTEXT MENU
  ================================================================= */
  const isAdminRole = () => {
    if (!userRole) return false;
    return String(userRole).toLowerCase().includes("admin");
  };

  const handleDeletePost = async (postId) => {
    if (!postId || !token) return;

    try {
      const res = await fetch(`${API_URL}/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return;

      setPosts((prev) => prev.filter((p) => p._id !== postId));
      closeMenu(postId);
    } catch (err) {
      console.error("DELETE POST ERROR:", err);
    }
  };

  const handleHidePost = (postId) => {
    if (!postId) return;
    setPosts((prev) => prev.filter((p) => p._id !== postId));
    closeMenu(postId);
  };

  const handleReportPost = async (postId) => {
    if (!postId) return;
    try {
      const res = await fetch(`${API_URL}/posts/${postId}/report`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error("REPORT_FAILED");
      setActionToast("Signalement envoyé");
    } catch (err) {
      console.error("REPORT ERROR:", err);
      setActionToast("Impossible de signaler pour le moment.");
    } finally {
      closeMenu(postId);
      setTimeout(() => setActionToast(""), 2500);
    }
  };

  const handlePostUpdated = (updated) => {
    if (!updated?._id) return;
    setPosts((prev) =>
      prev.map((p) =>
        p._id === updated._id
          ? {
              ...p,
              ...updated,
              media: applyCacheBust(updated.media),
            }
          : p
      )
    );
    setEditingPost(null);
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

  const isPostPublic = (post) =>
    Boolean(
      post?.privacy === "public" ||
        post?.visibility === "public" ||
        post?.audience === "public" ||
        post?.isPublic === true ||
        (!post?.privacy && !post?.visibility && post?.isPublic !== false)
    );

  const canSponsorPost = (post) => {
    if (!post) return false;
    const isAuthor = String(post.user?._id) === String(userId);
    const pageOwnerId = post.page?.owner?._id || post.page?.owner || post.pageOwnerId;
    const pageAdminIds = Array.isArray(post.page?.admins)
      ? post.page.admins
          .map((admin) => admin?._id || admin)
          .filter(Boolean)
          .map(String)
      : [];
    const isPageOwner = Boolean(
      (pageOwnerId && String(pageOwnerId) === String(userId)) ||
        pageAdminIds.includes(String(userId))
    );

    return (isAuthor || isPageOwner) && !post.isSponsored && isPostPublic(post);
  };

  const resetSponsorForm = () => {
    setBudgetTotal("");
    setBudgetDaily("");
    setStartDate("");
    setEndDate("");
  };

  const closeSponsorModal = () => {
    setSponsorModalPost(null);
    resetSponsorForm();
    setSponsorError("");
  };

  const handleSponsorSubmit = async (e) => {
    e.preventDefault();
    if (!sponsorModalPost?._id) return;
    if (!token) {
      setSponsorError("Connexion requise pour sponsoriser.");
      return;
    }

    setSponsorError("");
    setSponsorLoading(true);

    try {
      const res = await fetch(`${API_URL}/ads/create/${sponsorModalPost._id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          budgetTotal: Number(budgetTotal),
          budgetDaily: Number(budgetDaily),
          startDate,
          endDate,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Impossible de lancer la campagne.");
      }

      setPosts((prev) =>
        prev.map((p) =>
          p._id === sponsorModalPost._id ? { ...p, isSponsored: true } : p
        )
      );

      closeSponsorModal();
      setSponsorToast("Campagne lancée");
      setTimeout(() => setSponsorToast(""), 3500);
    } catch (err) {
      setSponsorError(err.message || "Erreur inconnue");
    } finally {
      setSponsorLoading(false);
    }
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

          const canSponsor = canSponsorPost(post);
          const isSponsored = Boolean(post.isSponsored);

          const pageOwnerId = post.page?.owner?._id || post.page?.owner;
          const pageAdminIds = Array.isArray(post.page?.admins)
            ? post.page.admins
                .map((admin) => admin?._id || admin)
                .filter(Boolean)
                .map(String)
            : [];
          const isPageOwner = Boolean(
            (pageOwnerId && String(pageOwnerId) === String(userId)) ||
              pageAdminIds.includes(String(userId))
          );

          const isOwner =
            userId &&
            ((post.user?._id && String(post.user._id) === String(userId)) ||
              isPageOwner);
          const isAdmin = isAdminRole();
          const canEdit = isOwner;
          const canDelete = isOwner || isAdmin;
          const canHide = true;
          const canReport = !isOwner;

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
                    {isSponsored && (
                      <span className="fb-sponsored-badge">Sponsorisé</span>
                    )}
                  </div>
                </div>
                <div className="fb-post-menu-wrapper" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="fb-post-menu-btn"
                    onClick={(e) => toggleMenu(e, post._id)}
                  >
                    ⋯
                  </button>

                  {menuOpen[post._id] && (
                    <div className="fb-post-menu-dropdown">
                      {canEdit && (
                        <button
                          className="fb-post-menu-item"
                          onClick={() => {
                            setEditingPost(post);
                            closeMenu(post._id);
                          }}
                        >
                          Modifier
                        </button>
                      )}

                      {canDelete && (
                        <button
                          className="fb-post-menu-item"
                          onClick={() => handleDeletePost(post._id)}
                        >
                          Supprimer
                        </button>
                      )}

                      {canHide && (
                        <button
                          className="fb-post-menu-item"
                          onClick={() => handleHidePost(post._id)}
                        >
                          Masquer la publication
                        </button>
                      )}

                      {canReport && (
                        <button
                          className="fb-post-menu-item"
                          onClick={() => handleReportPost(post._id)}
                        >
                          Signaler
                        </button>
                      )}
                    </div>
                  )}
                </div>
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

                {canSponsor && (
                  <button
                    className="fb-post-action-btn fb-sponsor-menu"
                    onClick={() => {
                      setSponsorModalPost(post);
                      setSponsorError("");
                      resetSponsorForm();
                    }}
                  >
                    <span className="fb-sponsor-icon" aria-hidden="true">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M4 14.5V5.8c0-.6.4-1.1 1-1.3l10.3-3.3c.8-.2 1.6.4 1.6 1.2V6l2.3.7c.5.2.8.6.8 1.1v4.4c0 .5-.3 1-.8 1.1l-2.3.7v3.5c0 .8-.8 1.4-1.6 1.2L5 15.7c-.6-.2-1-.7-1-1.2Z" />
                        <path d="M4 18.5c0-1 .9-1.8 2-1.5l2.4.7c.9.3 1.6 1.1 1.6 2v2.5c0 1-.9 1.8-2 1.5l-2.4-.7c-.9-.3-1.6-1.1-1.6-2v-2.5Z" />
                      </svg>
                    </span>
                    Sponsoriser
                  </button>
                )}
              </div>
            </article>
          );
        })}

      {/* INFINITE SCROLL LOADER */}
      {loadingMore && <SkeletonPost />}

      {sponsorModalPost && (
        <div className="fb-sponsor-modal-overlay" onClick={closeSponsorModal}>
          <div
            className="fb-sponsor-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fb-sponsor-modal-header">
              <div className="fb-sponsor-title">Sponsoriser la publication</div>
              <button
                type="button"
                className="fb-sponsor-close"
                onClick={closeSponsorModal}
              >
                ✕
              </button>
            </div>

            <form className="fb-sponsor-form" onSubmit={handleSponsorSubmit}>
              <label className="fb-sponsor-field">
                <span>Budget total</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetTotal}
                  onChange={(e) => setBudgetTotal(e.target.value)}
                  required
                />
              </label>

              <label className="fb-sponsor-field">
                <span>Budget journalier</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetDaily}
                  onChange={(e) => setBudgetDaily(e.target.value)}
                  required
                />
              </label>

              <label className="fb-sponsor-field">
                <span>Date début</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </label>

              <label className="fb-sponsor-field">
                <span>Date fin</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </label>

              {sponsorError && (
                <div className="fb-sponsor-error">{sponsorError}</div>
              )}

              <div className="fb-sponsor-actions">
                <button
                  type="button"
                  className="fb-sponsor-cancel"
                  onClick={closeSponsorModal}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="fb-sponsor-submit"
                  disabled={sponsorLoading}
                >
                  {sponsorLoading ? "Lancement..." : "Lancer la campagne"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {sponsorToast && <div className="fb-sponsor-toast">{sponsorToast}</div>}

      {actionToast && <div className="fb-action-toast">{actionToast}</div>}

      {editingPost && (
        <PostEditModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onPostUpdated={handlePostUpdated}
        />
      )}

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
