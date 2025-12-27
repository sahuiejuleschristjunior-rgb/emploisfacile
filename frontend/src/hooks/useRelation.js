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
import { useNotifications } from "../context/NotificationContext";

export default function useRelation(targetId) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const { socket, notifications } = useNotifications() || {};

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
     🔔 Mise à jour automatique via notifications / socket
  ====================================================== */
  useEffect(() => {
    if (!targetId || !socket) return;

    const onFriendUpdate = ({ friend }) => {
      if (String(friend) === String(targetId)) {
        refresh();
      }
    };

    socket.on("friend:update", onFriendUpdate);

    return () => {
      socket.off("friend:update", onFriendUpdate);
    };
  }, [socket, targetId, refresh]);

  useEffect(() => {
    if (!Array.isArray(notifications) || !targetId) return;

    const relevantTypes = new Set([
      "friend_request",
      "friend_accept",
      "friend_reject",
      "friend_remove",
    ]);

    const hasRelatedNotification = notifications.some((n) => {
      if (!n?.type || !relevantTypes.has(n.type)) return false;
      const fromId = n.from?._id || n.from;
      return String(fromId) === String(targetId);
    });

    if (hasRelatedNotification) {
      refresh();
    }
  }, [notifications, targetId, refresh]);

  /* ======================================================
     🔥 Exécuteur d’actions sécurisé
  ====================================================== */
  const run = async (fn, optimisticUpdate = null) => {
    if (!targetId || typeof fn !== "function") return;

    setLoading(true);

    // ⚡ Optimistic update pour refléter immédiatement l’action
    if (optimisticUpdate && typeof optimisticUpdate === "object") {
      setStatus((prev) => ({ ...(prev || {}), ...optimisticUpdate }));
    }

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

    sendRequest: () =>
      run(sendFriendRequest, {
        requestSent: true,
        requestReceived: false,
        isFriend: false,
      }),
    acceptRequest: () =>
      run(acceptFriendRequest, { requestReceived: false, isFriend: true }),
    rejectRequest: () => run(rejectFriendRequest, { requestReceived: false }),
    cancelRequest: () => run(cancelFriendRequest, { requestSent: false }),
    removeFriend: () =>
      run(removeFriend, {
        isFriend: false,
        requestSent: false,
        requestReceived: false,
      }),

    follow: () => run(followUser, { isFollowing: true }),
    unfollow: () => run(unfollowUser, { isFollowing: false }),

    block: () => run(blockUser, { isBlocked: true }),
    unblock: () => run(unblockUser, { isBlocked: false }),

    // 🔁 utile pour socket / refresh manuel
    refresh,
  };
}