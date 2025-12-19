// src/components/Post.jsx
import React, { useState } from "react";
import "../styles/post.css";
import FBIcon from "./FBIcon";
import PostEditModal from "./PostEditModal"; // ⬅️ AJOUT IMPORTANT

const API_URL = "https://emploisfacile.org";

const fixUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/uploads")) return `${API_URL}${path}`;
  if (path.startsWith("uploads")) return `${API_URL}/${path}`;
  if (path.startsWith("/default")) return `${API_URL}/uploads${path}`;
  return `${API_URL}${path}`;
};

export default function Post({
  post,
  currentUser,
  onLike,
  onComment,
  onReply,
  onDeletePost,
  onDeleteComment,
  onDeleteReply,
  onMediaClick,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (!post) return null;

  const id = post._id;
  const isAuthor = String(post.user?._id) === String(currentUser?._id);

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const authorAvatar = fixUrl(post.user?.avatar);
  const avatarStyle = authorAvatar
    ? {
        backgroundImage: `url(${authorAvatar})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {};

  const imageItems = (post.media || [])
    .map((m, originIndex) => ({ ...m, originIndex, url: fixUrl(m.url) }))
    .filter((m) => {
      if (!m.url) return false;
      if (m.type) return m.type.startsWith("image");
      return /(png|jpe?g|webp|gif)$/i.test(m.url);
    });

  const imageIndexMap = new Map();
  imageItems.forEach((item, idx) => {
    imageIndexMap.set(item.originIndex, idx);
  });

  return (
    <>
      <article className="fb-post-card">
        {/* HEADER */}
        <div className="fb-post-header">
          <div className="fb-post-avatar" style={avatarStyle} />

          <div className="fb-post-user-info">
            <div className="fb-post-author">{post.user?.name}</div>
            <div className="fb-post-meta">{formatDate(post.createdAt)}</div>
          </div>

          {/* MENU (…) */}
          <div className="fb-post-menu-container">
            <button
              className="fb-post-menu-btn"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              ⋯
            </button>

            {menuOpen && (
              <div className="fb-post-menu-popup">
                {isAuthor && (
                  <>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setIsEditModalOpen(true); // ⬅️ Ouvrir modal modif
                      }}
                    >
                      Modifier la publication
                    </button>

                    <button
                      className="danger"
                      onClick={() => {
                        setMenuOpen(false);
                        onDeletePost(id);
                      }}
                    >
                      Supprimer
                    </button>
                  </>
                )}

                <button
                  onClick={() => setMenuOpen(false)}
                  className="close-menu"
                >
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>

        {/* TEXTE DU POST */}
        {post.text && (
          <div className="fb-post-text">
            {post.title && <strong>{post.title}</strong>}
            <div>{post.text}</div>
          </div>
        )}

        {/* MEDIAS */}
        {post.media?.length > 0 && (
          <div className="fb-post-media">
            {post.media.map((m, index) => {
              const mediaUrl = fixUrl(m.url);
              const isImage = m.type
                ? m.type.startsWith("image")
                : /(png|jpe?g|webp|gif)$/i.test(m.url || "");

              if (isImage) {
                const imageIndex = imageIndexMap.get(index) ?? 0;
                return (
                  <button
                    type="button"
                    key={index}
                    className="fb-post-image-btn"
                    onClick={() => onMediaClick?.(imageItems, imageIndex)}
                    aria-label="Afficher les photos de la publication"
                  >
                    <img
                      src={mediaUrl}
                      className="fb-post-image"
                      alt="media"
                    />
                  </button>
                );
              }

              if (m.type === "video") {
                return (
                  <video key={index} controls className="fb-post-video">
                    <source src={mediaUrl} />
                  </video>
                );
              }

              return null;
            })}
          </div>
        )}

        {/* STATS */}
        <div className="fb-post-stats">
          <span>{post.likes?.length || 0} j’aime</span>
          <span>{post.comments?.length || 0} commentaires</span>
        </div>

        {/* ACTIONS */}
        <div className="fb-post-actions">
          <button
            className={`fb-action-btn ${
              post.likes?.includes(String(currentUser?._id)) ? "liked" : ""
            }`}
            onClick={() => onLike(id)}
          >
            <FBIcon name="like" size={20} />
            J’aime
          </button>

          <button
            className="fb-action-btn"
            onClick={() => {
              const box = document.querySelector(`#comment-box-${id}`);
              box?.scrollIntoView({ behavior: "smooth" });
              setTimeout(() => box?.focus(), 200);
            }}
          >
            <FBIcon name="comment" size={20} />
            Commenter
          </button>

          <button
            className="fb-action-btn"
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}/post/${id}`
              );
              alert("Lien copié !");
            }}
          >
            <FBIcon name="share" size={20} />
            Partager
          </button>
        </div>

      </article>

      {/* MODAL ÉDITION */}
      {isEditModalOpen && (
        <PostEditModal
          post={post}
          onClose={() => setIsEditModalOpen(false)}
          onPostUpdated={() => {
            setIsEditModalOpen(false);
          }}
        />
      )}
    </>
  );
}
