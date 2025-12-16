// controllers/storyController.js

const Story = require("../models/Story");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { getIO } = require("../socket");

/* ============================================================
   🔥 UTILITAIRE — NOTIFICATION + SOCKET
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
    story: data.story || null,
    post: data.post || null,
    read: false,
  });

  getIO().to(String(userId)).emit("notification:new", notif);

  return notif;
}

/* ============================================================
   📌 CRÉER UNE STORY
============================================================ */
exports.create = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier média trouvé." });
    }

    // Création story
    const story = await Story.create({
      user: req.user.id,
      media: "/uploads/" + req.file.filename,
      type: req.file.mimetype.startsWith("video") ? "video" : "image",
    });

    // 📣 NOTIFICATION — si l’auteur est un créateur : prévenir ses abonnés
    const author = await User.findById(req.user.id);

    if (author.isCreator && Array.isArray(author.followers)) {
      author.followers.forEach((followerId) => {
        pushNotification(followerId, {
          from: req.user.id,
          type: "story_new",
          text: `${author.name} a publié une nouvelle story.`,
          story: story._id,
        });

        getIO().to(String(followerId)).emit("story:new", story);
      });
    }

    res.status(201).json(story);
  } catch (err) {
    console.error("STORY CREATE ERROR:", err);
    res.status(500).json({ error: "Erreur lors de la création de la story." });
  }
};


/* ============================================================
   📌 LISTE DES STORIES NON EXPIRÉES
============================================================ */
exports.list = async (req, res) => {
  try {
    const stories = await Story.find({ expiresAt: { $gte: new Date() } })
      .populate("user", "name avatar isCreator")
      .sort({ createdAt: -1 });

    res.json(stories);
  } catch (err) {
    console.error("STORY LIST ERROR:", err);
    res.status(500).json({ error: "Erreur lors du chargement des stories." });
  }
};
