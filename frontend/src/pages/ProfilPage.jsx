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

  const { id: routeId } = useParams(); // 👈 ID DU PROFIL VISITÉ

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [bioDraft, setBioDraft] = useState("");
  const [savingBio, setSavingBio] = useState(false);

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
  const profileId = routeId || currentUser?._id;

  useEffect(() => {
    if (!token) return nav("/login");
    if (!profileId) return;

    loadProfile(profileId);
    loadUserPosts(profileId);
  }, [profileId]); // 👈 recharge lors d'un changement d'URL

  useEffect(() => {
    setBioDraft(user?.bio || "");
  }, [user]);

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

  const handleBioSave = async (e) => {
    e.preventDefault();
    if (!isOwner || savingBio) return;

    setSavingBio(true);

    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bio: bioDraft }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Impossible de mettre à jour la bio.");
        return;
      }

      if (data.user) {
        setUser((prev) => ({
          ...prev,
          ...data.user,
          avatar: fixUrl(data.user.avatar),
          coverPhoto: fixUrl(data.user.coverPhoto),
        }));
      }
    } catch (err) {
      console.error("BIO UPDATE ERROR", err);
      alert("Erreur serveur lors de la mise à jour de la bio.");
    } finally {
      setSavingBio(false);
    }
  };

  /* ================================================
     LOAD PROFILE (CORRECT ENDPOINT)
  ================================================ */
  const loadProfile = async (targetId) => {
    if (!targetId) return;
    try {
      const res = await fetch(`${API_URL}/auth/user/${targetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      const payload = data?.user || data; // L'API renvoie soit { user }, soit directement l'utilisateur

      if (res.ok && payload) {
        setUser({
          ...payload,
          avatar: fixUrl(payload.avatar),
          coverPhoto: fixUrl(payload.coverPhoto),
        });
      }
    } catch (err) {
      console.error("PROFILE ERROR:", err);
    }
  };

  /* ================================================
     LOAD POSTS (CORRIGÉ)
  ================================================ */
  const loadUserPosts = async (targetId) => {
    if (!targetId) return;
    try {
      const res = await fetch(`${API_URL}/posts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const list = await res.json();

      if (res.ok && Array.isArray(list)) {
        const filtered = list
          .filter((p) => p.user?._id === targetId) // 👈 posts de CE profil
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

  const isOwner = currentUser?._id === profileId;

  const coverURL = user.coverPhoto || "/default-cover.jpg";
  const avatarURL = user.avatar || "/default-avatar.png";
  const bioText = user.bio?.trim() || "Aucune bio renseignée pour le moment.";

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
            <p className="profil-bio-inline">{bioText}</p>

            {isOwner && (
              <button
                className="profil-btn"
                onClick={() => nav("/fb/settings")}
              >
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
          <div className="profil-about-grid">
            <div className="profil-card">
              <h3>Biographie</h3>
              {isOwner ? (
                <form className="profil-bio-form" onSubmit={handleBioSave}>
                  <textarea
                    value={bioDraft}
                    onChange={(e) => setBioDraft(e.target.value)}
                    placeholder="Parlez un peu de vous..."
                    rows={5}
                    maxLength={500}
                  />
                  <div className="profil-bio-actions">
                    <span className="profil-bio-hint">
                      {bioDraft?.trim().length || 0}/500 caractères
                    </span>
                    <button
                      className="profil-btn primary"
                      type="submit"
                      disabled={savingBio}
                    >
                      {savingBio ? "Enregistrement..." : "Mettre à jour"}
                    </button>
                  </div>
                </form>
              ) : (
                <p className="profil-intro-text">{bioText}</p>
              )}
            </div>

            <div className="profil-card profil-info-card">
              <h3>Informations</h3>
              <div className="profil-info-line">
                <span role="img" aria-label="mail">
                  📧
                </span>
                <span>{user.email}</span>
              </div>
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
