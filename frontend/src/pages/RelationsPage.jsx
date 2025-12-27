import { useState, useEffect, useCallback } from "react";
import { API_URL } from "../api/config";
import useFriendRequests from "../hooks/useFriendRequests";
import { changeFriendCategory } from "../api/socialApi";
import "../styles/relations.css";

/* ======================================================
   🔥 FIX AVATAR (SÉCURISÉ)
====================================================== */
const fixAvatar = (avatar) => {
  if (!avatar || typeof avatar !== "string") return "/default-avatar.png";
  if (avatar.startsWith("http")) return avatar;
  return `${API_URL}${avatar}`;
};

export default function RelationsPage() {
  const {
    requests,
    loading,
    accept,
    reject,
    refreshRequests, // 🔥 IMPORTANT
  } = useFriendRequests();

  /* ======================================================
       🔥 LISTE DES AMIS
  ===================================================== */
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  /* ======================================================
       🔥 LOAD FRIENDS (RÉUTILISABLE)
  ===================================================== */
  const loadFriends = useCallback(async () => {
    try {
      setLoadingFriends(true);

      const res = await fetch(`${API_URL}/social/friends`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        setFriends(Array.isArray(data.friends) ? data.friends : []);
      }
    } catch (err) {
      console.error("Erreur chargement amis", err);
    } finally {
      setLoadingFriends(false);
    }
  }, []);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  /* ======================================================
       🔥 ACCEPT / REJECT (SYNC PROPRE)
  ===================================================== */
  const handleAccept = async (userId) => {
    await accept(userId);
    await refreshRequests();
    await loadFriends(); // 🔥 clé du bug
  };

  const handleReject = async (userId) => {
    await reject(userId);
    await refreshRequests();
  };

  /* ======================================================
       🔥 CHANGEMENT DE CATÉGORIE
  ===================================================== */
  const handleChangeCategory = async (friendId, newCategory) => {
    try {
      await changeFriendCategory(friendId, newCategory);

      setFriends((prev) =>
        prev.map((f) =>
          f?.user?._id === friendId
            ? { ...f, category: newCategory }
            : f
        )
      );
    } catch (err) {
      console.error("Erreur changement catégorie :", err);
    }
  };

  /* ======================================================
       🔥 SÉPARATION PAR CATÉGORIE
  ===================================================== */
  const safeFriends = friends.filter(
    (f) => f && f.user && f.category
  );

  const publicFriends = safeFriends.filter(
    (f) => f.category === "public"
  );

  const professionalFriends = safeFriends.filter(
    (f) => f.category === "professional"
  );

  return (
    <div className="relations-page">

      {/* ======================================================
          🔥 1) DEMANDES D’AMIS
      ===================================================== */}
      <h2>Demandes d’amis</h2>

      {loading && <div className="relations-loading">Chargement…</div>}

      {!loading && requests.length === 0 && (
        <div className="relations-empty">Aucune demande d’ami.</div>
      )}

      <div className="relations-list">
        {requests.map((u) => (
          <div key={u._id} className="relation-card">
            <img
              src={fixAvatar(u.avatar)}
              alt={u.name}
              className="relation-avatar"
              loading="lazy"
            />

            <div className="relation-info">
              <strong>{u.name}</strong>
              <span>{u.email}</span>
            </div>

            <div className="relation-actions">
              <button
                className="btn-accept"
                onClick={() => handleAccept(u._id)}
              >
                Accepter
              </button>

              <button
                className="btn-reject"
                onClick={() => handleReject(u._id)}
              >
                Refuser
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ======================================================
          🔥 2) RELATIONS PUBLIQUES
      ===================================================== */}
      <h2>Relations publiques</h2>

      {loadingFriends && (
        <div className="relations-loading">Chargement…</div>
      )}

      {!loadingFriends && publicFriends.length === 0 && (
        <div className="relations-empty">
          Aucune relation publique.
        </div>
      )}

      <div className="relations-list">
        {publicFriends.map((friend) => (
          <div key={friend.user._id} className="relation-card">
            <img
              src={fixAvatar(friend.user.avatar)}
              alt={friend.user.name}
              className="relation-avatar"
              loading="lazy"
            />

            <div className="relation-info">
              <strong>{friend.user.name}</strong>
            </div>

            <button
              className="btn-category"
              onClick={() =>
                handleChangeCategory(friend.user._id, "professional")
              }
            >
              Passer en relation pro
            </button>
          </div>
        ))}
      </div>

      {/* ======================================================
          🔥 3) RELATIONS PROFESSIONNELLES
      ===================================================== */}
      <h2>Relations professionnelles</h2>

      {!loadingFriends && professionalFriends.length === 0 && (
        <div className="relations-empty">
          Aucune relation professionnelle.
        </div>
      )}

      <div className="relations-list">
        {professionalFriends.map((friend) => (
          <div key={friend.user._id} className="relation-card">
            <img
              src={fixAvatar(friend.user.avatar)}
              alt={friend.user.name}
              className="relation-avatar"
              loading="lazy"
            />

            <div className="relation-info">
              <strong>{friend.user.name}</strong>
            </div>

            <button
              className="btn-category"
              onClick={() =>
                handleChangeCategory(friend.user._id, "public")
              }
            >
              Passer en relation publique
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}