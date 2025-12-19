import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Post from "../components/Post";
import RelationButton from "../components/social/RelationButton";
import ProfilePhotoViewer from "../components/ProfilePhotoViewer";
import "../styles/profil.css";

const API_ROOT = import.meta.env.VITE_API_URL;

/* ================================================
   FIX URL IMAGES – VERSION PROPRE
================================================ */
const fixUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_ROOT.replace("/api", "")}${path.startsWith("/") ? "" : "/"}${path}`;
};

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [user, setUser] = useState(null);     // Profil visité
  const [viewer, setViewer] = useState(null); // Utilisateur connecté
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  /* ============================================================
      LOAD CONNECTED USER
  ============================================================ */
  useEffect(() => {
    if (!token) return;

    fetch(`${API_ROOT}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => data?.user && setViewer(data.user))
      .catch(console.error);
  }, [token]);

  /* ============================================================
      LOAD PROFILE USER
  ============================================================ */
  useEffect(() => {
    fetch(`${API_ROOT}/auth/user/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) =>
        setUser({
          ...data,
          avatar: fixUrl(data.avatar),
          coverPhoto: fixUrl(data.coverPhoto),
        })
      )
      .catch(console.error);
  }, [id, token]);

  /* ============================================================
      LOAD POSTS
  ============================================================ */
  useEffect(() => {
    fetch(`${API_ROOT}/posts`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((list) => {
        const filtered = Array.isArray(list)
          ? list
              .filter((p) => String(p.user?._id) === String(id))
              .map((p) => ({
                ...p,
                media: p.media?.map((m) => ({
                  ...m,
                  url: fixUrl(m.url),
                })),
              }))
          : [];
        setPosts(filtered);
        setLoading(false);
      })
      .catch(console.error);
  }, [id, token]);

  if (loading || !user || !viewer) {
    return <div className="profil-loading">Chargement…</div>;
  }

  const isMe = String(viewer._id) === String(user._id);

  const photoItems = posts
    .flatMap((p) =>
      (p.media || [])
        .filter((m) => {
          if (!m?.url) return false;
          if (m.type) return m.type.startsWith("image");
          return /(png|jpe?g|webp|gif)$/i.test(m.url);
        })
        .map((m, idx) => ({ ...m, url: fixUrl(m.url), key: `${p._id || idx}-${idx}`, fromPost: p?._id }))
    )
    .slice(0, 30);

  const openViewer = (idx = 0) => {
    if (!photoItems.length) return;
    const safeIndex = Math.max(0, Math.min(idx, photoItems.length - 1));
    setViewerIndex(safeIndex);
    setViewerOpen(true);
  };

  /* ============================================================
      RENDER
  ============================================================ */
  return (
    <div className="profil-wrapper">
      <div className="profil-hero">
        {/* COUVERTURE */}
        <div className="profil-cover">
          <img
            src={user.coverPhoto}
            alt="Couverture du profil"
            className="profil-cover-media"
          />
          <div className="profil-cover-meta">Ratio 2.67:1 — 1200x450 px recommandé</div>
        </div>

        {/* ENTÊTE */}
        <div className="profil-hero-row">
          <div className="profil-avatar-wrapper">
            <div
              className="profil-avatar profil-avatar-large"
              style={{ backgroundImage: `url(${user.avatar})` }}
            />
          </div>
          <div className="profil-hero-main">
            <div className="profil-title-block">
              <h1>{user.name}</h1>
              <div className="profil-stats">
                <span>{user.friends?.length || 0} amis</span> |
                <span> {user.followers?.length || 0} abonnés</span>
              </div>
            </div>
          </div>

          {!isMe && (
            <div className="profil-hero-actions">
              <button
                className="profil-btn primary"
                onClick={() => navigate(`/messages?userId=${user._id}`)}
              >
                Message
              </button>
              <RelationButton targetId={user._id} />
            </div>
          )}
        </div>

        {/* TABS */}
        <div className="profil-tabs-bar">
          <div className="profil-tabs">
            <button className="active">Publications</button>
            <button disabled>À propos</button>
            <button disabled>Photos</button>
          </div>
          <div className="profil-tabs-actions">
            <button className="profil-btn ghost" disabled>
              ···
            </button>
          </div>
        </div>
      </div>

      <div className="profil-content">
        <div className="profil-grid">
          <div className="profil-col">
            <div className="profil-card intro-card">
              <h3>Intro</h3>
              <p className="profil-intro-text">
                {user.bio || "Aucune bio renseignée pour le moment."}
              </p>
              <div className="profil-info-line">
                <span role="img" aria-label="friends">
                  👥
                </span>
                <span>{user.friends?.length || 0} amis</span>
              </div>
              <div className="profil-info-line">
                <span role="img" aria-label="followers">
                  🌟
                </span>
                <span>{user.followers?.length || 0} abonnés</span>
              </div>
            </div>

            <div className="profil-card photos-card">
              <div className="profil-card-header">
                <h3>Photos</h3>
                {photoItems.length > 0 && (
                  <button className="profil-link" onClick={() => openViewer(0)}>
                    Afficher tout
                  </button>
                )}
              </div>
              {photoItems.length === 0 ? (
                <p className="profil-empty">Aucune photo pour le moment.</p>
              ) : (
                <div className="profil-photo-grid">
                  {photoItems.slice(0, 9).map((m, idx) => (
                    <button
                      key={m.key}
                      className="profil-photo-thumb"
                      style={{ backgroundImage: `url(${m.url})` }}
                      aria-label="Photo de la galerie"
                      onClick={() => openViewer(idx)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="profil-col">
            {posts.length === 0 ? (
              <div className="profil-card profil-empty">Aucune publication.</div>
            ) : (
              <div className="profil-posts">
                {posts.map((p) => (
                  <Post key={p._id} post={p} currentUser={viewer} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {viewerOpen && (
        <ProfilePhotoViewer
          items={photoItems}
          index={viewerIndex}
          onChangeIndex={setViewerIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>
  );
}