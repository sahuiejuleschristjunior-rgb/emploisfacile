const mongoose = require("mongoose");

/*
  TYPES DE NOTIFICATION PRIS EN CHARGE :

  💬 message
  👍 like
  💬 comment
  ↩️ reply
  👤 friend_request
  👥 friend_accept
  ❌ friend_reject
  🗑️ friend_remove
  ➕ follow
  ➖ unfollow
  📞 call
  👀 read_receipt
  ✍️ typing
*/

const NotificationSchema = new mongoose.Schema(
  {
    // Destinataire de la notification
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },

    // Expéditeur / auteur de l’action
    from: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },

    // Type de notification
    type: {
      type: String,
      required: true,
      enum: [
        "like",
        "comment",
        "reply",
        "message",
        "friend_request",
        "friend_accept",
        "friend_reject",
        "friend_remove",
        "follow",
        "unfollow",
        "call",
        "read_receipt",
        "typing",
      ],
    },

    // Post lié (like / comment / reply)
    post: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Post",
      default: null,
    },

    // Story liée (permet d’éviter toute erreur dans le populate)
    story: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Story",
      default: null,
    },

    // Texte optionnel
    text: {
      type: String,
      default: "",
    },

    // Statut : lu / non-lu
    read: { 
      type: Boolean, 
      default: false 
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);
