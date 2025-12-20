import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_URL } from "../api/config";
import "../styles/relations.css";

export default function LikesPage() {
  const { postId } = useParams();
  const nav = useNavigate();

  const [loadingPost, setLoadingPost] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [likers, setLikers] = useState([]);

  const token = localStorage.getItem("token");

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  const loadUserProfiles = useCallback(
    async (ids) => {
      setLoadingUsers(true);
      try {
        const uniqueIds = Array.from(new Set((ids || []).map(String)));

        const profiles = [];
        for (const uid of uniqueIds) {
          try {
            const res = await fetch(`${API_URL}/auth/user/${uid}`, {
              headers: authHeaders,
            });

            const data = await res.json();
            if (res.ok && data) profiles.push(data.user || data);
          } catch (err) {
            console.error("Erreur profil liker", err);
          }
        }

        setLikers(profiles);
      } finally {
        setLoadingUsers(false);
      }
    },
    [authHeaders]
  );

  const loadPostLikes = useCallback(
    async (id) => {
      setLoadingPost(true);
      try {
        const res = await fetch(`/api/posts/${id}`, { headers: authHeaders });
        const data = await res.json();

        if (!res.ok) {
          nav(-1);
          return;
        }

        const ids = Array.isArray(data.likes) ? data.likes : [];
        await loadUserProfiles(ids);
      } catch (err) {
        console.error("Erreur chargement likes", err);
      } finally {
        setLoadingPost(false);
      }
    },
    [authHeaders, loadUserProfiles, nav]
  );

  useEffect(() => {
    if (!token) {
      nav("/login");
      return;
    }

    if (postId) {
      loadPostLikes(postId);
    }
  }, [postId, token, nav, loadPostLikes]);

  const handleProfileClick = (userId) => {
    nav(`/profil/${userId}`);
  };

  return (
    <div className="relations-page">
      <h2>Mentions J’aime</h2>

      {(loadingPost || loadingUsers) && (
        <div className="relations-loading">Chargement…</div>
      )}

      {!loadingUsers && likers.length === 0 && (
        <div className="relations-empty">Aucune mention J’aime pour le moment.</div>
      )}

      <div className="relations-list">
        {likers.map((user) => (
          <div
            key={user?._id}
            className="relation-card"
            onClick={() => handleProfileClick(user?._id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleProfileClick(user?._id);
            }}
          >
            <img
              src={user?.avatar || "/default-avatar.png"}
              alt={user?.name || "Profil"}
              className="relation-avatar"
            />
            <div className="relation-info">
              <strong>{user?.name || "Utilisateur"}</strong>
              {user?.email && <span>{user.email}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
