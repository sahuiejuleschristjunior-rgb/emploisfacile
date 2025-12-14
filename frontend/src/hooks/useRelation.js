import { useEffect, useState, useCallback } from "react";
import {
  fetchRelationStatus,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
  followUser,
  unfollowUser,
  blockUser,
  unblockUser,
} from "../api/socialApi.js"; // ✅ EXTENSION OBLIGATOIRE POUR VITE PROD

export default function useRelation(targetId) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ======================================================
     🔄 Charger le statut de relation
  ====================================================== */
  const refresh = useCallback(async () => {
    if (!targetId) {
      setStatus(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetchRelationStatus(targetId);
      setStatus(res.status || null);
    } catch (err) {
      console.error("Erreur status relation:", err);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [targetId]);

  /* ======================================================
     🔁 Recharger quand targetId change
  ====================================================== */
  useEffect(() => {
    refresh();
  }, [refresh]);

  /* ======================================================
     🔥 Exécuteur d’actions sécurisé
  ====================================================== */
  const run = async (fn) => {
    if (!targetId || typeof fn !== "function") return;

    setLoading(true);
    try {
      await fn(targetId);
      await refresh();
    } catch (err) {
      console.error("Erreur action relation:", err);
      setLoading(false);
    }
  };

  /* ======================================================
     ✅ API DU HOOK
  ====================================================== */
  return {
    status,
    loading,

    sendRequest: () => run(sendFriendRequest),
    acceptRequest: () => run(acceptFriendRequest),
    rejectRequest: () => run(rejectFriendRequest),
    cancelRequest: () => run(cancelFriendRequest),
    removeFriend: () => run(removeFriend),

    follow: () => run(followUser),
    unfollow: () => run(unfollowUser),

    block: () => run(blockUser),
    unblock: () => run(unblockUser),

    // 🔁 utile pour socket / refresh manuel
    refresh,
  };
}