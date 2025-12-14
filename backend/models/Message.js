const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    // Expéditeur du message
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Destinataire
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Lien optionnel vers une candidature
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      default: null,
    },

    // Lien optionnel vers une offre
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
    },

    // Type de message (texte, système, appel vidéo, fichier…)
    type: {
      type: String,
      enum: ["text", "system", "video", "file", "videoCall"],
      default: "text",
    },

    // Contenu du message (texte)
    content: {
      type: String,
      required: true,
      trim: true,
    },

    // URL d’un fichier (si type = file)
    fileUrl: {
      type: String,
      default: null,
    },

    // ID de salle pour appels vidéo WebRTC
    callRoomId: {
      type: String,
      default: null,
    },

    // Lecture
    isRead: {
      type: Boolean,
      default: false,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Amélioration : index bidirectionnel pour conversation
messageSchema.index(
  { sender: 1, receiver: 1, createdAt: -1 },
  { background: true }
);

messageSchema.index(
  { receiver: 1, sender: 1, createdAt: -1 },
  { background: true }
);

module.exports = mongoose.model("Message", messageSchema);