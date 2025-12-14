import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
      {/* COVER */}
      <div className="profil-cover">
        <img src={user.coverPhoto} alt="Cover" />
      </div>

      {/* HEADER */}
      <div className="profil-header">
        <div className="profil-header-content">
          <div
            className="profil-avatar"
            style={{ backgroundImage: `url(${user.avatar})` }}
          />

          <div className="profil-info-area">
            <h2>{user.name}</h2>
            <div className="profil-email">{user.email}</div>

            <div className="profil-stats">
              <span>{user.friends?.length || 0} amis</span>
              <span>{user.followers?.length || 0} abonnés</span>
            </div>

            {/* ====================================================
                ACTIONS
            ==================================================== */}
            {!isMe && (
              <div className="profil-actions">
                {/* MESSAGE */}
                <button
                  className="profil-btn primary"
                  onClick={() =>
                    (window.location.href = `/messages/${user._id}`)
                  }
                >
                  Message
                </button>

                {/* 🔥 RELATION BUTTON (SYSTÈME UNIQUE) */}
                <RelationButton targetId={user._id} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="profil-tabs">
        <button className="active">Publications</button>
        <button disabled>À propos</button>
        <button disabled>Photos</button>
      </div>

      {/* POSTS */}
      <div className="profil-content">
        {posts.length === 0 ? (
          <div className="profil-empty">Aucune publication.</div>
        ) : (
          <div className="profil-posts">
            {posts.map((p) => (
              <Post key={p._id} post={p} currentUser={viewer} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}