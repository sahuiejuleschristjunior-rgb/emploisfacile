const mongoose = require("mongoose");
const Message = require("../models/Message");
const User = require("../models/User");
const { getIO } = require("../socket");
const Notification = require("../models/Notification");
const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");
const { promisify } = require("util");

const typingState = new Map();
const execFileAsync = promisify(execFile);

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
    const { receiver, content, applicationId, jobId, type, clientTempId } =
      req.body;

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
      clientTempId: clientTempId || null,
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
POST /api/messages/audio
➤ Envoyer un message vocal
============================================================ */
function ensureAudioDir() {
  const uploadDir = path.join(__dirname, "../uploads/audio");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
}

async function enhanceAudioQuality(filePath) {
  const outputPath = `${filePath}.tmp.webm`;
  const filters =
    "loudnorm=I=-16:LRA=11:TP=-1.5,agate=threshold=-55dB:ratio=1.2:attack=5:release=100";

  const args = [
    "-i",
    filePath,
    "-af",
    filters,
    "-c:a",
    "libopus",
    "-b:a",
    "32k",
    "-ar",
    "48000",
    "-vn",
    "-f",
    "webm",
    outputPath,
  ];

  await execFileAsync("ffmpeg", args);
  fs.renameSync(outputPath, filePath);
}

exports.sendAudioMessage = async (req, res) => {
  try {
    ensureAudioDir();

    const sender = req.user.id;
    const { receiver, applicationId, jobId, content, clientTempId } = req.body;
    const file = req.file;

    if (!receiver || !file) {
      return res.status(400).json({
        message: "Receiver et audio sont requis.",
      });
    }

    const receiverUser = await User.findById(receiver);
    if (!receiverUser) {
      return res.status(404).json({ message: "Destinataire introuvable." });
    }

    await enhanceAudioQuality(file.path);

    const audioUrl = `/uploads/audio/${file.filename}`;

    const message = await Message.create({
      sender,
      receiver,
      content: content || "",
      application: applicationId || null,
      job: jobId || null,
      type: "audio",
      audioUrl,
      clientTempId: clientTempId || null,
      isRead: false,
    });

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

    getIO()
      .to(receiver.toString())
      .to(sender.toString())
      .emit("audio_message", { message });

    await pushNotification(receiver, {
      from: sender,
      type: "message",
      text: "Nouvelle note vocale",
    });

    return res.status(201).json({
      success: true,
      message: "Note vocale envoyée.",
      data: message,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors de l'envoi de l'audio.",
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

    getIO()
      .to(String(otherUserId))
      .emit("message_read", { withUserId: myId });

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
POST /api/messages/:id/react
➤ Ajouter / retirer une réaction
============================================================ */
exports.reactToMessage = async (req, res) => {
  try {
    const messageId = req.params.id;
    const { emoji } = req.body;
    const userId = req.user.id;

    if (!emoji) {
      return res.status(400).json({ message: "Emoji requis." });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message introuvable." });
    }

    if (
      message.sender.toString() !== userId &&
      message.receiver.toString() !== userId
    ) {
      return res.status(403).json({ message: "Non autorisé." });
    }

    const currentReactions = [...(message.reactions || [])];
    const existingIndex = currentReactions.findIndex(
      (r) => r.user && r.user.toString() === userId
    );

    if (existingIndex >= 0 && currentReactions[existingIndex].emoji === emoji) {
      currentReactions.splice(existingIndex, 1);
    } else if (existingIndex >= 0) {
      currentReactions[existingIndex].emoji = emoji;
      currentReactions[existingIndex].createdAt = new Date();
    } else {
      currentReactions.push({ user: userId, emoji });
    }

    message.reactions = currentReactions;
    await message.save();

    const populated = await message.populate({
      path: "reactions.user",
      select: "name avatar",
    });

    getIO()
      .to(message.sender.toString())
      .to(message.receiver.toString())
      .emit("reaction_update", { message: populated });

    return res.status(200).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors de la réaction.",
      details: error.message,
    });
  }
};

/* ============================================================
GET /api/messages/:id/reactions
➤ Récupérer les réactions d’un message
============================================================ */
exports.getMessageReactions = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id).populate({
      path: "reactions.user",
      select: "name avatar",
    });

    if (!message) {
      return res.status(404).json({ message: "Message introuvable." });
    }

    if (
      message.sender.toString() !== req.user.id &&
      message.receiver.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Non autorisé." });
    }

    return res.status(200).json({
      success: true,
      reactions: message.reactions || [],
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors du chargement des réactions.",
      details: error.message,
    });
  }
};

/* ============================================================
POST /api/messages/typing
➤ Flag typing temporaire en mémoire
============================================================ */
exports.setTypingFlag = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, isTyping } = req.body;

    if (!receiverId) {
      return res.status(400).json({ message: "receiverId requis." });
    }

    const key = `${senderId}:${receiverId}`;
    typingState.set(key, { isTyping: Boolean(isTyping), at: Date.now() });

    const now = Date.now();
    for (const [k, value] of typingState.entries()) {
      if (now - value.at > 30000) {
        typingState.delete(k);
      }
    }

    return res.status(200).json({
      success: true,
      typing: Boolean(isTyping),
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors de la mise à jour du statut de frappe.",
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