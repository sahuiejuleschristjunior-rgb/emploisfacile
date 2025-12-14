const mongoose = require("mongoose");
const Message = require("../models/Message");
const User = require("../models/User");
const { getIO } = require("../socket");
const Notification = require("../models/Notification");

/* ============================================================
🔥 UTILITAIRE : PUSH NOTIF + SOCKET
============================================================ */
async function pushNotification(userId, data) {
  const notif = await Notification.create({
    user: userId,
    from: data.from,
    type: data.type,
    text: data.text,
    post: null,
    read: false,
  });

  getIO().to(String(userId)).emit("notification:new", notif);
  return notif;
}

/* ============================================================
POST /api/messages
➤ Envoyer un message
============================================================ */
exports.sendMessage = async (req, res) => {
  try {
    const sender = req.user.id;
    const { receiver, content, applicationId, jobId, type } = req.body;

    if (!receiver || !content) {
      return res
        .status(400)
        .json({ message: "Receiver et content sont requis." });
    }

    const receiverUser = await User.findById(receiver);
    if (!receiverUser) {
      return res
        .status(404)
        .json({ message: "Destinataire introuvable." });
    }

    const message = await Message.create({
      sender,
      receiver,
      content,
      application: applicationId || null,
      job: jobId || null,
      type: type || "text",
      isRead: false,
    });

    /* 🔥 SOCKET.IO — MESSAGE TEMPS RÉEL */
    getIO().to(receiver.toString()).emit("new_message", {
      from: sender,
      to: receiver,
      message,
    });

    getIO().to(sender.toString()).emit("new_message", {
      from: sender,
      to: receiver,
      message,
    });

    /* 🔥 NOTIFICATION */
    await pushNotification(receiver, {
      from: sender,
      type: "message",
      text: "Nouveau message reçu",
    });

    return res.status(201).json({
      success: true,
      message: "Message envoyé.",
      data: message,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors de l'envoi du message.",
      details: error.message,
    });
  }
};

/* ============================================================
GET /api/messages/conversation/:userId
➤ Récupérer la conversation
============================================================ */
exports.getConversation = async (req, res) => {
  try {
    const myId = req.user.id;
    const otherId = req.params.userId;

    const messages = await Message.find({
      $or: [
        { sender: myId, receiver: otherId },
        { sender: otherId, receiver: myId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("sender", "name avatar role")
      .populate("receiver", "name avatar role");

    return res.status(200).json(messages);
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors du chargement de la conversation.",
      details: error.message,
    });
  }
};

/* ============================================================
GET /api/messages/inbox
➤ Inbox
============================================================ */
exports.getInbox = async (req, res) => {
  try {
    const myId = new mongoose.Types.ObjectId(req.user.id);

    const messages = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: myId }, { receiver: myId }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$sender", myId] },
              "$receiver",
              "$sender",
            ],
          },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiver", myId] },
                    { $eq: ["$isRead", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const inbox = await Promise.all(
      messages.map(async (item) => {
        const user = await User.findById(item._id).select(
          "name avatar role"
        );
        return {
          user,
          lastMessage: item.lastMessage,
          unreadCount: item.unreadCount,
        };
      })
    );

    return res.status(200).json(inbox);
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors du chargement de la boîte de réception.",
      details: error.message,
    });
  }
};

/* ============================================================
PATCH /api/messages/:id/read
➤ Marquer un message comme lu
============================================================ */
exports.markAsRead = async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message introuvable." });
    }

    if (message.receiver.toString() !== userId) {
      return res.status(403).json({ message: "Non autorisé." });
    }

    message.isRead = true;
    message.readAt = new Date();
    await message.save();

    getIO().to(message.sender.toString()).emit("message_read", {
      messageId: message._id,
      readAt: message.readAt,
    });

    return res.status(200).json({
      success: true,
      message: "Message marqué comme lu.",
      data: message,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors de la mise à jour du statut.",
      details: error.message,
    });
  }
};

/* ============================================================
PATCH /api/messages/read-all/:userId
➤ Marquer toute la conversation comme lue
============================================================ */
exports.markAllAsReadForConversation = async (req, res) => {
  try {
    const myId = req.user.id;
    const otherUserId = req.params.userId;

    const updated = await Message.updateMany(
      {
        sender: otherUserId,
        receiver: myId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Tous les messages ont été marqués comme lus.",
      updatedCount: updated.modifiedCount,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors de la mise à jour du statut en lecture.",
      details: error.message,
    });
  }
};

/* ============================================================
🆕 GET /api/messages/friends
➤ Liste des amis pour démarrer une conversation
============================================================ */
exports.getMessageFriends = async (req, res) => {
  try {
    const me = req.user.id;

    const user = await User.findById(me).populate(
      "friends.user",
      "name avatar role"
    );

    const friends = (user.friends || [])
      .filter((f) => f.user)
      .map((f) => ({
        _id: f.user._id,
        name: f.user.name,
        avatar: f.user.avatar,
        role: f.user.role,
        category: f.category,
      }));

    return res.status(200).json({
      success: true,
      friends,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors du chargement des amis pour messages",
      details: error.message,
    });
  }
};