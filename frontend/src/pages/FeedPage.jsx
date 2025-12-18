// src/pages/FeedPage.jsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

import LeftMenuDesktop from "../components/LeftMenuDesktop";
import RightMenu from "../components/MenuRight";
import MobileMenu from "../components/MobileMenu";
import CreatePostModal from "../components/CreatePostModal";

import "./feed.css";
import "../styles/menus.css";
import "../styles/stories.css";
import "../styles/comments.css";
import "../styles/notifications.css";

const API_BASE = import.meta.env.VITE_API_URL;

/* ========================================================= */
/* STORIES MOCK */
/* ========================================================= */
const storiesData = Array.from({ length: 50 }).map((_, i) => ({
  id: i + 1,
  name: "Utilisateur " + (i + 1),
  avatar: `https://i.pravatar.cc/100?img=${(i % 70) + 1}`,
  media: `https://images.pexels.com/photos/${1181671 + i}/pexels-photo-${
    1181671 + i
  }.jpeg`,
}));

/* ========================================================= */
/* DEMO POSTS */
/* ========================================================= */
const demoPosts = Array.from({ length: 10 }).map((_, i) => ({
  id: (i + 1).toString(),
  user: {
    _id: "local-user",
    name: ["EmploisFacile", "Orange CI", "Candidat en vue"][i % 3],
    avatar: null,
  },
  badge: ["Recommandé", "Entreprise vérifiée", "En tendance"][i % 3],
  time: `${i + 3} min`,
  title: ["Développeur Full Stack", "Chargé clientèle", "Community Manager"][i % 3],
  text: ["Texte du post…", "Texte du post…", "Texte du post…"][i % 3],
  tags: [["CDI"], ["CDD"], ["Marketing"]][i % 3],
  media:
    i % 3 === 0
      ? [
          {
            url: "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg",
            type: "image",
          },
        ]
      : i % 3 === 1
      ? [
          {
            url: "https://sample-videos.com/img/Sample-jpg-image-500kb.jpg",
            type: "image",
          },
          {
            url: "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4",
            type: "video",
          },
        ]
      : [],
  likes: [],
  comments: [],
}));

/* ========================================================= */
/* STORIES BAR */
/* ========================================================= */
function StoriesBar({ stories, onOpen }) {
  return (
    <div className="stories-bar">
      {stories.map((story, index) => (
        <div
          key={story.id}
          className="story-item"
          onClick={() => onOpen(index)}
        >
          <img src={story.avatar} className="story-avatar" alt={story.name} />
          <p className="story-name">{story.name}</p>
        </div>
      ))}
    </div>
  );
}

/* ========================================================= */
/* MEDIA SLIDER */
/* ========================================================= */
function MediaSlider({ media = [] }) {
  if (!media.length) return null;

  return (
    <div className="media-slider">
      {media.map((m, idx) => (
        <div className="media-frame" key={idx}>
          {m.type === "video" ? (
            <video className="media-content" controls>
              <source src={m.url} />
            </video>
          ) : (
            <img className="media-content" src={m.url} alt={`media-${idx}`} />
          )}
        </div>
      ))}
    </div>
  );
}
/* ========================================================= */
/* STORY VIEWER */
/* ========================================================= */
function StoryViewer({ stories, startIndex, onClose }) {
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef(null);

  const current = stories[index];

  useEffect(() => {
    setProgress(0);

    intervalRef.current = setInterval(() => {
      if (!paused) {
        setProgress((p) => {
          if (p >= 100) {
            if (index < stories.length - 1) setIndex(index + 1);
            else onClose();
            return 0;
          }
          return p + 1;
        });
      }
    }, 60);

    return () => clearInterval(intervalRef.current);
  }, [index, paused, onClose, stories.length]);

  return (
    <div className="story-viewer">
      <div className="story-progress">
        {stories.map((_, i) => (
          <div key={i} className="story-progress-segment">
            <div
              className="story-progress-fill"
              style={{
                width:
                  i < index ? "100%" : i === index ? `${progress}%` : "0%",
              }}
            />
          </div>
        ))}
      </div>

      <div
        className="story-touch-zone left"
        onClick={() => index > 0 && setIndex(index - 1)}
      />
      <div
        className="story-touch-zone right"
        onClick={() => index < stories.length - 1 && setIndex(index + 1)}
      />

      <img src={current.media} className="story-media" alt="story" />

      <button className="story-close" onClick={onClose}>
        ×
      </button>
    </div>
  );
}

/* ========================================================= */
/* FEED PAGE */
/* ========================================================= */
export default function FeedPage() {
  const nav = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [loading, setLoading] = useState(true);

  const [posts, setPosts] = useState([]);
  const [showStory, setShowStory] = useState(false);
  const [storyIndex, setStoryIndex] = useState(0);
  const [showPostModal, setShowPostModal] = useState(false);

  const token = localStorage.getItem("token");

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  })();

  /* ========================================================= */
  /* FETCH POSTS — TOKEN FIXÉ + BEARER OK */
  /* ========================================================= */
  useEffect(() => {
    if (!token) {
      nav("/login");
      return;
    }
    fetchPosts();
  }, [token, nav]);

  const fetchPosts = async () => {
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/posts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        nav("/login");
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setPosts(Array.isArray(data) ? data : []);
      } else {
        setPosts(demoPosts);
      }
    } catch {
      setPosts(demoPosts);
    } finally {
      setLoading(false);
    }
  };
  /* ========================================================= */
  /* ACTIONS : CREATE / DELETE / LIKE / COMMENT FIXÉES         */
  /* ========================================================= */

  const handleCreatePost = async (payload) => {
    try {
      const fd = new FormData();
      fd.append("text", payload.text || "");

      const allFiles = [
        ...(payload.images || []),
        ...(payload.videos || []),
        ...(payload.audios || []),
        ...(payload.pdfs || []),
      ];

      allFiles.forEach((file) => fd.append("files", file));

      const res = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data) {
        alert(data?.message || "Erreur création post");
        return;
      }

      setPosts((p) => [data.post || data, ...p]);
    } catch {
      alert("Erreur réseau publication");
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm("Confirmer suppression ?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/posts/${postId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setPosts((p) => p.filter((x) => (x._id || x.id) !== postId));
      } else {
        alert("Erreur suppression");
      }
    } catch {
      alert("Erreur réseau suppression");
    }
  };

  const handleLike = async (postId) => {
    try {
      const res = await fetch(`${API_BASE}/api/posts/${postId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => null);
      const liked = data?.liked;
      const userId = currentUser?._id;

      setPosts((prev) =>
        prev.map((p) => {
          if ((p._id || p.id) !== postId) return p;

          const hasLike = p.likes?.includes(userId);
          let newLikes = p.likes || [];

          if (liked && !hasLike) newLikes = [...newLikes, userId];
          if (!liked && hasLike)
            newLikes = newLikes.filter((id) => id !== userId);

          return { ...p, likes: newLikes };
        })
      );
    } catch {}
  };

  const handleCommentSubmit = async (postId, text, parent = null) => {
    if (!text.trim()) return;

    try {
      const url = parent
        ? `${API_BASE}/api/posts/${postId}/comment/${parent}/reply`
        : `${API_BASE}/api/posts/${postId}/comment`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      const updated = await res.json();

      setPosts((p) =>
        p.map((x) =>
          (x._id || x.id) === (updated._id || updated.id) ? updated : x
        )
      );
    } catch {}
  };

  const handleDeleteComment = async (commentId, postId) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/posts/${postId}/comment/${commentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const updated = await res.json();

      setPosts((p) =>
        p.map((x) =>
          (x._id || x.id) === (updated._id || updated.id) ? updated : x
        )
      );
    } catch {}
  };

  const handleDeleteReply = async (commentId, replyId, postId) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/posts/${postId}/comment/${commentId}/reply/${replyId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const updated = await res.json();

      setPosts((p) =>
        p.map((x) =>
          (x._id || x.id) === (updated._id || updated.id) ? updated : x
        )
      );
    } catch {}
  };
  /* ========================================================= */
  /* FILTER POSTS */
  /* ========================================================= */
  const filteredPosts = posts.filter((post) => {
    const q = search.toLowerCase();
    return (
      post.text?.toLowerCase().includes(q) ||
      post.user?.name?.toLowerCase().includes(q) ||
      post.title?.toLowerCase().includes(q)
    );
  });

  /* ========================================================= */
  /* RENDER POSTS STYLE FACEBOOK                              */
  /* ========================================================= */
  const renderFeedPosts = () => (
    <div className="feed-posts">
      {filteredPosts.map((post) => {
        const id = post._id || post.id;
        const createdAt = post.createdAt
          ? new Date(post.createdAt).toLocaleString()
          : post.time;

        const likesCount = post.likes?.length || 0;
        const commentsCount = (post.comments || []).length;

        return (
          <article key={id} className="feed-post-card">
            {/* --- HEADER --- */}
            <div className="feed-post-header">
              <div
                className="feed-post-avatar"
                style={
                  post.user?.avatar
                    ? {
                        backgroundImage: `url(${post.user.avatar})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : {}
                }
              />

              <div style={{ flex: 1 }}>
                <div className="feed-post-author">
                  {post.user?.name || "Utilisateur"}
                </div>
                <div className="feed-post-meta">
                  <span>{createdAt}</span>
                </div>
              </div>

              {/* Bouton menu */}
              <div className="menu-container">
                <button className="post-menu-btn">⋯</button>
                <div className="fb-menu-popup">
                  <button onClick={() => handleDeletePost(id)}>Supprimer</button>
                </div>
              </div>
            </div>

            {/* TEXTE */}
            {post.text && (
              <div className="feed-post-text">
                {post.title && <strong>{post.title}</strong>}
                <div>{post.text}</div>
              </div>
            )}

            {/* MÉDIAS */}
            <MediaSlider media={post.media} />

            {/* STATS */}
            <div className="feed-post-stats">
              <span>{likesCount} j’aime</span>
              <span>{commentsCount} commentaires</span>
            </div>

            {/* ACTIONS */}
            <div className="fb-actions">
              <button className="fb-action-btn" onClick={() => handleLike(id)}>
                <i className="material-icons">thumb_up</i>
              </button>
              <button
                className="fb-action-btn"
                onClick={() => {
                  const box = document.querySelector(`#comment-box-${id}`);
                  box?.scrollIntoView({ behavior: "smooth" });
                  setTimeout(() => box?.focus(), 150);
                }}
              >
                <i className="material-icons">chat</i>
              </button>
              <button
                className="fb-action-btn"
                onClick={() => {
                  const url = `${window.location.origin}/post/${id}`;
                  navigator.clipboard.writeText(url);
                  alert("Lien copié !");
                }}
              >
                <i className="material-icons">share</i>
              </button>
            </div>

            {/* COMMENTAIRES */}
            <CommentSection
              post={post}
              onComment={(t) => handleCommentSubmit(id, t)}
              onReply={(cid, t) => handleCommentSubmit(id, t, cid)}
              onDeleteComment={(cid) => handleDeleteComment(cid, id)}
              onDeleteReply={(cid, rid) => handleDeleteReply(cid, rid, id)}
            />
          </article>
        );
      })}
    </div>
  );

  /* ========================================================= */
  /* RENDER GLOBAL PAGE                                        */
  /* ========================================================= */
  return (
    <div className="feed-wrapper">
      {/* MOBILE NAV */}
      <div className="mobile-navbar">
        <button className="nav-btn-round" onClick={() => setMenuOpen(true)}>
          ☰
        </button>
        <div className="nav-title-pill">EmploisFacile</div>
        <button
          className="nav-btn-pill"
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            nav("/login");
          }}
        >
          Déconnexion
        </button>
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* DESKTOP HEADER */}
      <div className="desktop-header">
        <div className="desktop-header-left">
          <button className="nav-btn-round">☰</button>
          <div className="nav-title-pill">EmploisFacile</div>
        </div>

        <div className="desktop-header-right">
          <div className={`desktop-search ${inputFocused ? "focus" : ""}`}>
            <span className="material-icons">search</span>
            <input
              type="text"
              placeholder="Rechercher…"
              value={search}
              onFocus={() => setInputFocused(true)}
              onBlur={() => !search && setInputFocused(false)}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            className="publish-btn desktop-only"
            onClick={() => setShowPostModal(true)}
          >
            <span className="material-icons">add</span> Publier
          </button>

          <button className="icon-btn">
            <span className="material-icons">notifications</span>
          </button>
          <button className="icon-btn">
            <span className="material-icons">chat</span>
          </button>
          <button className="icon-btn">
            <span className="material-icons">analytics</span>
          </button>

          <button
            className="logout-pill"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              nav("/login");
            }}
          >
            Déconnexion
          </button>
        </div>
      </div>

      {/* FEED MOBILE */}
      <main className="feed-main-mobile">
        <StoriesBar
          stories={storiesData}
          onOpen={(i) => {
            setStoryIndex(i);
            setShowStory(true);
          }}
        />
        {loading ? <div>Chargement…</div> : renderFeedPosts()}
      </main>

      {/* FEED DESKTOP */}
      <div className="desktop-layout">
        <div className="desktop-left">
          <LeftMenuDesktop />
        </div>

        <div className="desktop-center">
          <StoriesBar
            stories={storiesData}
            onOpen={(i) => {
              setStoryIndex(i);
              setShowStory(true);
            }}
          />
          {loading ? <div>Chargement…</div> : renderFeedPosts()}
        </div>

        <div className="desktop-right">
          <RightMenu />
        </div>
      </div>

      {/* BOTTOM BAR MOBILE */}
      <div className="mobile-bottom-bar">
        <button className="bottom-plus-btn" onClick={() => setShowPostModal(true)}>
          +
        </button>

        <div className={`bottom-input-wrapper ${inputFocused ? "expanded" : ""}`}>
          <input
            type="text"
            placeholder="Rechercher…"
            value={search}
            onFocus={() => setInputFocused(true)}
            onBlur={() => !search && setInputFocused(false)}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {showStory && (
        <StoryViewer
          stories={storiesData}
          startIndex={storyIndex}
          onClose={() => setShowStory(false)}
        />
      )}

      {showPostModal && (
        <CreatePostModal
          onClose={() => setShowPostModal(false)}
          onSubmit={handleCreatePost}
        />
      )}
    </div>
  );
}

/* ========================================================= */
/* COMMENT SECTION FINAL                                      */
/* ========================================================= */
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
                                  onClick={() =>
                                    onDeleteReply(c._id, r._id)
                                  }
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