const mongoose = require("mongoose");

const SponsoredPostSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
    ownerType: { type: String, enum: ["user", "page"], required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, required: true },
    status: {
      type: String,
      enum: ["draft", "active", "paused", "ended"],
      default: "draft",
    },
    budgetTotal: { type: Number, default: 0 },
    budgetDaily: { type: Number, default: 0 },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, default: null },
    targeting: { type: Object, default: null },
    stats: {
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SponsoredPost", SponsoredPostSchema);
