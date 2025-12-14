const express = require("express");
const router = express.Router();

// Controller
const MessageController = require("../controllers/MessageController");

// Middleware sécurité
const { isAuthenticated } = require("../middlewares/auth");

/* ============================================================
   ENVOYER UN MESSAGE
   POST /api/messages
============================================================ */
router.post(
  "/",
  isAuthenticated,
  MessageController.sendMessage
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