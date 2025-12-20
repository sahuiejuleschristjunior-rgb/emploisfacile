const User = require("../models/User");
const Notification = require("../models/Notification");
const { getIO } = require("../socket");

/* ============================================================
   🔥 ENVOYER NOTIFICATION + SOCKET
============================================================ */
async function pushNotification(userId, data) {
  if (data.type === "friend_request") {
    const exists = await Notification.findOne({
      user: userId,
      from: data.from,
      type: "friend_request",
      read: false,
    });

    if (exists) return exists;
  }

  const notif = await Notification.create({
    user: userId,
    from: data.from,
    type: data.type,
    text: data.text || "",
    post: data.post || null,
    read: false,
  });

  getIO().to(String(userId)).emit("notification:new", notif);
  return notif;
}

/* ============================================================
   🔥 AMIS — ENVOYER DEMANDE
============================================================ */
exports.sendFriendRequest = async (req, res) => {
  try {
    const me = req.user.id;
    const other = req.params.id;

    if (me === other)
      return res
        .status(400)
        .json({ error: "Impossible de vous ajouter vous-même." });

    const userMe = await User.findById(me);
    const userOther = await User.findById(other);

    if (!userOther)
      return res.status(404).json({ error: "Utilisateur introuvable" });

    if (userMe.blockedUsers.some((id) => id.toString() === other)) {
      return res.status(400).json({ error: "Utilisateur bloqué." });
    }

    if (userOther.blockedUsers.some((id) => id.toString() === me)) {
      return res
        .status(400)
        .json({ error: "Vous avez été bloqué par cet utilisateur." });
    }

    if (userMe.friends.some((f) => f.user.toString() === other))
      return res.status(400).json({ error: "Vous êtes déjà amis." });

    if (userOther.friendRequestsReceived.some((id) => id.toString() === me))
      return res.status(400).json({ error: "Demande déjà envoyée." });

    if (userMe.friendRequestsSent.some((id) => id.toString() === other))
      return res.status(400).json({ error: "Demande déjà envoyée." });

    userMe.friendRequestsSent.push(other);
    userOther.friendRequestsReceived.push(me);

    await userMe.save();
    await userOther.save();

    await pushNotification(other, {
      from: me,
      type: "friend_request",
      text: "Vous avez reçu une demande d’ami.",
    });

    res.json({ success: true, message: "Demande d'ami envoyée." });
  } catch (err) {
    console.error("sendFriendRequest:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

/* ============================================================
   🔥 AMIS — ACCEPTER DEMANDE
============================================================ */
exports.acceptFriendRequest = async (req, res) => {
  try {
    const me = req.user.id;
    const other = req.params.id;

    const userMe = await User.findById(me);
    const userOther = await User.findById(other);

    if (!userOther)
      return res.status(404).json({ error: "Utilisateur introuvable" });

    if (!userMe.friendRequestsReceived.some((id) => id.toString() === other))
      return res.status(400).json({ error: "Aucune demande trouvée." });

    userMe.friendRequestsReceived = userMe.friendRequestsReceived.filter(
      (id) => id.toString() !== other
    );
    userOther.friendRequestsSent = userOther.friendRequestsSent.filter(
      (id) => id.toString() !== me
    );

    userMe.friends.push({ user: other, category: "public" });
    userOther.friends.push({ user: me, category: "public" });

    await userMe.save();
    await userOther.save();

    await Notification.deleteMany({
      type: "friend_request",
      $or: [
        { user: me, from: other },
        { user: other, from: me },
      ],
    });

    await pushNotification(other, {
      from: me,
      type: "friend_accept",
      text: "Votre demande d’ami a été acceptée.",
    });

    getIO().to(String(other)).emit("friend:update", { friend: me });

    res.json({ success: true, message: "Demande acceptée." });
  } catch (err) {
    console.error("acceptFriendRequest:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

/* ============================================================
   🔥 AMIS — REFUSER DEMANDE
============================================================ */
exports.rejectFriendRequest = async (req, res) => {
  try {
    const me = req.user.id;
    const other = req.params.id;

    const userMe = await User.findById(me);
    const userOther = await User.findById(other);

    userMe.friendRequestsReceived = userMe.friendRequestsReceived.filter(
      (id) => id.toString() !== other
    );
    userOther.friendRequestsSent = userOther.friendRequestsSent.filter(
      (id) => id.toString() !== me
    );

    await userMe.save();
    await userOther.save();

    await Notification.deleteMany({
      type: "friend_request",
      $or: [
        { user: me, from: other },
        { user: other, from: me },
      ],
    });

    await pushNotification(other, {
      from: me,
      type: "friend_reject",
      text: "Votre demande d’ami a été refusée.",
    });

    res.json({ success: true, message: "Demande refusée." });
  } catch (err) {
    console.error("rejectFriendRequest:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

/* ============================================================
   🔥 ANNULER DEMANDE ENVOYÉE
============================================================ */
exports.cancelFriendRequest = async (req, res) => {
  try {
    const me = req.user.id;
    const other = req.params.id;

    const userMe = await User.findById(me);
    const userOther = await User.findById(other);

    userMe.friendRequestsSent = userMe.friendRequestsSent.filter(
      (id) => id.toString() !== other
    );
    userOther.friendRequestsReceived =
      userOther.friendRequestsReceived.filter(
        (id) => id.toString() !== me
      );

    await userMe.save();
    await userOther.save();

    await Notification.deleteMany({
      type: "friend_request",
      user: other,
      from: me,
    });

    res.json({ success: true, message: "Demande annulée." });
  } catch (err) {
    console.error("cancelFriendRequest:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

/* ============================================================
   🔥 SUPPRIMER UN AMI
============================================================ */
exports.removeFriend = async (req, res) => {
  try {
    const me = req.user.id;
    const other = req.params.id;

    const userMe = await User.findById(me);
    const userOther = await User.findById(other);

    userMe.friends = userMe.friends.filter(
      (f) => f.user.toString() !== other
    );
    userOther.friends = userOther.friends.filter(
      (f) => f.user.toString() !== me
    );

    await userMe.save();
    await userOther.save();

    await pushNotification(other, {
      from: me,
      type: "friend_remove",
      text: "Vous n’êtes plus amis.",
    });

    res.json({ success: true, message: "Ami retiré." });
  } catch (err) {
    console.error("removeFriend:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

/* ============================================================
   🔥 CHANGER CATÉGORIE D’UN AMI (VERSION CORRIGÉE)
============================================================ */
exports.changeFriendCategory = async (req, res) => {
  try {
    const me = req.user.id;
    const friendId = req.params.id;
    const { category } = req.body;

    if (!["public", "professional"].includes(category)) {
      return res.status(400).json({ error: "Catégorie invalide" });
    }

    const user = await User.findById(me);

    const relation = user.friends.find(
      (f) => f.user.toString() === friendId
    );

    if (!relation) {
      return res.status(404).json({ error: "Ami introuvable" });
    }

    relation.category = category;

    // 🔥 LIGNE CRITIQUE
    user.markModified("friends");

    await user.save();

    res.json({
      success: true,
      category,
    });
  } catch (err) {
    console.error("changeFriendCategory:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

/* ============================================================
   🔥 STATUT RELATION
============================================================ */
exports.getRelationStatus = async (req, res) => {
  try {
    const meId = req.user?.id;
    const otherId = req.params?.id;

    if (!meId || !otherId) {
      return res.json({
        success: true,
        status: {
          isFriend: false,
          requestSent: false,
          requestReceived: false,
          isFollowing: false,
          isBlocked: false,
        },
      });
    }

    const me = await User.findById(meId).select(
      "friends friendRequestsSent friendRequestsReceived following blockedUsers"
    );

    if (!me) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    const otherStr = String(otherId);

    const isFriend = Array.isArray(me.friends)
      ? me.friends.some(
          (f) => f && f.user && String(f.user) === otherStr
        )
      : false;

    const requestSent = Array.isArray(me.friendRequestsSent)
      ? me.friendRequestsSent.some(
          (id) => id && String(id) === otherStr
        )
      : false;

    const requestReceived = Array.isArray(me.friendRequestsReceived)
      ? me.friendRequestsReceived.some(
          (id) => id && String(id) === otherStr
        )
      : false;

    const isFollowing = Array.isArray(me.following)
      ? me.following.some(
          (id) => id && String(id) === otherStr
        )
      : false;

    const isBlocked = Array.isArray(me.blockedUsers)
      ? me.blockedUsers.some(
          (id) => id && String(id) === otherStr
        )
      : false;

    return res.json({
      success: true,
      status: {
        isFriend,
        requestSent,
        requestReceived,
        isFollowing,
        isBlocked,
      },
    });
  } catch (err) {
    console.error("getRelationStatus sécurisé :", err);
    return res.status(500).json({ error: "Erreur serveur relation" });
  }
};

/* ============================================================
   🔥 DEMANDES D’AMIS REÇUES
============================================================ */
exports.getFriendRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate(
      "friendRequestsReceived",
      "name avatar"
    );

    res.json({
      success: true,
      requests: user.friendRequestsReceived || [],
    });
  } catch (err) {
    console.error("getFriendRequests:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

/* ============================================================
   🔥 LISTE DES AMIS
============================================================ */
exports.getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate(
      "friends.user",
      "name avatar"
    );

    res.json({
      success: true,
      friends: user?.friends || [],
    });
  } catch (err) {
    console.error("getFriends:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

/* ============================================================
   🔥 FOLLOW USER
============================================================ */
exports.followUser = async (req, res) => {
  try {
    const me = req.user.id;
    const other = req.params.id;

    if (me === other) {
      return res
        .status(400)
        .json({ error: "Vous ne pouvez pas vous suivre vous-même." });
    }

    const [userMe, userOther] = await Promise.all([
      User.findById(me),
      User.findById(other),
    ]);

    if (!userOther) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    if (userMe.blockedUsers.some((id) => id.toString() === other)) {
      return res.status(400).json({ error: "Utilisateur bloqué." });
    }

    if (userOther.blockedUsers.some((id) => id.toString() === me)) {
      return res
        .status(400)
        .json({ error: "Vous avez été bloqué par cet utilisateur." });
    }

    const alreadyFollowing = userMe.following.some(
      (id) => id.toString() === other
    );

    if (alreadyFollowing) {
      return res.json({ success: true, message: "Déjà en train de suivre." });
    }

    userMe.following.push(other);
    userOther.followers.push(me);

    await Promise.all([userMe.save(), userOther.save()]);

    await pushNotification(other, {
      from: me,
      type: "follow",
      text: "Vous avez un nouveau follower.",
    });

    res.json({ success: true, message: "Vous suivez cet utilisateur." });
  } catch (err) {
    console.error("followUser:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

/* ============================================================
   🔥 UNFOLLOW USER
============================================================ */
exports.unfollowUser = async (req, res) => {
  try {
    const me = req.user.id;
    const other = req.params.id;

    const [userMe, userOther] = await Promise.all([
      User.findById(me),
      User.findById(other),
    ]);

    if (!userOther) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    userMe.following = userMe.following.filter(
      (id) => id.toString() !== other
    );
    userOther.followers = userOther.followers.filter(
      (id) => id.toString() !== me
    );

    await Promise.all([userMe.save(), userOther.save()]);

    res.json({ success: true, message: "Vous ne suivez plus cet utilisateur." });
  } catch (err) {
    console.error("unfollowUser:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

/* ============================================================
   🔥 BLOCK USER
============================================================ */
exports.blockUser = async (req, res) => {
  try {
    const me = req.user.id;
    const other = req.params.id;

    if (me === other) {
      return res.status(400).json({ error: "Action impossible sur vous-même." });
    }

    const [userMe, userOther] = await Promise.all([
      User.findById(me),
      User.findById(other),
    ]);

    if (!userOther) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    if (!userMe.blockedUsers.some((id) => id.toString() === other)) {
      userMe.blockedUsers.push(other);
    }

    // Clean relations
    userMe.friends = userMe.friends.filter((f) => f.user.toString() !== other);
    userOther.friends = userOther.friends.filter((f) => f.user.toString() !== me);

    userMe.following = userMe.following.filter((id) => id.toString() !== other);
    userOther.followers = userOther.followers.filter((id) => id.toString() !== me);

    userOther.following = userOther.following.filter((id) => id.toString() !== me);
    userMe.followers = userMe.followers
      ? userMe.followers.filter((id) => id.toString() !== other)
      : userMe.followers;

    userMe.friendRequestsSent = userMe.friendRequestsSent.filter(
      (id) => id.toString() !== other
    );
    userMe.friendRequestsReceived = userMe.friendRequestsReceived.filter(
      (id) => id.toString() !== other
    );
    userOther.friendRequestsSent = userOther.friendRequestsSent.filter(
      (id) => id.toString() !== me
    );
    userOther.friendRequestsReceived = userOther.friendRequestsReceived.filter(
      (id) => id.toString() !== me
    );

    await Promise.all([userMe.save(), userOther.save()]);

    res.json({ success: true, message: "Utilisateur bloqué." });
  } catch (err) {
    console.error("blockUser:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

/* ============================================================
   🔥 UNBLOCK USER
============================================================ */
exports.unblockUser = async (req, res) => {
  try {
    const me = req.user.id;
    const other = req.params.id;

    const userMe = await User.findById(me);

    userMe.blockedUsers = userMe.blockedUsers.filter(
      (id) => id.toString() !== other
    );

    await userMe.save();

    res.json({ success: true, message: "Utilisateur débloqué." });
  } catch (err) {
    console.error("unblockUser:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

/* ============================================================
   🔥 SOCIAL PROFILE
============================================================ */
exports.getSocialProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    const me = req.user.id;

    const user = await User.findById(userId).select(
      "name avatar bio role isCreator creatorCategory followers following friends blockedUsers"
    );

    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    const isBlocked = user.blockedUsers.some((id) => id.toString() === me);

    res.json({
      success: true,
      profile: {
        id: user._id,
        name: user.name,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role,
        isCreator: user.isCreator,
        creatorCategory: user.creatorCategory,
        counts: {
          followers: user.followers.length,
          following: user.following.length,
          friends: user.friends.length,
        },
        isBlocked,
      },
    });
  } catch (err) {
    console.error("getSocialProfile:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};