import { useEffect } from "react";
import Post from "./Post";

export default function PostFullscreenModal({
  post,
  currentUser,
  onClose,
  onLike,
  onComment,
  onReply,
  onDeletePost,
  onDeleteComment,
  onDeleteReply,
}) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!post) return null;

  return (
    <div className="post-fullscreen-overlay" onClick={onClose}>
      <div className="post-fullscreen-dialog" onClick={(e) => e.stopPropagation()}>
        <button className="post-fullscreen-close" onClick={onClose} aria-label="Fermer">
          ×
        </button>

        <div className="post-fullscreen-body">
          <Post
            post={post}
            currentUser={currentUser}
            onLike={onLike}
            onComment={onComment}
            onReply={onReply}
            onDeletePost={onDeletePost}
            onDeleteComment={onDeleteComment}
            onDeleteReply={onDeleteReply}
          />
        </div>
      </div>
    </div>
  );
}
