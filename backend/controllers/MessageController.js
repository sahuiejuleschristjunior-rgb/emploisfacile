const mongoose = require("mongoose");
const Message = require("../models/Message");
const User = require("../models/User");
const { getIO } = require("../socket");
const Notification = require("../models/Notification");
const path = require("path");
const fs = require("fs");

const typingState = new Map();

/* ============================================================
🔥 UTILITAIRE : PUSH NOTIF + SOCKET
============================================================ */
async function pushNotification(userId, data) {
  const filter = {
    user: userId,
    from: data.from,
    type: data.type,
    post: data.post || null,
    story: data.story || null,
    read: false,
  };

  const existing = await Notification.findOne(filter).sort({ createdAt: -1 });
  if (existing) return existing;

  const notif = await Notification.create({
    user: userId,
    from: data.from,
    type: data.type,
    text: data.text,
    post: null,
    story: null,
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

    const message = await Message.create({
      sender,
      receiver,
      content: content || "message audio",
      application: applicationId || null,
      job: jobId || null,
      type: "audio",
      audioUrl: "/uploads/audio/" + req.file.filename,
      clientTempId: clientTempId || null,
      isRead: false,
    });

    getIO().to(receiver.toString()).emit("audio_message", {
      from: sender,
      to: receiver,
      message,
    });

    getIO().to(sender.toString()).emit("audio_message", {
      from: sender,
      to: receiver,
      message,
    });

    await pushNotification(receiver, {
      from: sender,
      type: "message",
      text: "Nouveau message audio",
    });

    return res.status(201).json({
      success: true,
      message: "Message audio envoyé.",
      data: message,
    });
  } catch (error) {
    console.error("sendAudioMessage ERROR:", error);
    return res.status(500).json({
      error: "Erreur lors de l'envoi du message audio.",
      details: error.message,
    });
  }
};

/* ============================================================
GET /api/messages/conversation/:userId
➤ Récupérer une conversation entre deux utilisateurs
============================================================ */
exports.getConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const otherUserId = req.params.userId;

    const conversation = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("sender", "name avatar")
      .populate("receiver", "name avatar");

    return res.json(conversation);
  } catch (error) {
    console.error("getConversation ERROR:", error);
    return res.status(500).json({
      error: "Erreur lors de la récupération de la conversation.",
      details: error.message,
    });
  }
};

/* ============================================================
PATCH /api/messages/read-all/:userId
➤ Marquer toute la conversation comme lue
============================================================ */
exports.markConversationRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const otherUserId = req.params.userId;

    await Message.updateMany(
      {
        sender: otherUserId,
        receiver: userId,
        isRead: false,
      },
      { $set: { isRead: true } }
    );

    getIO().to(otherUserId.toString()).emit("message_read", {
      by: userId,
      about: otherUserId,
    });

    res.json({ success: true });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors du marquage en lu.",
      details: error.message,
    });
  }
};

/* ============================================================
PATCH /api/messages/:id/read
➤ Marquer un message comme lu
============================================================ */
exports.markMessageRead = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) return res.status(404).json({ error: "Message introuvable" });

    message.isRead = true;
    await message.save();

    getIO().to(message.sender.toString()).emit("message_read", {
      by: req.user.id,
      about: message.receiver,
    });

    res.json({ success: true });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors du marquage en lu.",
      details: error.message,
    });
  }
};

/* ============================================================
POST /api/messages/typing
➤ Indiquer que l’utilisateur tape
============================================================ */
exports.typing = async (req, res) => {
  try {
    const { receiverId, isTyping } = req.body;
    const senderId = req.user.id;

    if (!receiverId) {
      return res.status(400).json({ error: "receiverId requis" });
    }

    typingState.set(`${senderId}-${receiverId}`, isTyping === true);

    getIO().to(receiverId.toString()).emit("typing", {
      from: senderId,
      isTyping: isTyping === true,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("typing ERROR:", error);
    return res.status(500).json({ error: "Erreur typing" });
  }
};

/* ============================================================
PATCH /api/messages/:id/react
➤ Réagir à un message
============================================================ */
exports.reactToMessage = async (req, res) => {
  try {
    const messageId = req.params.id;
    const { emoji } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message introuvable" });
    }

    message.reactions = message.reactions || [];
    const existingReactionIndex = message.reactions.findIndex(
      (r) => r.user.toString() === req.user.id
    );

    if (existingReactionIndex >= 0) {
      message.reactions[existingReactionIndex].emoji = emoji;
    } else {
      message.reactions.push({ user: req.user.id, emoji });
    }

    await message.save();

    const payload = { messageId, reactions: message.reactions };

    getIO().to(message.receiver.toString()).emit("reaction_update", payload);
    getIO().to(message.sender.toString()).emit("reaction_update", payload);

    res.json({ success: true, reactions: message.reactions });
  } catch (error) {
    console.error("reactToMessage ERROR:", error);
    return res.status(500).json({ error: "Erreur réaction" });
  }
};

/* ============================================================
MIDDLEWARE : VALIDER ID
============================================================ */
exports.validateObjectId = (req, res, next) => {
  const isValid = mongoose.Types.ObjectId.isValid(req.params.id);
  if (!isValid) return res.status(400).json({ error: "ID invalide" });
  next();
};
