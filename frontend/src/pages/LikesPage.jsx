import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useRelation from "../hooks/useRelation";
import { API_URL } from "../api/config";
import "../styles/relations.css";

export default function LikesPage() {
  const { postId } = useParams();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [likers, setLikers] = useState([]);
  const [likesCount, setLikesCount] = useState(0);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch (err) {
      return {};
    }
  }, []);

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

        if (!res.ok) {
          nav(-1);
          return;
        }

        const users = Array.isArray(data.likes)
          ? data.likes
              .map((like) => {
                const user = like?.user;

                if (!user || !user._id) return null;

                return {
                  ...user,
                  avatar: user.avatar || user.profile?.avatar,
                };
              })
              .filter(Boolean)
          : [];

        const total =
          typeof data.total === "number"
            ? data.total
            : Array.isArray(data.likes)
            ? data.likes.length
            : 0;

        setLikers(users);
        setLikesCount(total);
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

  const fixAvatar = (avatar) => {
    if (!avatar || typeof avatar !== "string") return "/default-avatar.png";
    if (avatar.startsWith("http")) return avatar;
    return `${API_URL}${avatar}`;
  };

  const isMe = useCallback(
    (userId) => String(currentUser?._id) === String(userId),
    [currentUser]
  );

  return (
    <div className="relations-page">
      <h2>Mentions J’aime ({likesCount})</h2>

      {loading && <div className="relations-loading">Chargement…</div>}

      {!loading && likers.length === 0 && (
        <div className="relations-empty">Aucune mention J’aime pour le moment.</div>
      )}

      <div className="relations-list">
        {likers.map((user) => (
          <LikeCard
            key={user?._id}
            user={user}
            isMe={isMe}
            onProfileClick={handleProfileClick}
            fixAvatar={fixAvatar}
            navigate={nav}
          />
        ))}
      </div>
    </div>
  );
}

function LikeCard({ user, isMe, onProfileClick, fixAvatar, navigate }) {
  const { status, loading, sendRequest, acceptRequest } = useRelation(
    user?._id
  );

  const handleCardClick = () => {
    if (!user?._id) return;
    onProfileClick(user._id);
  };

  const handleMessage = (e) => {
    e.stopPropagation();
    if (!user?._id) return;
    navigate(`/messages?userId=${user._id}`);
  };

  const handleAddFriend = (e) => {
    e.stopPropagation();
    sendRequest();
  };

  const handleAccept = (e) => {
    e.stopPropagation();
    acceptRequest();
  };

  const renderFriendButton = () => {
    if (!status || !user?._id || isMe(user._id)) return null;

    if (status.isFriend) {
      return (
        <button className="btn-reject" disabled>
          Déjà ami
        </button>
      );
    }

    if (status.requestReceived) {
      return (
        <button className="btn-accept" onClick={handleAccept} disabled={loading}>
          Accepter
        </button>
      );
    }

    if (status.requestSent) {
      return (
        <button className="btn-reject" disabled>
          Demande envoyée
        </button>
      );
    }

    return (
      <button className="btn-accept" onClick={handleAddFriend} disabled={loading}>
        Ajouter
      </button>
    );
  };

  const renderMessageButton = () => {
    if (!user?._id || isMe(user._id)) return null;

    return (
      <button className="btn-reject" onClick={handleMessage} disabled={loading}>
        Message
      </button>
    );
  };

  return (
    <div
      className="relation-card"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleCardClick();
      }}
    >
      <img
        src={fixAvatar(user?.avatar)}
        alt={user?.name || "Profil"}
        className="relation-avatar"
      />
      <div className="relation-info">
        <strong>{user?.name || "Utilisateur"}</strong>
        {user?.email && <span>{user.email}</span>}
      </div>

      <div className="relation-actions">
        {renderFriendButton()}
        {renderMessageButton()}
      </div>
    </div>
  );
}
