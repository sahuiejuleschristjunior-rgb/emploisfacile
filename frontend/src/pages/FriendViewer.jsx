import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_URL } from "../api/config";
import { useAuth } from "../context/AuthContext";
import FacebookLayout from "./FacebookLayout";
import "../styles/friend-viewer.css";

const fixAvatar = (avatar) => {
  if (!avatar || typeof avatar !== "string") return "/default-avatar.png";
  if (avatar.startsWith("http")) return avatar;
  return `${API_URL}${avatar}`;
};

const normalizeFriend = (friend) => {
  if (!friend) return null;
  const rawUser = friend.user || friend.friend || friend;
  if (!rawUser) return null;
  const id = rawUser._id || rawUser.id || (typeof rawUser === "string" ? rawUser : null);
  const name = rawUser.name || rawUser.fullName || "Utilisateur";
  const avatar = rawUser.avatar || rawUser.profile?.avatar || null;
  return {
    id,
    name,
    avatar: fixAvatar(avatar),
  };
};

export default function FriendViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    fetch(`${API_URL}/auth/user/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        const data = await res.json();
        const payload = data?.user ?? data;
        if (!res.ok || !payload?._id) {
          throw new Error("Utilisateur introuvable");
        }
        setProfileUser(payload);
      })
      .catch((err) => {
        console.error("Erreur chargement profil:", err);
        setProfileUser(null);
      })
      .finally(() => setLoading(false));
  }, [id, token]);

  const friends = useMemo(() => {
    if (!profileUser?.friends) return [];
    const normalized = profileUser.friends
      .map(normalizeFriend)
      .filter((friend) => friend && friend.id);
    const seen = new Set();
    return normalized.filter((friend) => {
      if (seen.has(friend.id)) return false;
      seen.add(friend.id);
      return true;
    });
  }, [profileUser]);

  const handleProfileOpen = (friendId) => {
    if (!friendId) return;
    navigate(`/profil/${friendId}`);
  };

  const handleBackToProfile = () => {
    if (!profileUser?._id) return;
    navigate(`/profil/${profileUser._id}`);
  };

  return (
    <FacebookLayout headerOnly>
      <div className="friend-viewer">
        <div className="friend-viewer-header">
          <div>
            <h2>Amis de {profileUser?.name || "ce profil"}</h2>
            {profileUser && (
              <p className="friend-viewer-subtitle">
                {friends.length} ami{friends.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
          {profileUser && (
            <button className="profil-btn ghost" onClick={handleBackToProfile}>
              Retour au profil
            </button>
          )}
        </div>

        {loading && <div className="friend-viewer-loading">Chargement…</div>}

        {!loading && friends.length === 0 && (
          <div className="friend-viewer-empty">Aucun ami à afficher.</div>
        )}

        {!loading && friends.length > 0 && (
          <div className="friend-viewer-grid">
            {friends.map((friend) => (
              <button
                key={friend.id}
                type="button"
                className="friend-viewer-card"
                onClick={() => handleProfileOpen(friend.id)}
              >
                <img src={friend.avatar} alt={friend.name} loading="lazy" />
                <div className="friend-viewer-name">{friend.name}</div>
                <span className="friend-viewer-action">Voir le profil</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </FacebookLayout>
  );
}
