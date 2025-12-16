const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Controller
const MessageController = require("../controllers/MessageController");

// Middleware sécurité
const { isAuthenticated } = require("../middlewares/auth");

const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../uploads/audio");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".webm";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const audioUpload = multer({
  storage: audioStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["audio/webm", "audio/mpeg", "audio/mp3", "audio/ogg"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Format audio non supporté"));
    }
    cb(null, true);
  },
});

/* ============================================================
   ENVOYER UN MESSAGE
   POST /api/messages
============================================================ */
router.post(
  "/",
  isAuthenticated,
  MessageController.sendMessage
);

router.post(
  "/audio",
  isAuthenticated,
  audioUpload.single("audio"),
  MessageController.sendAudioMessage
);

router.post(
  "/typing",
  isAuthenticated,
  MessageController.setTypingFlag
);

router.delete(
  "/:id",
  isAuthenticated,
  MessageController.deleteMessage
);

/* ============================================================
   OBTENIR LA CONVERSATION ENTRE 2 UTILISATEURS
   GET /api/messages/conversation/:userId
============================================================ */
router.get(
  "/conversation/:userId",
  isAuthenticated,
  (req, res, next) => {
    if (req.params.userId === req.user.id) {
      return res.status(400).json({
        message: "Impossible d'ouvrir une conversation avec vous-même.",
      });
    }
    next();
  },
  MessageController.getConversation
);

/* ============================================================
   OBTENIR LA LISTE DES DERNIÈRES DISCUSSIONS (INBOX)
   GET /api/messages/inbox
============================================================ */
router.get(
  "/inbox",
  isAuthenticated,
  MessageController.getInbox
);

/* ============================================================
   🆕 LISTE DES AMIS (POUR DÉMARRER UNE CONVERSATION)
   GET /api/messages/friends
============================================================ */
router.get(
  "/friends",
  isAuthenticated,
  MessageController.getMessageFriends
);

/* ============================================================
   MARQUER UN MESSAGE COMME LU
   PATCH /api/messages/:id/read
============================================================ */
router.patch(
  "/:id/read",
  isAuthenticated,
  MessageController.markAsRead
);

router.post(
  "/:id/react",
  isAuthenticated,
  MessageController.reactToMessage
);

router.get(
  "/:id/reactions",
  isAuthenticated,
  MessageController.getMessageReactions
);

/* ============================================================
   MARQUER TOUTE LA CONVERSATION COMME LUE
   PATCH /api/messages/read-all/:userId
============================================================ */
router.patch(
  "/read-all/:userId",
  isAuthenticated,
  MessageController.markAllAsReadForConversation
);

module.exports = router;