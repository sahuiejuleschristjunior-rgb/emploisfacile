const mongoose = require("mongoose");

const FriendSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      enum: ["public", "professional"],
      default: "public",
    },
  },
  { _id: false } // 🔥 important : pas besoin d'id interne
);

const UserSchema = new mongoose.Schema(
  {
    /* =====================
       IDENTITÉ
    ===================== */
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    role: {
      type: String,
      enum: ["candidate", "recruiter", "admin"],
      default: "candidate",
      required: true,
    },

    avatar: {
      type: String,
      default: "/default-avatar.png",
    },

    coverPhoto: {
      type: String,
      default: "/default-cover.jpg",
    },

    bio: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    /* =====================
       PROFILS
    ===================== */
    companyName: { type: String, trim: true },
    companyInfo: { type: String },

    candidateProfile: {
      cvUrl: String,
      coverLetterUrl: String,
    },

    /* =====================
       AUTH / SÉCURITÉ
    ===================== */
    otp: { type: String, default: null },
    otpExpires: { type: Number, default: null },
    verified: { type: Boolean, default: false },

    /* =====================
       ACTIVITÉ & SOCKET
    ===================== */
    lastActive: { type: Date, default: Date.now },
    allowMessages: { type: Boolean, default: true },
    socketId: { type: String, default: null },
    deviceToken: { type: String, default: null },

    /* =====================
       🔥 RELATIONS / AMIS
    ===================== */
    friends: [FriendSchema],

    friendRequestsSent: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],

    friendRequestsReceived: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],

    blockedUsers: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],

    /* =====================
       🔥 FOLLOW / CRÉATEURS
    ===================== */
    isCreator: { type: Boolean, default: false },

    creatorCategory: {
      type: String,
      enum: [
        "entreprise",
        "influenceur",
        "media",
        "organisation",
        "personnalité",
        "artiste",
        "public_figure",
        "autre",
      ],
      default: null,
    },

    followers: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],

    following: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);