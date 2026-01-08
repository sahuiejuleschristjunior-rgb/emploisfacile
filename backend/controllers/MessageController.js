const mongoose = require("mongoose");
const Message = require("../models/Message");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Job = require("../models/Job");
const MessageRequest = require("../models/MessageRequest");
const { getIO } = require("../socket");
const Notification = require("../models/Notification");
const path = require("path");
const fs = require("fs");

const typingState = new Map();
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const REQUEST_MESSAGE_MAX = 500;
const REQUEST_COOLDOWN_MS = 15 * 60 * 1000;
const requestRateMap = new Map();
const MESSAGE_UPLOAD_DIR = path.join(__dirname, "../uploads/messages");
const MESSAGE_AUDIO_DIR = path.join(__dirname, "../uploads/messages/audio");
const MAX_MESSAGE_FILE_SIZE = 10 * 1024 * 1024;
const MAX_MESSAGE_AUDIO_SIZE = 20 * 1024 * 1024;
const ALLOWED_MESSAGE_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);
const ALLOWED_AUDIO_MIME_TYPES = new Set(["audio/webm"]);

function ensureMessageUploadDir() {
  if (!fs.existsSync(MESSAGE_UPLOAD_DIR)) {
    fs.mkdirSync(MESSAGE_UPLOAD_DIR, { recursive: true });
  }
  return MESSAGE_UPLOAD_DIR;
}

function ensureMessageAudioUploadDir() {
  if (!fs.existsSync(MESSAGE_AUDIO_DIR)) {
    fs.mkdirSync(MESSAGE_AUDIO_DIR, { recursive: true });
  }
  return MESSAGE_AUDIO_DIR;
}

function getSafeFileName(fileName) {
  return path.basename(fileName || "");
}

function buildMessageFileUrl(fileName) {
  return `/api/messages/files/${fileName}`;
}

function buildMessageAudioUrl(fileName) {
  return `/uploads/messages/audio/${fileName}`;
}

function isAllowedMessageMime(mime) {
  return ALLOWED_MESSAGE_MIME_TYPES.has(mime);
}

function getFileUrlPath(fileUrl) {
  if (!fileUrl) return "";
  if (fileUrl.startsWith("http")) {
    try {
      return new URL(fileUrl).pathname;
    } catch (err) {
      return "";
    }
  }
  return fileUrl;
}

function getAudioUrlPath(audioUrl) {
  if (!audioUrl) return "";
  if (audioUrl.startsWith("http")) {
    try {
      return new URL(audioUrl).pathname;
    } catch (err) {
      return "";
    }
  }
  return audioUrl;
}

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

async function findExistingConversation(userAId, userBId) {
  if (!userAId || !userBId) return null;
  const a = new mongoose.Types.ObjectId(userAId);
  const b = new mongoose.Types.ObjectId(userBId);
  return Conversation.findOne({
    participants: { $all: [a, b] },
    $expr: { $eq: [{ $size: "$participants" }, 2] },
  });
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

async function resolveJobConversationContext({ senderUser, receiverUser, jobId }) {
  if (!jobId) {
    return {
      errorStatus: 400,
      message: "jobId est requis pour cette conversation.",
    };
  }

  const job = await Job.findById(jobId).select("recruiter title");
  if (!job) {
    return {
      errorStatus: 404,
      message: "Offre introuvable.",
    };
  }

  const jobRecruiterId = job.recruiter?.toString();
  if (!jobRecruiterId) {
    return {
      errorStatus: 400,
      message: "L'offre n'est pas associée à un recruteur.",
    };
  }

  let recruiterId = null;
  let candidateId = null;

  if (senderUser?.role === "recruiter") {
    recruiterId = senderUser._id;
    candidateId = receiverUser?._id;
  } else if (receiverUser?.role === "recruiter") {
    recruiterId = receiverUser?._id;
    candidateId = senderUser?._id;
  } else {
    return {
      errorStatus: 403,
      message: "Une conversation liée à une offre nécessite un recruteur.",
    };
  }

  if (!candidateId) {
    return {
      errorStatus: 400,
      message: "Candidat introuvable.",
    };
  }

  if (String(recruiterId) !== String(jobRecruiterId)) {
    return {
      errorStatus: 403,
      message: "Ce recruteur n'est pas associé à l'offre.",
    };
  }

  return { job, recruiterId, candidateId };
}

async function findExistingJobConversation({ jobId, recruiterId, candidateId }) {
  if (!jobId || !recruiterId || !candidateId) return null;
  return Conversation.findOne({
    job: jobId,
    recruiter: recruiterId,
    candidate: candidateId,
  });
}

/* ============================================================
🔥 UTILITAIRE : PUSH NOTIF + SOCKET
============================================================ */
async function pushNotification(userId, data) {
  const notif = await Notification.create({
    userId,
    from: data.from || null,
    type: data.type,
    actionType: data.actionType,
    relatedId: data.relatedId,
    text: data.text || "",
  });

  const populated = await notif.populate("from", "name avatar role");
  getIO().to(String(userId)).emit("notification:new", populated);
  return populated;
}

function resolveNotificationType({ job, application } = {}) {
  return job || application ? "job" : "public";
}

async function buildMessageRequest({ senderUser, receiverUser, content }) {
  const senderId = senderUser?._id;
  const receiverId = receiverUser?._id;

  if (!senderId || !receiverId) {
    return {
      errorStatus: 400,
      message: "Expéditeur ou destinataire manquant.",
    };
  }

  if (enforceRequestRateLimit(senderId)) {
    return {
      errorStatus: 429,
      message: "Trop de demandes. Réessayez dans quelques minutes.",
    };
  }

  const trimmed = (content || "").trim();
  if (!trimmed) {
    return {
      errorStatus: 400,
      message: "Le message ne peut pas être vide.",
    };
  }

  if (trimmed.length > REQUEST_MESSAGE_MAX) {
    return {
      errorStatus: 400,
      message: `Le message doit contenir au maximum ${REQUEST_MESSAGE_MAX} caractères.`,
    };
  }

  if (containsLink(trimmed)) {
    return {
      errorStatus: 400,
      message: "Les liens sont désactivés dans les demandes de message.",
    };
  }

  const pendingExisting = await MessageRequest.findOne({
    status: "pending",
    $or: [
      { fromUser: senderId, toUser: receiverId },
      { fromUser: receiverId, toUser: senderId },
    ],
  });

  if (pendingExisting) {
    return {
      errorStatus: 403,
      message: "Une demande de message est déjà en attente.",
    };
  }

  const conversationExists = await findExistingConversation(senderId, receiverId);
  if (conversationExists) {
    return {
      errorStatus: 409,
      message: "Une conversation existe déjà entre ces utilisateurs.",
    };
  }

  const request = await MessageRequest.create({
    fromUser: senderId,
    toUser: receiverId,
    message: trimmed,
  });

  const populated = await request.populate("fromUser", "name avatar role");
  getIO().to(receiverId.toString()).emit("message_request_received", populated);

    return { request: populated };
  }

/* ============================================================
POST /api/messages/upload
➤ Upload d'un fichier pour message
============================================================ */
exports.uploadMessageFile = async (req, res) => {
  try {
    ensureMessageUploadDir();
    const sender = getSenderId(req);
    if (!sender) {
      return res.status(401).json({ message: "Authentification requise." });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "Fichier manquant." });
    }

    if (!isAllowedMessageMime(file.mimetype)) {
      return res.status(400).json({ message: "Type de fichier non autorisé." });
    }

    if (file.size > MAX_MESSAGE_FILE_SIZE) {
      return res.status(400).json({ message: "Fichier trop volumineux." });
    }

    const fileUrl = buildMessageFileUrl(file.filename);

    return res.status(201).json({
      success: true,
      file: {
        name: file.originalname,
        size: file.size,
        mime: file.mimetype,
        url: fileUrl,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors de l'upload du fichier.",
      details: error.message,
    });
  }
};

/* ============================================================
GET /api/messages/files/:fileName
➤ Télécharger un fichier de message
============================================================ */
exports.downloadMessageFile = async (req, res) => {
  try {
    const userId = getSenderId(req);
    if (!userId) {
      return res.status(401).json({ message: "Authentification requise." });
    }

    const fileName = getSafeFileName(req.params.fileName);
    if (!fileName) {
      return res.status(400).json({ message: "Nom de fichier invalide." });
    }

    const fileUrl = buildMessageFileUrl(fileName);
    const message = await Message.findOne({
      $or: [{ "file.url": fileUrl }, { fileUrl }],
    });

    if (!message) {
      return res.status(404).json({ message: "Fichier introuvable." });
    }

    if (!isUserParticipant(message, userId)) {
      return res.status(403).json({ message: "Accès interdit." });
    }

    const filePath = path.join(ensureMessageUploadDir(), fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Fichier introuvable." });
    }

    const downloadName = message.file?.name || fileName;
    return res.download(filePath, downloadName);
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors du téléchargement du fichier.",
      details: error.message,
    });
  }
};

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
      text,
      file,
      audio,
      applicationId,
      jobId,
      type,
      clientTempId,
      replyTo,
      conversationId,
    } = req.body;

    const receiverId = receiver;

    if (!receiverId) {
      return res
        .status(400)
        .json({ message: "Receiver est requis." });
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

    const messageType = type || (file ? "file" : "text");
    const messageText = (content ?? text ?? "").trim();

    const jobContext = jobId
      ? await resolveJobConversationContext({
          senderUser,
          receiverUser,
          jobId,
        })
      : null;

    if (jobContext?.errorStatus) {
      return res.status(jobContext.errorStatus).json({
        message: jobContext.message,
      });
    }

    let filePayload = null;
    if (messageType === "file") {
      const fileUrl = file?.url || "";
      const mime = file?.mime || "";
      const urlPath = getFileUrlPath(fileUrl);
      const fileName = getSafeFileName(urlPath.split("/").pop());

      if (!file?.name || !fileUrl || !fileName) {
        return res.status(400).json({ message: "Fichier invalide." });
      }

      if (!isAllowedMessageMime(mime)) {
        return res.status(400).json({ message: "Type de fichier non autorisé." });
      }

      const normalizedUrl = urlPath;
      const expectedUrl = buildMessageFileUrl(fileName);
      if (normalizedUrl !== expectedUrl) {
        return res.status(400).json({ message: "URL de fichier invalide." });
      }

      try {
        const filePath = path.join(ensureMessageUploadDir(), fileName);
        const stats = await fs.promises.stat(filePath);
        if (stats.size > MAX_MESSAGE_FILE_SIZE) {
          return res.status(400).json({ message: "Fichier trop volumineux." });
        }

        filePayload = {
          name: file.name,
          size: stats.size,
          mime,
          url: expectedUrl,
        };
      } catch (err) {
        return res.status(404).json({ message: "Fichier introuvable." });
      }
    }

    let audioPayload = null;
    if (messageType === "audio") {
      const audioUrl = audio?.url || "";
      const duration = Number(audio?.duration);
      const mime = audio?.mime || "audio/webm";
      const audioUrlPath = getAudioUrlPath(audioUrl);
      const audioFileName = getSafeFileName(audioUrlPath.split("/").pop());

      if (!audioUrl || !audioFileName) {
        return res.status(400).json({ message: "Audio invalide." });
      }

      if (!ALLOWED_AUDIO_MIME_TYPES.has(mime)) {
        return res.status(400).json({ message: "Type audio non autorisé." });
      }

      const expectedUrl = buildMessageAudioUrl(audioFileName);
      if (audioUrlPath !== expectedUrl) {
        return res.status(400).json({ message: "URL audio invalide." });
      }

      if (!Number.isFinite(duration) || duration < 0) {
        return res.status(400).json({ message: "Durée audio invalide." });
      }

      try {
        const audioPath = path.join(ensureMessageAudioUploadDir(), audioFileName);
        const stats = await fs.promises.stat(audioPath);
        if (stats.size > MAX_MESSAGE_AUDIO_SIZE) {
          return res.status(400).json({ message: "Audio trop volumineux." });
        }
      } catch (err) {
        return res.status(404).json({ message: "Audio introuvable." });
      }

      audioPayload = {
        url: expectedUrl,
        duration,
        mime: "audio/webm",
      };
    }

    let existingConversation = null;
    if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
      existingConversation = await Conversation.findById(conversationId);
      if (existingConversation) {
        const isConversationParticipant =
          String(existingConversation.recruiter || "") === String(sender) ||
          String(existingConversation.candidate || "") === String(sender) ||
          (Array.isArray(existingConversation.participants) &&
            existingConversation.participants.some(
              (participant) => String(participant) === String(sender)
            ));

        if (!isConversationParticipant) {
          return res.status(403).json({ message: "Accès interdit à la conversation." });
        }
      }
    }

    if (!existingConversation) {
      existingConversation = jobContext
        ? await findExistingJobConversation({
            jobId,
            recruiterId: jobContext.recruiterId,
            candidateId: jobContext.candidateId,
          })
        : await findExistingConversation(sender, receiverId);
    }

    // =====================
    // MESSAGE REQUEST FLOW
    // =====================
    if (!jobId && !isFriend && !existingConversation) {
      if (messageType !== "text") {
        return res
          .status(400)
          .json({ message: "Seuls les messages textes sont autorisés." });
      }

      const { request, errorStatus, message: errorMessage } =
        await buildMessageRequest({
          senderUser,
          receiverUser,
          content: messageText,
        });

      if (errorStatus) {
        return res.status(errorStatus).json({ message: errorMessage });
      }

      await pushNotification(receiverId, {
        from: sender,
        type: "public",
        actionType: "message_request",
        relatedId: request._id,
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
    if (messageType === "text" && !messageText) {
      return res.status(400).json({ message: "Le message ne peut pas être vide." });
    }

    if (messageType === "file" && !filePayload) {
      return res.status(400).json({ message: "Fichier invalide." });
    }
    if (messageType === "audio" && !audioPayload) {
      return res.status(400).json({ message: "Audio invalide." });
    }

    let replyPreview = null;
    let replyMessageId = null;
    if (replyTo) {
      const repliedMessage = await Message.findById(replyTo);
      if (repliedMessage) {
        replyMessageId = repliedMessage._id;
        replyPreview = {
          messageId: replyMessageId,
          content:
            repliedMessage.type === "file"
              ? repliedMessage.file?.name || "Fichier"
              : repliedMessage.content || "",
          type: repliedMessage.type || "text",
        };
      }
    }

    let conversation = existingConversation;
    if (!conversation) {
      if (!jobContext && !isFriend) {
        return res.status(403).json({
          message: "Impossible d'envoyer un message sans accepter la demande.",
        });
      }
      if (jobContext) {
        conversation = await Conversation.create({
          job: jobId,
          recruiter: jobContext.recruiterId,
          candidate: jobContext.candidateId,
          participants: [jobContext.recruiterId, jobContext.candidateId],
        });
      } else {
        conversation = await findOrCreateConversation(sender, receiverId);
      }
    }

    if (jobContext && conversation?.job && String(conversation.job) !== String(jobId)) {
      return res.status(400).json({
        message: "Conversation invalide pour cette offre.",
      });
    }

    const message = await Message.create({
      sender,
      receiver: receiverId,
      conversation: conversation._id,
      content: messageType === "text" ? messageText : "",
      text: messageType === "text" ? messageText : "",
      application: applicationId || null,
      job: jobId || conversation?.job || null,
      type: messageType,
      file: filePayload,
      fileUrl: filePayload?.url || null,
      audio: audioPayload,
      audioUrl: audioPayload?.url || null,
      clientTempId: clientTempId || null,
      replyTo: replyMessageId,
      replyPreview,
      isRead: false,
    });

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt || new Date();
    if (conversation.recruiter && String(receiverId) === String(conversation.recruiter)) {
      conversation.unreadCountRecruiter =
        (conversation.unreadCountRecruiter || 0) + 1;
    }
    if (conversation.candidate && String(receiverId) === String(conversation.candidate)) {
      conversation.unreadCountCandidate =
        (conversation.unreadCountCandidate || 0) + 1;
    }
    conversation.updatedAt = new Date();
    await conversation.save();

    /* 🔥 SOCKET.IO — MESSAGE TEMPS RÉEL */
    console.log("📩 Message API :", sender, "→", receiverId);
    getIO().to(conversation._id.toString()).emit("message:new", message);

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
      type: resolveNotificationType(message),
      actionType: "message",
      relatedId: message._id,
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
POST /api/messages/request
➤ Créer une demande de message
============================================================ */
exports.createMessageRequest = async (req, res) => {
  try {
    const senderId = getSenderId(req);
    const { toUser, message } = req.body;

    if (!senderId) {
      return res.status(401).json({ message: "Authentification requise." });
    }

    if (!toUser || !mongoose.Types.ObjectId.isValid(toUser)) {
      return res.status(400).json({ message: "Destinataire invalide." });
    }

    if (String(toUser) === String(senderId)) {
      return res
        .status(400)
        .json({ message: "Impossible d'envoyer une demande à vous-même." });
    }

    const [receiverUser, senderUser] = await Promise.all([
      User.findById(toUser),
      User.findById(senderId),
    ]);

    if (!receiverUser || !senderUser) {
      return res.status(404).json({ message: "Destinataire introuvable." });
    }

    if (isBlocked(receiverUser, senderId) || isBlocked(senderUser, toUser)) {
      return res.status(403).json({ message: "Interaction non autorisée." });
    }

    if (areFriends(senderUser, toUser) && areFriends(receiverUser, senderId)) {
      return res
        .status(400)
        .json({ message: "Vous êtes déjà connectés en messages." });
    }

    const { request, errorStatus, message: errorMessage } =
      await buildMessageRequest({
        senderUser,
        receiverUser,
        content: message,
      });

    if (errorStatus) {
      return res.status(errorStatus).json({ message: errorMessage });
    }

    await pushNotification(toUser, {
      from: senderId,
      type: "public",
      actionType: "message_request",
      relatedId: request._id,
      text: "Nouvelle demande de message",
    });

    return res.status(201).json({ success: true, data: request });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors de la création de la demande.",
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
      toUser: userId,
      status: "pending",
    })
      .populate("fromUser", "name avatar role")
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
    if (!request || String(request.toUser) !== String(userId)) {
      return res.status(404).json({ message: "Demande introuvable." });
    }

    if (request.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Cette demande a déjà été traitée." });
    }

    const [receiver, sender] = await Promise.all([
      User.findById(userId).select("name avatar role"),
      User.findById(request.fromUser).select("name avatar role"),
    ]);

    if (!receiver || !sender) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    if (isBlocked(receiver, sender._id)) {
      request.status = "rejected";
      await request.save();
      return res.status(403).json({ message: "Interaction bloquée." });
    }

    const existingConversation = await findExistingConversation(
      sender._id,
      receiver._id
    );

    const conversation =
      existingConversation ||
      (await Conversation.create({
        participants: [sender._id, receiver._id],
      }));

    request.status = "accepted";
    await request.save();

    await Notification.deleteMany({
      userId,
      type: "public",
      actionType: "message_request",
      relatedId: request._id,
    });

    const recipientView = {
      _id: conversation._id,
      user: sender,
      unreadCount: 0,
      lastMessage: null,
    };

    const requesterView = {
      _id: conversation._id,
      user: receiver,
      unreadCount: 0,
      lastMessage: null,
    };

    getIO()
      .to(sender._id.toString())
      .emit("conversation_created", requesterView);
    getIO()
      .to(receiver._id.toString())
      .emit("conversation_created", recipientView);

    return res.status(200).json({ success: true, conversation: recipientView });
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
    if (!request || String(request.toUser) !== String(userId)) {
      return res.status(404).json({ message: "Demande introuvable." });
    }

    request.status = "rejected";
    await request.save();

    await Notification.deleteMany({
      userId,
      type: "public",
      actionType: "message_request",
      relatedId: request._id,
    });

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
    if (!request || String(request.toUser) !== String(userId)) {
      return res.status(404).json({ message: "Demande introuvable." });
    }

    const receiver = await User.findById(userId);
    if (!receiver) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    receiver.blockedUsers = receiver.blockedUsers || [];
    if (!isBlocked(receiver, request.fromUser)) {
      receiver.blockedUsers.push(request.fromUser);
      await receiver.save();
    }

    request.status = "rejected";
    await request.save();

    await Notification.deleteMany({
      userId,
      type: "public",
      actionType: "message_request",
      relatedId: request._id,
    });

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
➤ Uploader un message vocal
============================================================ */
exports.uploadAudioMessage = async (req, res) => {
  try {
    const sender = getSenderId(req);
    if (!sender) {
      return res.status(401).json({ message: "Authentification requise." });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "Audio requis." });
    }

    if (!ALLOWED_AUDIO_MIME_TYPES.has(file.mimetype)) {
      return res.status(400).json({ message: "Format audio non supporté." });
    }

    if (file.size > MAX_MESSAGE_AUDIO_SIZE) {
      return res.status(400).json({ message: "Audio trop volumineux." });
    }

    const uploadDir = ensureMessageAudioUploadDir();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.webm`;
    const destination = path.join(uploadDir, fileName);

    await fs.promises.writeFile(destination, file.buffer);

    const duration = Number(req.body?.duration);
    const normalizedDuration = Number.isFinite(duration) && duration >= 0 ? duration : 0;

    return res.status(201).json({
      success: true,
      audio: {
        url: buildMessageAudioUrl(fileName),
        duration: normalizedDuration,
        mime: "audio/webm",
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors de l'upload de l'audio.",
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
    const targetId = req.params.userId;

    const myObjectId = new mongoose.Types.ObjectId(myId);

    if (mongoose.Types.ObjectId.isValid(targetId)) {
      const conversation = await Conversation.findById(targetId);
      if (conversation) {
        const isParticipant =
          String(conversation.recruiter || "") === String(myId) ||
          String(conversation.candidate || "") === String(myId) ||
          (Array.isArray(conversation.participants) &&
            conversation.participants.some(
              (participant) => String(participant) === String(myId)
            ));

        if (!isParticipant) {
          return res.status(403).json({ message: "Accès interdit." });
        }

        const messages = await Message.find({
          conversation: conversation._id,
          deletedForAll: { $ne: true },
          deletedFor: { $ne: myObjectId },
        })
          .sort({ createdAt: 1 })
          .populate("sender", "name avatar role")
          .populate("receiver", "name avatar role")
          .populate("replyTo", "content type sender receiver");

        return res.status(200).json(messages);
      }
    }

    const messages = await Message.find({
      $and: [
        {
          $or: [
            { sender: myId, receiver: targetId },
            { sender: targetId, receiver: myId },
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
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const inbox = await Conversation.find({ participants: userId })
      .sort({ updatedAt: -1 })
      .populate({
        path: "lastMessage",
        populate: [
          { path: "sender", select: "name avatar role" },
          { path: "receiver", select: "name avatar role" },
        ],
      })
      .populate("participants", "name avatar role");

    return res.status(200).json(inbox);
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors du chargement de la boîte de réception.",
      details: error.message,
    });
  }
};

/* ============================================================
GET /api/recruiter/conversations
➤ Conversations recruteur
============================================================ */
exports.getRecruiterConversations = async (req, res) => {
  try {
    const recruiterId = req.user.id;

    const conversations = await Conversation.find({ recruiter: recruiterId })
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .populate("candidate", "name avatar role")
      .populate("job")
      .populate({
        path: "lastMessage",
        populate: [
          { path: "sender", select: "name avatar role" },
          { path: "receiver", select: "name avatar role" },
        ],
      });

    return res.status(200).json({ success: true, data: conversations });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors du chargement des conversations.",
      details: error.message,
    });
  }
};

/* ============================================================
GET /api/candidate/conversations
➤ Conversations candidat
============================================================ */
exports.getCandidateConversations = async (req, res) => {
  try {
    const candidateId = req.user.id;

    const conversations = await Conversation.find({ candidate: candidateId })
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .populate("recruiter", "name avatar role companyName")
      .populate("job")
      .populate({
        path: "lastMessage",
        populate: [
          { path: "sender", select: "name avatar role" },
          { path: "receiver", select: "name avatar role" },
        ],
      });

    return res.status(200).json({ success: true, data: conversations });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors du chargement des conversations.",
      details: error.message,
    });
  }
};

/* ============================================================
POST /api/conversations/job
➤ Créer / récupérer une conversation liée à une offre
============================================================ */
exports.getOrCreateJobConversation = async (req, res) => {
  try {
    const senderId = getSenderId(req);
    const { jobId, otherUserId } = req.body;

    if (!senderId) {
      return res.status(401).json({ message: "Authentification requise." });
    }

    if (!jobId || !otherUserId) {
      return res.status(400).json({
        message: "jobId et otherUserId sont requis.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ message: "Destinataire invalide." });
    }

    const [senderUser, receiverUser] = await Promise.all([
      User.findById(senderId),
      User.findById(otherUserId),
    ]);

    if (!senderUser || !receiverUser) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    const jobContext = await resolveJobConversationContext({
      senderUser,
      receiverUser,
      jobId,
    });

    if (jobContext?.errorStatus) {
      return res.status(jobContext.errorStatus).json({
        message: jobContext.message,
      });
    }

    let conversation = await findExistingJobConversation({
      jobId,
      recruiterId: jobContext.recruiterId,
      candidateId: jobContext.candidateId,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        job: jobId,
        recruiter: jobContext.recruiterId,
        candidate: jobContext.candidateId,
        participants: [jobContext.recruiterId, jobContext.candidateId],
      });
    }

    const populated = await Conversation.findById(conversation._id)
      .populate("candidate", "name avatar role")
      .populate("recruiter", "name avatar role companyName")
      .populate("job")
      .populate({
        path: "lastMessage",
        populate: [
          { path: "sender", select: "name avatar role" },
          { path: "receiver", select: "name avatar role" },
        ],
      });

    return res.status(200).json({ success: true, data: populated });
  } catch (error) {
    return res.status(500).json({
      error: "Erreur lors de la création de la conversation.",
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

    const notificationType = resolveNotificationType(message);
    await Notification.deleteMany({
      userId,
      type: notificationType,
      relatedId: message._id,
    });

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

    const unreadMessages = await Message.find({
      sender: otherUserId,
      receiver: myId,
      isRead: true,
    })
      .select("_id job application")
      .lean();

    const jobIds = [];
    const publicIds = [];
    unreadMessages.forEach((msg) => {
      if (resolveNotificationType(msg) === "job") {
        jobIds.push(msg._id);
      } else {
        publicIds.push(msg._id);
      }
    });

    const deletePromises = [];
    if (jobIds.length > 0) {
      deletePromises.push(
        Notification.deleteMany({
          userId: myId,
          type: "job",
          relatedId: { $in: jobIds },
        })
      );
    }
    if (publicIds.length > 0) {
      deletePromises.push(
        Notification.deleteMany({
          userId: myId,
          type: "public",
          relatedId: { $in: publicIds },
        })
      );
    }
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
    }

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
        const audioUrl = message.audio?.url || message.audioUrl;
        if (audioUrl) {
          mediaPaths.push(path.join(__dirname, `..${audioUrl}`));
        }
        const fileUrl = message.file?.url || message.fileUrl;
        if (fileUrl) {
          const fileName = getSafeFileName(getFileUrlPath(fileUrl).split("/").pop());
          if (fileName) {
            mediaPaths.push(path.join(ensureMessageUploadDir(), fileName));
          }
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
