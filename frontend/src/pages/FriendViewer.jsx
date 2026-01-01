import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import FacebookLayout from "./FacebookLayout";
import { useAuth } from "../context/AuthContext";
import "../styles/friend-viewer.css";

const API_URL = import.meta.env.VITE_API_URL;

const resolveAvatarUrl = (user) => {
  if (!user) return null;

  const avatar =
    user.avatar ||
    user.profilePicture ||
    user.photo ||
    user.picture ||
    user.profile?.avatar;

  if (typeof avatar !== "string" || avatar.trim() === "") return null;

  const normalizedAvatar = avatar.trim();
  if (normalizedAvatar.startsWith("http")) return normalizedAvatar;

  const baseUrl = API_URL || "";
  return `${baseUrl}${normalizedAvatar.startsWith("/") ? normalizedAvatar : `/${normalizedAvatar}`}`;
};

const getInitials = (name) => {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const normalizeFriend = (friend) => {
  if (!friend) return null;
  const rawUser = friend.user || friend.friend || friend;
  if (!rawUser) return null;
  const id = rawUser._id || rawUser.id || (typeof rawUser === "string" ? rawUser : null);
  const name = rawUser.name || rawUser.fullName || "Utilisateur";
  const extraAvatar =
    friend.avatar ||
    friend.profilePicture ||
    friend.photo ||
    friend.picture ||
    friend.profile?.avatar;
  const user =
    rawUser && typeof rawUser === "object"
      ? {
          ...rawUser,
          avatar: rawUser.avatar || extraAvatar,
        }
      : rawUser;
  return {
    id,
    name,
    user,
  };
};

export default function FriendViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failedAvatars, setFailedAvatars] = useState(() => new Set());

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
              <FriendCard
                key={friend.id}
                friend={friend}
                onOpenProfile={handleProfileOpen}
                failedAvatars={failedAvatars}
                setFailedAvatars={setFailedAvatars}
              />
            ))}
          </div>
        )}
      </div>
    </FacebookLayout>
  );
}

function FriendCard({ friend, onOpenProfile, failedAvatars, setFailedAvatars }) {
  const avatarUrl = resolveAvatarUrl(friend.user);
  const showAvatar = avatarUrl && !failedAvatars.has(friend.id);
  const initials = getInitials(friend.name);

  const handleAvatarError = () => {
    setFailedAvatars((previous) => {
      const next = new Set(previous);
      next.add(friend.id);
      return next;
    });
  };

  return (
    <button
      type="button"
      className="friend-viewer-card"
      onClick={() => onOpenProfile(friend.id)}
    >
      {showAvatar ? (
        <img
          src={avatarUrl}
          alt={`Photo de ${friend.name}`}
          className="friend-avatar"
          loading="lazy"
          onError={handleAvatarError}
        />
      ) : (
        <div className="friend-avatar-fallback">{initials}</div>
      )}
      <div className="friend-viewer-details">
        <div className="friend-viewer-name">{friend.name}</div>
        <span className="friend-viewer-action">Voir le profil</span>
      </div>
    </button>
  );
}
