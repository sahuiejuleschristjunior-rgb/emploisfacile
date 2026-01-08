import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PostCard from "./PostCard";
import SmartVideo from "./SmartVideo";
import SkeletonPost from "./SkeletonPost";
import PostEditModal from "./PostEditModal";
import CommentsModal from "./CommentsModal";
import { getImageUrl } from "../utils/imageUtils";
import { rememberHiddenPost } from "../utils/hiddenPosts";
import { sharePost } from "../api/posts";
import "../styles/facebook-feed.css";
import "../styles/post.css";
import "../styles/comments-modal.css";

export default function PostFeed({
  posts,
  setPosts,
  currentUserId,
  isAdmin = false,
  token,
  apiUrl,
  filterPosts = (list) => list,
  context = "feed",
  loadingInitial = false,
  loadingMore = false,
  focusPostId,
  focusCommentId,
  focusReplyId,
  fromNotification = false,
}) {
  const nav = useNavigate();
  const [actionMenuPostId, setActionMenuPostId] = useState(null);
  const [editModalPost, setEditModalPost] = useState(null);
  const [sharingPostIds, setSharingPostIds] = useState({});
  const [sponsorModalPost, setSponsorModalPost] = useState(null);
  const [budgetTotal, setBudgetTotal] = useState("");
  const [budgetDaily, setBudgetDaily] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sponsorError, setSponsorError] = useState("");
  const [sponsorLoading, setSponsorLoading] = useState(false);
  const [sponsorToast, setSponsorToast] = useState("");
  const [activePostForComments, setActivePostForComments] = useState(null);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [mediaViewer, setMediaViewer] = useState({ postId: null, index: 0 });
  const [openCommentsForPostId, setOpenCommentsForPostId] = useState(null);
  const [hasOpenedComments, setHasOpenedComments] = useState(false);

  useEffect(() => {
    const closeMenusOnClickOutside = (event) => {
      if (!event.target.closest(".fb-post-menu-container")) {
        setActionMenuPostId(null);
      }
    };

    document.addEventListener("click", closeMenusOnClickOutside);
    return () => document.removeEventListener("click", closeMenusOnClickOutside);
  }, []);

  useEffect(() => {
    setHasOpenedComments(false);
  }, [focusPostId, focusCommentId, focusReplyId]);

  const resolveMediaUrl = (media) => {
    if (!media?.url && !media?.previewUrl) return null;

    const candidate = media.previewUrl || media.url;
    if (media.isLocal || candidate?.startsWith("blob:")) return candidate;

    return getImageUrl(candidate);
  };

  const isImageMedia = (media) => {
    if (!media) return false;

    const mime = (media.type || media.mimeType || "").toLowerCase();
    if (mime.startsWith("image")) return true;

    const candidate = media.resolvedUrl || media.previewUrl || media.url || "";
    return /\.(jpe?g|png|gif|webp|avif|heic|heif)$/i.test(candidate);
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
    const isAuthor = String(post.user?._id) === String(currentUserId);
    const pageOwnerId = post.page?.owner?._id || post.page?.owner || post.pageOwnerId;
    const pageAdminIds = Array.isArray(post.page?.admins)
      ? post.page.admins
          .map((admin) => admin?._id || admin)
          .filter(Boolean)
          .map(String)
      : [];
    const isPageOwner = Boolean(
      (pageOwnerId && String(pageOwnerId) === String(currentUserId)) ||
        pageAdminIds.includes(String(currentUserId))
    );

    return (isAuthor || isPageOwner) && !post.isSponsored && isPostPublic(post);
  };

  const getPostPermissions = (post) => {
    if (!post) {
      return {
        canEdit: false,
        canDelete: false,
        canHide: false,
        canReport: false,
      };
    }

    const isAuthor = String(post.user?._id) === String(currentUserId);
    const pageOwnerId = post.page?.owner?._id || post.page?.owner || post.pageOwnerId;
    const pageAdminIds = Array.isArray(post.page?.admins)
      ? post.page.admins
          .map((admin) => admin?._id || admin)
          .filter(Boolean)
          .map(String)
      : [];
    const isPageOwner = Boolean(
      (pageOwnerId && String(pageOwnerId) === String(currentUserId)) ||
        pageAdminIds.includes(String(currentUserId))
    );

    const isOwner = isAuthor || isPageOwner;
    const isSharedPost = Boolean(post.sharedBy);

    return {
      canEdit: isOwner && !isSharedPost,
      canDelete: (isOwner && !isSharedPost) || isAdmin,
      canHide: Boolean(currentUserId),
      canReport: !isOwner,
    };
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

  const handleLike = async (post) => {
    if (!post?._id || !token) return;
    try {
      const res = await fetch(`${apiUrl}/posts/${post._id}/like`, {
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

  const handleShare = async (post) => {
    if (!post?._id || post.sharedBy || sharingPostIds[post._id]) return;

    setSharingPostIds((prev) => ({ ...prev, [post._id]: true }));

    try {
      const result = await sharePost(post._id);
      if (result?.success) {
        alert("Publication partagée sur votre profil.");
      }
    } catch (err) {
      console.error("SHARE ERROR:", err);
      alert("Impossible de partager cette publication pour le moment.");
    } finally {
      setSharingPostIds((prev) => {
        const next = { ...prev };
        delete next[post._id];
        return next;
      });
    }
  };

  const openMediaViewer = (postId, index) => {
    setMediaViewer({ postId, index });
    setMediaViewerOpen(true);
    document.body.classList.add("fb-no-scroll");
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
        index: (prev.index - 1 + post.media.length) % post.media.length,
      };
    });
  };

  const openReels = (postId) => {
    if (!postId) return;
    nav(`/reels?videoId=${postId}`);
  };

  const openCommentsModal = (post) => {
    setActivePostForComments(post);
    setIsCommentsModalOpen(true);
  };

  const closeCommentsModal = () => {
    setActivePostForComments(null);
    setIsCommentsModalOpen(false);
  };

  useEffect(() => {
    if (!focusPostId || !posts?.length) return;
    if (!focusCommentId && !focusReplyId) return;

    const post = posts.find((item) => String(item._id) === String(focusPostId));
    if (!post) return;
    if (hasOpenedComments) return;
    if (openCommentsForPostId === post._id && isCommentsModalOpen) return;

    setOpenCommentsForPostId(post._id);
    setActivePostForComments(post);
    setIsCommentsModalOpen(true);
    setHasOpenedComments(true);
  }, [
    focusPostId,
    focusCommentId,
    focusReplyId,
    posts,
    hasOpenedComments,
    openCommentsForPostId,
    isCommentsModalOpen,
  ]);

  const handleHidePost = (postId) => {
    setActionMenuPostId(null);
    rememberHiddenPost(postId, currentUserId);
    setPosts((prev) => filterPosts(prev));
  };

  const handleReportPost = () => {
    setActionMenuPostId(null);
    alert("Merci pour votre signalement. Notre équipe va vérifier la publication.");
  };

  const handleDeletePost = async (postId) => {
    setActionMenuPostId(null);
    if (!token) return;
    if (!window.confirm("Supprimer la publication ?")) return;

    try {
      const res = await fetch(`${apiUrl}/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p._id !== postId));
      } else {
        alert("Impossible de supprimer la publication.");
      }
    } catch (err) {
      console.error("DELETE POST ERROR:", err);
      alert("Erreur lors de la suppression de la publication.");
    }
  };

  const handleOpenEditPost = (post) => {
    setActionMenuPostId(null);
    setEditModalPost(post);
  };

  const handlePostUpdated = (updatedPost) => {
    if (!updatedPost?._id) return;

    setPosts((prev) =>
      prev.map((p) => (p._id === updatedPost._id ? { ...p, ...updatedPost } : p))
    );
    setEditModalPost(null);
  };

  const handleSponsorSubmit = async (event) => {
    event.preventDefault();
    if (!sponsorModalPost?._id) return;
    if (!token) {
      setSponsorError("Connexion requise pour sponsoriser.");
      return;
    }

    setSponsorError("");
    setSponsorLoading(true);

    try {
      const res = await fetch(`${apiUrl}/ads/create/${sponsorModalPost._id}`, {
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

  const mediaViewerContent = useMemo(() => {
    if (!mediaViewerOpen) return null;
    const viewerPost = posts.find((p) => p._id === mediaViewer.postId);
    if (!viewerPost) return null;

    const viewerMedia = viewerPost.media?.[mediaViewer.index];
    if (!viewerMedia) return null;

    return {
      post: viewerPost,
      media: viewerMedia,
    };
  }, [mediaViewer, mediaViewerOpen, posts]);

  return (
    <>
      {loadingInitial &&
        [...Array(4)].map((_, idx) => <SkeletonPost key={`skeleton-${idx}`} />)}

      {!loadingInitial &&
        posts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            context={context}
            actionMenuPostId={actionMenuPostId}
            setActionMenuPostId={setActionMenuPostId}
            sharingPostIds={sharingPostIds}
            onLike={handleLike}
            onShare={handleShare}
            onOpenComments={openCommentsModal}
            onOpenMediaViewer={openMediaViewer}
            onOpenReels={openReels}
            onOpenEditPost={handleOpenEditPost}
            onDeletePost={handleDeletePost}
            onHidePost={handleHidePost}
            onReportPost={handleReportPost}
            onSponsor={(postToSponsor) => {
              setSponsorModalPost(postToSponsor);
              setSponsorError("");
              resetSponsorForm();
            }}
            canSponsorPost={canSponsorPost}
            getPostPermissions={getPostPermissions}
            resolveMediaUrl={resolveMediaUrl}
            isImageMedia={isImageMedia}
          />
        ))}

      {loadingMore && <SkeletonPost />}

      {editModalPost && (
        <PostEditModal
          post={editModalPost}
          onClose={() => setEditModalPost(null)}
          onPostUpdated={handlePostUpdated}
        />
      )}

      {sponsorModalPost && (
        <div className="fb-sponsor-modal-overlay" onClick={closeSponsorModal}>
          <div className="fb-sponsor-modal" onClick={(e) => e.stopPropagation()}>
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

              {sponsorError && <div className="fb-sponsor-error">{sponsorError}</div>}

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

      {mediaViewerOpen && mediaViewerContent && (
        <div className="fb-media-viewer-backdrop" onClick={closeMediaViewer}>
          <div className="fb-media-viewer" onClick={(e) => e.stopPropagation()}>
            <button className="fb-media-viewer-close" onClick={closeMediaViewer}>
              ✕
            </button>

            {mediaViewerContent.post.media.length > 1 && (
              <button className="fb-media-viewer-prev" onClick={showPrevMedia}>
                ‹
              </button>
            )}

            <div className="fb-media-viewer-content">
              {mediaViewerContent.media.type === "image" ? (
                <img
                  src={getImageUrl(mediaViewerContent.media.url)}
                  className="fb-media-viewer-img"
                  alt=""
                />
              ) : (
                <SmartVideo
                  videoClassName="fb-media-viewer-video"
                  src={getImageUrl(mediaViewerContent.media.url)}
                />
              )}

              {mediaViewerContent.post.media.length > 1 && (
                <div className="fb-media-viewer-counter">
                  {mediaViewer.index + 1} / {mediaViewerContent.post.media.length}
                </div>
              )}
            </div>

            {mediaViewerContent.post.media.length > 1 && (
              <button className="fb-media-viewer-next" onClick={showNextMedia}>
                ›
              </button>
            )}

            <div className="fb-media-viewer-mobile-close">
              <button onClick={closeMediaViewer}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {isCommentsModalOpen && activePostForComments && (
        <CommentsModal
          post={activePostForComments}
          onClose={closeCommentsModal}
          focusCommentId={focusCommentId || null}
          focusReplyId={focusReplyId || null}
          fromNotification={fromNotification}
        />
      )}
    </>
  );
}
