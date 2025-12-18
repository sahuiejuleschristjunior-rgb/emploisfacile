import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Post from "../components/Post";
import RelationButton from "../components/social/RelationButton";
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
          ? list.filter((p) => String(p.user?._id) === String(id))
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
          <div className="profil-hero-main">
            <div
              className="profil-avatar profil-avatar-large"
              style={{ backgroundImage: `url(${user.avatar})` }}
            />
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
    </div>
  );
}