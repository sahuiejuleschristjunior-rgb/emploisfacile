import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAvatarStyle, getImageUrl } from "../utils/imageUtils";
import FBIcon from "./FBIcon";
import MediaRenderer from "./MediaRenderer";
import FacebookImage from "./FacebookImage";
import TextClamp from "./TextClamp";
import SmartVideo from "./SmartVideo";
import "../styles/facebook-feed.css";
import "../styles/post.css";

function FeedVideoMedia({ media, onClick }) {
  const MIN_FEED_VIDEO_RATIO = 4 / 5;
  const MAX_FEED_VIDEO_RATIO = 16 / 9;

  const [aspectRatio, setAspectRatio] = useState(1);

  const handleMetadata = (event) => {
    const videoEl = event?.target;
    const videoWidth = videoEl?.videoWidth;
    const videoHeight = videoEl?.videoHeight;

    if (videoWidth && videoHeight) {
      const rawRatio = videoWidth / videoHeight;
      const clampedRatio = Math.min(
        Math.max(rawRatio, MIN_FEED_VIDEO_RATIO),
        MAX_FEED_VIDEO_RATIO
      );

      setAspectRatio(clampedRatio);
    }
  };

  const containerStyle = { aspectRatio };
  const videoStyle = { width: "100%", height: "100%", objectFit: "cover" };

  return (
    <div
      className="fb-post-media fb-post-media-video fbVideoWrap"
      style={containerStyle}
    >
      <SmartVideo
        src={media.resolvedUrl}
        className="fb-post-media-renderer"
        videoClassName="fb-post-video fbVideo"
        onLoadedMetadata={handleMetadata}
        style={videoStyle}
        onClick={onClick}
      />
    </div>
  );
}

const defaultTextButtonStyle = {
  background: "none",
  border: "none",
  padding: 0,
  margin: 0,
  color: "inherit",
  font: "inherit",
  cursor: "pointer",
};

const isPostPublicFallback = (post) =>
  Boolean(
    post?.privacy === "public" ||
      post?.visibility === "public" ||
      post?.audience === "public" ||
      post?.isPublic === true ||
      (!post?.privacy && !post?.visibility && post?.isPublic !== false)
  );

export default function PostCard({
  post,
  currentUser,
  currentUserId,
  isAdmin,
  context = "feed",
  actionMenuPostId,
  setActionMenuPostId,
  sharingPostIds = {},
  onLike,
  onShare,
  onOpenComments,
  onCommentClick,
  onCommentsCountClick,
  onLikesCountClick,
  onOpenMediaViewer,
  onOpenReels,
  onOpenEditPost,
  onDeletePost,
  onHidePost,
  onReportPost,
  onSponsor,
  canSponsorPost,
  getPostPermissions,
  resolveMediaUrl,
  isImageMedia,
  textButtonStyle = defaultTextButtonStyle,
}) {
  const nav = useNavigate();
  const [localMenuOpen, setLocalMenuOpen] = useState(false);

  if (!post) return null;

  const resolvedUserId = currentUserId ?? currentUser?._id;
  const resolvedIsAdmin =
    isAdmin ?? (currentUser?.role || "").toLowerCase() === "admin";

  const resolveMediaUrlFn =
    resolveMediaUrl ||
    ((media) => {
      if (!media?.url && !media?.previewUrl) return null;
      const candidate = media.previewUrl || media.url;
      if (media.isLocal || candidate?.startsWith("blob:")) return candidate;
      return getImageUrl(candidate);
    });

  const isImageMediaFn =
    isImageMedia ||
    ((media) => {
      if (!media) return false;
      const mime = (media.type || media.mimeType || "").toLowerCase();
      if (mime.startsWith("image")) return true;
      const candidate = media.resolvedUrl || media.previewUrl || media.url || "";
      return /\.(jpe?g|png|gif|webp|avif|heic|heif)$/i.test(candidate);
    });

  const canSponsorPostFn =
    canSponsorPost ||
    ((targetPost) => {
      if (!targetPost) return false;
      const isAuthor = String(targetPost.user?._id) === String(resolvedUserId);
      const pageOwnerId =
        targetPost.page?.owner?._id ||
        targetPost.page?.owner ||
        targetPost.pageOwnerId;
      const pageAdminIds = Array.isArray(targetPost.page?.admins)
        ? targetPost.page.admins
            .map((admin) => admin?._id || admin)
            .filter(Boolean)
            .map(String)
        : [];
      const isPageOwner = Boolean(
        (pageOwnerId && String(pageOwnerId) === String(resolvedUserId)) ||
          pageAdminIds.includes(String(resolvedUserId))
      );

      return (
        (isAuthor || isPageOwner) &&
        !targetPost.isSponsored &&
        isPostPublicFallback(targetPost)
      );
    });

  const getPostPermissionsFn =
    getPostPermissions ||
    ((targetPost) => {
      if (!targetPost) {
        return {
          canEdit: false,
          canDelete: false,
          canHide: false,
          canReport: false,
        };
      }

      const isAuthor = String(targetPost.user?._id) === String(resolvedUserId);
      const pageOwnerId =
        targetPost.page?.owner?._id ||
        targetPost.page?.owner ||
        targetPost.pageOwnerId;
      const pageAdminIds = Array.isArray(targetPost.page?.admins)
        ? targetPost.page.admins
            .map((admin) => admin?._id || admin)
            .filter(Boolean)
            .map(String)
        : [];
      const isPageOwner = Boolean(
        (pageOwnerId && String(pageOwnerId) === String(resolvedUserId)) ||
          pageAdminIds.includes(String(resolvedUserId))
      );

      const isOwner = isAuthor || isPageOwner;
      const isSharedPost = Boolean(targetPost.sharedBy);

      return {
        canEdit: isOwner && !isSharedPost,
        canDelete: (isOwner && !isSharedPost) || resolvedIsAdmin,
        canHide: Boolean(resolvedUserId),
        canReport: !isOwner,
      };
    });

  const isMenuControlled =
    typeof actionMenuPostId !== "undefined" &&
    typeof setActionMenuPostId === "function";
  const isMenuOpen = isMenuControlled
    ? actionMenuPostId === post._id
    : localMenuOpen;

  const toggleMenu = useCallback(
    (event) => {
      event?.stopPropagation();
      if (isMenuControlled) {
        setActionMenuPostId(isMenuOpen ? null : post._id);
      } else {
        setLocalMenuOpen((prev) => !prev);
      }
    },
    [isMenuControlled, isMenuOpen, post._id, setActionMenuPostId]
  );

  const isPagePost = post.authorType === "page";
  const postAvatarStyle = getAvatarStyle(
    isPagePost ? post.page?.avatar : post.user?.avatar
  );
  const authorProfilePath = isPagePost
    ? post.page?.slug
      ? `/pages/${post.page.slug}`
      : null
    : post.user?._id
    ? `/profil/${post.user._id}`
    : null;
  const displayName = isPagePost ? post.page?.name : post.user?.name;
  const likes = post.likes?.length || 0;
  const commentsCount = post.comments?.length || 0;
  const isSharedPost = Boolean(post.sharedBy);
  const canShare = !isSharedPost;
  const sharedByName = post.sharedBy?.name;
  const canSponsor = canSponsorPostFn(post);
  const isSponsored = Boolean(post.isSponsored);
  const permissions = getPostPermissionsFn(post);

  const resolvedMedia = useMemo(
    () =>
      (post.media || []).map((media, originalIndex) => ({
        ...media,
        originalIndex,
        resolvedUrl: resolveMediaUrlFn(media),
      })),
    [post.media, resolveMediaUrlFn]
  );

  const imageMedia = resolvedMedia.filter(
    (media) => media.resolvedUrl && isImageMediaFn(media)
  );
  const otherMedia = resolvedMedia.filter(
    (media) => media.resolvedUrl && !isImageMediaFn(media)
  );

  const hasVideoMedia = otherMedia.some(
    (media) =>
      media.type?.startsWith("video") ||
      /(mp4|webm|mov)$/i.test(media.resolvedUrl || media.url || "")
  );

  const displayedImages =
    imageMedia.length > 4 ? imageMedia.slice(0, 4) : imageMedia;
  const mediaLayoutClass = imageMedia.length
    ? `fb-media-${Math.min(imageMedia.length, 4)}`
    : "";

  const handleOpenComments = () => {
    if (onOpenComments) {
      onOpenComments(post);
      return;
    }

    onCommentClick?.(post);
  };

  const handleOpenCommentsCount = () => {
    if (onCommentsCountClick) {
      onCommentsCountClick(post);
      return;
    }

    if (onOpenComments) {
      onOpenComments(post);
      return;
    }

    onCommentClick?.(post);
  };

  const handleOpenLikesCount = () => {
    if (onLikesCountClick) {
      onLikesCountClick(post);
      return;
    }

    nav(`/likes/${post._id}`);
  };

  return (
    <div
      id={`post-${post._id}`}
      className="fb-post-wrapper"
      data-context={context}
    >
      <article className="fb-post">
        <div className="fb-post-content">
          <div className="fb-post-header">
            <button
              type="button"
              className="fb-post-avatar avatar-link"
              style={postAvatarStyle}
              onClick={(event) => {
                event.stopPropagation();
                if (authorProfilePath) nav(authorProfilePath);
              }}
              aria-label="Ouvrir le profil"
            />
            <div className="fb-post-user">
              <div className="fb-post-author">{displayName}</div>
              <div className="fb-post-meta">
                {new Date(post.createdAt).toLocaleString()}
                {isSponsored && (
                  <span className="fb-sponsored-badge">Sponsorisé</span>
                )}
              </div>
              {isSharedPost && (
                <div className="fb-post-meta fb-post-meta-shared">
                  Partagé par {sharedByName || "un utilisateur"}
                </div>
              )}
            </div>
            <div className="fb-post-menu fb-post-menu-container">
              <button className="fb-post-menu-btn" onClick={toggleMenu}>
                ⋯
              </button>

              <div
                className={`fb-post-menu-popup ${isMenuOpen ? "open" : ""}`}
                onClick={(event) => event.stopPropagation()}
              >
                {permissions.canEdit && (
                  <button onClick={() => onOpenEditPost?.(post)}>
                    Modifier la publication
                  </button>
                )}

                {permissions.canDelete && (
                  <button
                    className="danger"
                    onClick={() => onDeletePost?.(post._id)}
                  >
                    Supprimer
                  </button>
                )}

                {permissions.canHide && (
                  <button onClick={() => onHidePost?.(post._id)}>
                    Masquer la publication
                  </button>
                )}

                {permissions.canReport && (
                  <button onClick={() => onReportPost?.(post)}>
                    Signaler
                  </button>
                )}
              </div>
            </div>
          </div>

          {post.text && (
            <div className="fb-post-text">
              <TextClamp text={post.text} className="text-content" />
            </div>
          )}
        </div>

        {(imageMedia.length > 0 || otherMedia.length > 0) && (
          <div
            className={`fb-post-media-wrapper${
              hasVideoMedia ? " fb-post-media-wrapper--video" : ""
            }`}
          >
            {imageMedia.length > 0 &&
              (imageMedia.length === 1 ? (
                <div
                  className="fb-media-single"
                  onClick={() => {
                    if (imageMedia[0].isLocal) return;
                    onOpenMediaViewer?.(post._id, imageMedia[0].originalIndex);
                  }}
                >
                  <FacebookImage src={imageMedia[0].resolvedUrl} alt="" />
                </div>
              ) : (
                <div className={`fb-media-grid ${mediaLayoutClass}`.trim()}>
                  {displayedImages.map((media, idx) => {
                    const shouldShowOverlay =
                      imageMedia.length > 4 &&
                      idx === displayedImages.length - 1;

                    return (
                      <div
                        key={media.originalIndex ?? idx}
                        className="fb-media-item"
                        onClick={() => {
                          if (media.isLocal) return;
                          onOpenMediaViewer?.(post._id, media.originalIndex);
                        }}
                      >
                        <FacebookImage
                          src={media.resolvedUrl}
                          alt=""
                          objectFit="cover"
                          height="100%"
                        />
                        {shouldShowOverlay && (
                          <div className="fb-media-overlay">
                            +{imageMedia.length - 4}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

            {otherMedia.map((media) => {
              const isLocalMedia = Boolean(media.isLocal);
              const isVideo =
                (media.type && media.type.startsWith("video")) ||
                /(mp4|webm|mov)$/i.test((media.resolvedUrl || media.url || ""));

              return isVideo ? (
                <FeedVideoMedia
                  key={media.originalIndex}
                  media={media}
                  onClick={() => {
                    if (isLocalMedia) return;
                    return onOpenReels?.(post._id);
                  }}
                />
              ) : (
                <div
                  key={media.originalIndex}
                  className="fb-post-media"
                  onClick={() => {
                    if (isLocalMedia) return;
                    return onOpenMediaViewer?.(post._id, media.originalIndex);
                  }}
                >
                  <MediaRenderer
                    media={media}
                    src={media.resolvedUrl}
                    type={media.type}
                    mimeType={media.mimeType}
                    mediaClassName="fb-post-image"
                    className="fb-post-media-renderer"
                    alt=""
                  />
                </div>
              );
            })}
          </div>
        )}

        <div className="fb-post-content fb-post-content--footer">
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
                    onClick={handleOpenLikesCount}
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
                onClick={handleOpenCommentsCount}
              >
                {commentsCount} commentaires
              </button>
            </div>
          </div>

          <div className="fb-post-actions">
            <button
              className="fb-post-action-btn"
              onClick={() => onLike?.(post)}
            >
              <FBIcon name="like" size={18} /> J’aime
            </button>

            <button className="fb-post-action-btn" onClick={handleOpenComments}>
              <FBIcon name="comment" size={18} /> Commenter
            </button>

            <button
              className="fb-post-action-btn"
              disabled={sharingPostIds[post._id] || !canShare}
              onClick={() => onShare?.(post)}
            >
              <FBIcon name="share" size={18} />
              {sharingPostIds[post._id] ? "Partage…" : "Partager"}
            </button>

            {canSponsor && (
              <button
                className="fb-post-action-btn fb-sponsor-menu"
                onClick={() => onSponsor?.(post)}
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
        </div>
      </article>
    </div>
  );
}
