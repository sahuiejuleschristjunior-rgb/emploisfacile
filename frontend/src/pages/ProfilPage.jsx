import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Post from "../components/Post";
import "../styles/profil.css";

const API_URL = import.meta.env.VITE_API_URL;

/* ================================================
   FIX DES URL IMAGES / UPLOAD
================================================ */
const fixUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;

  if (path.startsWith("/uploads")) {
    return `${API_URL.replace("/api", "")}${path}`;
  }

  return path;
};

export default function ProfilPage() {
  const nav = useNavigate();
  const token = localStorage.getItem("token");

  const { id } = useParams(); // 👈 ID DU PROFIL VISITÉ

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  })();

  /* ================================================
     INIT LOAD
  ================================================ */
  useEffect(() => {
    if (!token) return nav("/login");

    loadProfile();
    loadUserPosts();
  }, [id]); // 👈 recharge lors d'un changement d'URL

  /* ================================================
     UPLOAD HANDLERS
  ================================================ */
  const triggerFileUpload = (type) => {
    if (type === "avatar") avatarInputRef.current.click();
    else coverInputRef.current.click();
  };

  const handleUpload = async (file, endpoint, field) => {
    if (!file || isUploading) return;

    const formData = new FormData();
    formData.append(field, file);

    setIsUploading(true);

    try {
      const res = await fetch(`${API_URL}/auth${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setUser((prev) => ({
          ...prev,
          [field]: fixUrl(data[field]),
        }));
      } else {
        alert(data.error || "Erreur upload.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur serveur.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarChange = (e) => {
    const f = e.target.files[0];
    if (f) handleUpload(f, "/profile/avatar", "avatar");
  };

  const handleCoverChange = (e) => {
    const f = e.target.files[0];
    if (f) handleUpload(f, "/profile/cover", "coverPhoto");
  };

  /* ================================================
     LOAD PROFILE (CORRECT ENDPOINT)
  ================================================ */
  const loadProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/user/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok && data.user) {
        setUser({
          ...data.user,
          avatar: fixUrl(data.user.avatar),
          coverPhoto: fixUrl(data.user.coverPhoto),
        });
      }
    } catch (err) {
      console.error("PROFILE ERROR:", err);
    }
  };

  /* ================================================
     LOAD POSTS (CORRIGÉ)
  ================================================ */
  const loadUserPosts = async () => {
    try {
      const res = await fetch(`${API_URL}/posts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const list = await res.json();

      if (res.ok && Array.isArray(list)) {
        const filtered = list
          .filter((p) => p.user?._id === id) // 👈 posts de CE profil
          .map((p) => ({
            ...p,
            media: p.media?.map((m) => ({
              ...m,
              url: fixUrl(m.url),
            })),
          }));

        setPosts(filtered);
      }
    } catch (err) {
      console.error("POST ERROR:", err);
    }

    setLoading(false);
  };

  /* ================================================
     LOADING
  ================================================ */
  if (!user || loading) {
    return <div className="profil-loading">Chargement du profil…</div>;
  }

  const isOwner = currentUser?._id === id;

  const coverURL = user.coverPhoto || "/default-cover.jpg";
  const avatarURL = user.avatar || "/default-avatar.png";

  /* ================================================
     RENDER
  ================================================ */
  return (
    <div className="profil-wrapper">
      {/* Hidden Upload Inputs */}
      {isOwner && (
        <>
          <input
            ref={coverInputRef}
            type="file"
            style={{ display: "none" }}
            accept="image/*"
            onChange={handleCoverChange}
          />
          <input
            ref={avatarInputRef}
            type="file"
            style={{ display: "none" }}
            accept="image/*"
            onChange={handleAvatarChange}
          />
        </>
      )}

      {/* COVER */}
      <div className="profil-cover">
        <img src={coverURL} alt="cover" />
        {isOwner && (
          <button
            className="change-cover-btn"
            onClick={() => triggerFileUpload("cover")}
          >
            Changer la couverture
          </button>
        )}
      </div>

      {/* HEADER */}
      <div className="profil-header">
        <div className="profil-header-content">
          <div
            className="profil-avatar"
            style={{ backgroundImage: `url(${avatarURL})` }}
          >
            {isOwner && (
              <button
                className="change-avatar-btn"
                onClick={() => triggerFileUpload("avatar")}
              >
                📷
              </button>
            )}
          </div>

          <div className="profil-info-area">
            <h2>{user.name}</h2>
            <div className="profil-email">{user.email}</div>

            {isOwner && (
              <button className="profil-btn" onClick={() => nav("/settings")}>
                Modifier mon profil
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="profil-tabs">
        <button
          className={activeTab === "posts" ? "active" : ""}
          onClick={() => setActiveTab("posts")}
        >
          Publications
        </button>

        <button
          className={activeTab === "about" ? "active" : ""}
          onClick={() => setActiveTab("about")}
        >
          À propos
        </button>

        <button
          className={activeTab === "photos" ? "active" : ""}
          onClick={() => setActiveTab("photos")}
        >
          Photos
        </button>
      </div>

      {/* CONTENT */}
      <div className="profil-content">
        {/* POSTS */}
        {activeTab === "posts" && (
          <div className="profil-posts">
            {posts.length === 0 ? (
              <div className="profil-empty">Aucune publication.</div>
            ) : (
              posts.map((p) => (
                <Post key={p._id} post={p} currentUser={currentUser} />
              ))
            )}
          </div>
        )}

        {/* ABOUT */}
        {activeTab === "about" && (
          <div className="profil-about">
            <h3>À propos</h3>
            <p>Aucune information.</p>
          </div>
        )}

        {/* PHOTOS */}
        {activeTab === "photos" && (
          <div className="profil-photos">
            <h3>Photos</h3>
            <p>Aucune photo.</p>
          </div>
        )}
      </div>
    </div>
  );
}
