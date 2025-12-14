const Notification = require("../models/Notification");

/* ============================================================
   📌 RÉCUPÉRER LES NOTIFICATIONS DE L'UTILISATEUR
   ============================================================ */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.find({ user: userId })
      .populate("from", "name avatar")
      .populate("post", "text media")
      .populate({
        path: "story",
        select: "media user",
        options: { strictPopulate: false }, // 🔥 PROTECTION SUPPLÉMENTAIRE
      })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (err) {
    console.error("NOTIFICATION GET ERROR:", err);
    res.status(500).json({
      error: "Erreur lors de la récupération des notifications."
    });
  }
};


/* ============================================================
   📌 MARQUER TOUTES LES NOTIFICATIONS COMME LUES
   ============================================================ */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.updateMany(
      { user: userId, read: false },
      { $set: { read: true } }
    );

    res.json({ message: "Toutes les notifications ont été marquées comme lues." });
  } catch (err) {
    console.error("NOTIFICATION READ ERROR:", err);
    res.status(500).json({
      error: "Erreur lors du marquage comme lu."
    });
  }
};


/* ============================================================
   📌 COMPTER LES NOTIFICATIONS NON LUES
   ============================================================ */
exports.countUnread = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await Notification.countDocuments({
      user: userId,
      read: false
    });

    res.json({ count });
  } catch (err) {
    console.error("NOTIFICATION COUNT ERROR:", err);
    res.status(500).json({
      error: "Erreur lors du comptage des notifications non lues."
    });
  }
};
