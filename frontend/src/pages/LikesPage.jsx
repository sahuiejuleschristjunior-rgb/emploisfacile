import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_URL } from "../api/config";
import "../styles/relations.css";

export default function LikesPage() {
  const { postId } = useParams();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [likers, setLikers] = useState([]);

  const token = localStorage.getItem("token");

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  const loadPostLikes = useCallback(
    async (id) => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/posts/${id}/likes`, {
          headers: authHeaders,
        });
        const data = await res.json();

        console.log(data.likes);

        if (!res.ok) {
          nav(-1);
          return;
        }

        const users = Array.isArray(data.likes)
          ? data.likes
              .map((like) => like?.user)
              .filter((user) => Boolean(user && user._id))
          : [];

        setLikers(users);
      } catch (err) {
        console.error("Erreur chargement likes", err);
      } finally {
        setLoading(false);
      }
    },
    [authHeaders, nav]
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

      {loading && <div className="relations-loading">Chargement…</div>}

      {!loading && likers.length === 0 && (
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
