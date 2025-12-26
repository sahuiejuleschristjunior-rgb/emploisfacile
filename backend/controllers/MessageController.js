const mongoose = require("mongoose");
const Message = require("../models/Message");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const MessageRequest = require("../models/MessageRequest");
const { getIO } = require("../socket");
const Notification = require("../models/Notification");
const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");
const { promisify } = require("util");

const typingState = new Map();
const execFileAsync = promisify(execFile);
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const REQUEST_MESSAGE_MAX = 500;
const REQUEST_COOLDOWN_MS = 15 * 60 * 1000;
const requestRateMap = new Map();

function isUserParticipant(message, userId) {
  if (!message || !userId) return false;
  return (
    message.sender.toString() === userId || message.receiver.toString() === userId
  );
}

function populateMessage(message) {
  if (!message) return message;
  return message.populate([
    { path: "sender", select: "name avatar role" },
    { path: "receiver", select: "name avatar role" },
    { path: "replyTo", select: "content type sender receiver" },
  ]);
}

function getSenderId(req) {
  return req?.user?._id || req?.user?.id || null;
}

function areFriends(user, otherUserId) {
  return Array.isArray(user?.friends)
    ? user.friends.some((f) => String(f.user) === String(otherUserId))
    : false;
}

function isBlocked(user, otherUserId) {
  return Array.isArray(user?.blockedUsers)
    ? user.blockedUsers.some((u) => String(u) === String(otherUserId))
    : false;
}

function containsLink(text) {
  if (!text) return false;
  return /(https?:\/\/|www\.)/i.test(text);
}

function enforceRequestRateLimit(userId) {
  if (!userId) return false;
  const now = Date.now();
  const last = requestRateMap.get(String(userId)) || 0;
  if (now - last < REQUEST_COOLDOWN_MS) {
    return true;
  }
  requestRateMap.set(String(userId), now);
  return false;
}

async function findOrCreateConversation(senderId, receiverId) {
  const senderObjectId = new mongoose.Types.ObjectId(senderId);
  const receiverObjectId = new mongoose.Types.ObjectId(receiverId);

  let conversation = await Conversation.findOne({
    participants: { $all: [senderObjectId, receiverObjectId] },
    $expr: { $eq: [{ $size: "$participants" }, 2] },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [senderObjectId, receiverObjectId],
    });
  }

  return conversation;
}

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
    const sender = getSenderId(req);
    if (!sender) {
      return res.status(401).json({ message: "Authentification requise." });
    }

    const {
      receiver,
      content,
      applicationId,
      jobId,
      type,
      clientTempId,
      replyTo,
    } = req.body;

    const receiverId = receiver;

    if (!receiverId || !content) {
      return res
        .status(400)
        .json({ message: "Receiver et content sont requis." });
    }

    if (receiverId === sender) {
      return res
        .status(400)
        .json({ message: "Impossible d'envoyer un message à vous-même." });
    }

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res
        .status(404)
        .json({ message: "Destinataire introuvable." });
    }

    const [receiverUser, senderUser] = await Promise.all([
      User.findById(receiverId),
      User.findById(sender),
    ]);

    if (!receiverUser || !senderUser) {
      return res
        .status(404)
        .json({ message: "Destinataire introuvable." });
    }

    if (isBlocked(receiverUser, sender) || isBlocked(senderUser, receiverId)) {
      return res.status(403).json({ message: "Interaction non autorisée." });
    }

    const isFriend =
      areFriends(senderUser, receiverId) && areFriends(receiverUser, sender);

    // =====================
    // MESSAGE REQUEST FLOW
    // =====================
    if (!isFriend) {
      if (enforceRequestRateLimit(sender)) {
        return res.status(429).json({
          message: "Trop de demandes. Réessayez dans quelques minutes.",
        });
      }

      if (type && type !== "text") {
        return res
          .status(400)
          .json({ message: "Seuls les messages textes sont autorisés." });
      }

      const trimmed = (content || "").trim();
      if (!trimmed) {
        return res
          .status(400)
          .json({ message: "Le message ne peut pas être vide." });
      }

      if (trimmed.length > REQUEST_MESSAGE_MAX) {
        return res.status(400).json({
          message: `Le message doit contenir au maximum ${REQUEST_MESSAGE_MAX} caractères.`,
        });
      }

      if (containsLink(trimmed)) {
        return res.status(400).json({
          message: "Les liens sont désactivés dans les demandes de message.",
        });
      }

      const existingByPair = await MessageRequest.findOne({
        from: sender,
        to: receiverId,
      });

      if (existingByPair) {
        return res.status(403).json({ message: "Demande déjà envoyée." });
      }

      const pendingOutgoing = await MessageRequest.findOne({
        from: sender,
        status: "pending",
      });

      if (pendingOutgoing) {
        return res.status(403).json({
          message: "Vous avez déjà une demande en attente.",
        });
      }

      const request = await MessageRequest.create({
        from: sender,
        to: receiverId,
        firstMessage: trimmed,
      });

      getIO().to(receiverId.toString()).emit("message_request:new", request);
      await pushNotification(receiverId, {
        from: sender,
        type: "message_request",
        text: "Nouvelle demande de message",
      });

      return res.status(201).json({
        success: true,
        type: "request",
        message: "Message envoyé comme demande.",
        data: request,
      });
    }

    // =====================
    // DIRECT FRIEND MESSAGE
    // =====================
    let replyPreview = null;
    let replyMessageId = null;
    if (replyTo) {
      const repliedMessage = await Message.findById(replyTo);
      if (repliedMessage) {
        replyMessageId = repliedMessage._id;
        replyPreview = {
          messageId: replyMessageId,
          content: repliedMessage.content || "",
          type: repliedMessage.type || "text",
        };
      }
    }

    const conversation = await findOrCreateConversation(sender, receiverId);

    const message = await Message.create({
      sender,
      receiver: receiverId,
      conversation: conversation._id,
      content,
      application: applicationId || null,
      job: jobId || null,
      type: type || "text",
      clientTempId: clientTempId || null,
      replyTo: replyMessageId,
      replyPreview,
      isRead: false,
    });

    conversation.lastMessage = message._id;
    await conversation.save();

    /* 🔥 SOCKET.IO — MESSAGE TEMPS RÉEL */
    getIO().to(receiverId.toString()).emit("new_message", {
      from: sender,
      to: receiverId,
      message,
    });

    getIO().to(sender.toString()).emit("new_message", {
      from: sender,
      to: receiverId,
      message,
    });

    /* 🔥 NOTIFICATION */
    await pushNotification(receiverId, {
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
GET /api/messages/requests
➤ Liste des demandes reçues
============================================================ */
exports.getMessageRequests = async (req, res) => {
  try {
    const userId = getSenderId(req);
    const requests = await MessageRequest.find({
      to: userId,
      status: "pending",
    })
      .populate("from", "name avatar role")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: requests });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors du chargement des demandes.",
      details: error.message,
    });
  }
};

async function createFriendshipIfNeeded(userA, userB) {
  const alreadyFriends =
    areFriends(userA, userB._id) && areFriends(userB, userA._id);
  if (alreadyFriends) return;

  userA.friends = userA.friends || [];
  userB.friends = userB.friends || [];

  if (!areFriends(userA, userB._id)) {
    userA.friends.push({ user: userB._id, category: "public" });
  }

  if (!areFriends(userB, userA._id)) {
    userB.friends.push({ user: userA._id, category: "public" });
  }

  await Promise.all([userA.save(), userB.save()]);
}

/* ============================================================
POST /api/messages/requests/:id/accept
➤ Accepter une demande
============================================================ */
exports.acceptMessageRequest = async (req, res) => {
  try {
    const userId = getSenderId(req);
    const { id } = req.params;

    const request = await MessageRequest.findById(id);
    if (!request || String(request.to) !== String(userId)) {
      return res.status(404).json({ message: "Demande introuvable." });
    }

    if (request.status !== "pending") {
      await MessageRequest.findByIdAndDelete(id);
      return res
        .status(400)
        .json({ message: "Cette demande a déjà été traitée." });
    }

    const [receiver, sender] = await Promise.all([
      User.findById(userId),
      User.findById(request.from),
    ]);

    if (!receiver || !sender) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    if (isBlocked(receiver, sender._id)) {
      await MessageRequest.findByIdAndDelete(id);
      return res.status(403).json({ message: "Interaction bloquée." });
    }

    await createFriendshipIfNeeded(receiver, sender);

    const conversation = await findOrCreateConversation(
      sender._id,
      receiver._id
    );

    const message = await Message.create({
      sender: sender._id,
      receiver: receiver._id,
      conversation: conversation._id,
      content: request.firstMessage,
      type: "text",
      isRead: false,
    });

    conversation.lastMessage = message._id;
    await conversation.save();

    await MessageRequest.findByIdAndDelete(id);

    getIO().to(sender._id.toString()).emit("new_message", {
      from: sender._id,
      to: receiver._id,
      message,
    });

    getIO().to(receiver._id.toString()).emit("new_message", {
      from: sender._id,
      to: receiver._id,
      message,
    });

    await pushNotification(sender._id, {
      from: receiver._id,
      type: "message",
      text: "Votre demande de message a été acceptée.",
    });

    return res.status(200).json({ success: true, data: message });
  } catch (error) {
    return res.status(500).json({
      message: "Impossible d'accepter la demande.",
      details: error.message,
    });
  }
};

/* ============================================================
POST /api/messages/requests/:id/decline
➤ Refuser une demande
============================================================ */
exports.declineMessageRequest = async (req, res) => {
  try {
    const userId = getSenderId(req);
    const { id } = req.params;

    const request = await MessageRequest.findById(id);
    if (!request || String(request.to) !== String(userId)) {
      return res.status(404).json({ message: "Demande introuvable." });
    }

    request.status = "declined";
    await request.save();
    await MessageRequest.findByIdAndDelete(id);

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors du refus de la demande.",
      details: error.message,
    });
  }
};

/* ============================================================
POST /api/messages/requests/:id/block
➤ Bloquer un utilisateur suite à une demande
============================================================ */
exports.blockFromMessageRequest = async (req, res) => {
  try {
    const userId = getSenderId(req);
    const { id } = req.params;

    const request = await MessageRequest.findById(id);
    if (!request || String(request.to) !== String(userId)) {
      return res.status(404).json({ message: "Demande introuvable." });
    }

    const receiver = await User.findById(userId);
    if (!receiver) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    receiver.blockedUsers = receiver.blockedUsers || [];
    if (!isBlocked(receiver, request.from)) {
      receiver.blockedUsers.push(request.from);
      await receiver.save();
    }

    await MessageRequest.findByIdAndDelete(id);

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors du blocage de l'utilisateur.",
      details: error.message,
    });
  }
};

/* ============================================================
PATCH /api/messages/:id
➤ Modifier un message texte (limité à 12h)
============================================================ */
exports.updateMessage = async (req, res) => {
  try {
    const messageId = req.params.id;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Contenu requis." });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message introuvable." });
    }

    if (!isUserParticipant(message, userId)) {
      return res.status(403).json({ message: "Non autorisé." });
    }

    if (message.type !== "text") {
      return res.status(400).json({ message: "Seuls les messages textes sont modifiables." });
    }

    const createdAt = new Date(message.createdAt).getTime();
    if (Date.now() - createdAt > TWELVE_HOURS_MS) {
      return res.status(400).json({
        message: "Le message ne peut plus être modifié (délai de 12h dépassé).",
      });
    }

    message.content = content.trim();
    message.editedAt = new Date();
    await message.save();

    const populated = await populateMessage(message);

    getIO()
      .to(message.sender.toString())
      .to(message.receiver.toString())
      .emit("message_updated", { message: populated });

    return res.status(200).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors de la modification du message.",
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

    const sender = getSenderId(req);
    if (!sender) {
      return res.status(401).json({ message: "Authentification requise." });
    }

    const { receiver, applicationId, jobId, content, clientTempId, replyTo } =
      req.body;
    const receiverId = receiver;
    const file = req.file;

    if (receiverId === sender) {
      return res
        .status(400)
        .json({ message: "Impossible d'envoyer un message à vous-même." });
    }

    if (!receiverId || !file) {
      return res.status(400).json({
        message: "Receiver et audio sont requis.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res
        .status(404)
        .json({ message: "Destinataire introuvable." });
    }

    const receiverUser = await User.findById(receiverId);
    if (!receiverUser) {
      return res.status(404).json({ message: "Destinataire introuvable." });
    }

    await enhanceAudioQuality(file.path);

    const audioUrl = `/uploads/audio/${file.filename}`;

    let replyPreview = null;
    let replyMessageId = null;
    if (replyTo) {
      const repliedMessage = await Message.findById(replyTo);
      if (repliedMessage) {
        replyMessageId = repliedMessage._id;
        replyPreview = {
          messageId: replyMessageId,
          content: repliedMessage.content || "",
          type: repliedMessage.type || "text",
        };
      }
    }

    const conversation = await findOrCreateConversation(sender, receiverId);

    const message = await Message.create({
      sender,
      receiver: receiverId,
      conversation: conversation._id,
      content: content || "",
      application: applicationId || null,
      job: jobId || null,
      type: "audio",
      audioUrl,
      clientTempId: clientTempId || null,
      replyTo: replyMessageId,
      replyPreview,
      isRead: false,
    });

    conversation.lastMessage = message._id;
    await conversation.save();

    getIO().to(receiverId.toString()).emit("new_message", {
      from: sender,
      to: receiverId,
      message,
    });

    getIO().to(sender.toString()).emit("new_message", {
      from: sender,
      to: receiverId,
      message,
    });

    getIO()
      .to(receiverId.toString())
      .to(sender.toString())
      .emit("audio_message", { message });

    await pushNotification(receiverId, {
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

    const myObjectId = new mongoose.Types.ObjectId(myId);

    const messages = await Message.find({
      $and: [
        {
          $or: [
            { sender: myId, receiver: otherId },
            { sender: otherId, receiver: myId },
          ],
        },
        { deletedForAll: { $ne: true } },
        { deletedFor: { $ne: myObjectId } },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("sender", "name avatar role")
      .populate("receiver", "name avatar role")
      .populate("replyTo", "content type sender receiver");

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
          deletedForAll: { $ne: true },
          deletedFor: { $ne: myId },
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
PATCH /api/messages/:id/pin
➤ Épingler / désépingler un message
============================================================ */
exports.togglePin = async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.id;
    const desiredState =
      typeof req.body?.pinned === "boolean" ? req.body.pinned : null;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message introuvable." });
    }

    if (!isUserParticipant(message, userId)) {
      return res.status(403).json({ message: "Non autorisé." });
    }

    const pinnedList = message.pinnedBy || [];
    message.pinnedBy = pinnedList;
    const alreadyPinned = pinnedList.some((id) => id.toString() === userId);
    const shouldPin = desiredState === null ? !alreadyPinned : desiredState;

    if (shouldPin && !alreadyPinned) {
      pinnedList.push(userId);
      message.lastPinnedAt = new Date();
    }

    if (!shouldPin && alreadyPinned) {
      message.pinnedBy = pinnedList.filter((id) => id.toString() !== userId);
      if (!message.pinnedBy.length) {
        message.lastPinnedAt = null;
      }
    }

    await message.save();
    const populated = await populateMessage(message);

    getIO()
      .to(message.sender.toString())
      .to(message.receiver.toString())
      .emit("message_pinned", { message: populated });

    return res.status(200).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors de la mise à jour de l'épingle.",
      details: error.message,
    });
  }
};

/* ============================================================
DELETE /api/messages/:id
➤ Supprimer un message
============================================================ */
exports.deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.id;
    const scope = ((req.query.scope || req.body?.scope || "me").toString() || "me")
      .toLowerCase()
      .trim();

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message introuvable." });
    }

    const isSender = message.sender.toString() === userId;
    const isReceiver = message.receiver.toString() === userId;

    if (!isSender && !isReceiver) {
      return res.status(403).json({ message: "Non autorisé." });
    }

    if (scope === "all") {
      if (!isSender) {
        return res
          .status(403)
          .json({ message: "Seul l'expéditeur peut supprimer pour tous." });
      }

      if (!message.deletedForAll) {
        message.deletedForAll = true;
        message.deletedAt = new Date();
        message.deletedFor = [message.sender, message.receiver];

        const mediaPaths = [];
        if (message.audioUrl) {
          mediaPaths.push(path.join(__dirname, `..${message.audioUrl}`));
        }
        if (message.fileUrl) {
          mediaPaths.push(path.join(__dirname, `..${message.fileUrl}`));
        }

        await message.save();

        mediaPaths.forEach((p) => {
          try {
            if (fs.existsSync(p)) {
              fs.unlinkSync(p);
            }
          } catch (err) {
            console.error("Erreur suppression fichier message", err);
          }
        });
      }

      getIO()
        .to(message.sender.toString())
        .to(message.receiver.toString())
        .emit("message_deleted", { messageId, scope: "all" });

      return res.status(200).json({
        success: true,
        message: "Message supprimé pour tout le monde.",
      });
    }

    const alreadyDeleted = (message.deletedFor || []).some(
      (id) => id && id.toString() === userId
    );

    if (!alreadyDeleted) {
      message.deletedFor = [...(message.deletedFor || []), userId];
      await message.save();
    }

    getIO()
      .to(userId.toString())
      .emit("message_deleted", { messageId, scope: "me" });

    return res
      .status(200)
      .json({ success: true, message: "Message supprimé pour vous." });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors de la suppression du message.",
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