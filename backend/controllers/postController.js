const Post = require("../models/Post");
const Notification = require("../models/Notification");
const fs = require("fs");
const path = require("path");
const { getIO } = require("../socket");

/* ============================================================
   🔥 UTILITAIRE — NOTIFICATION + SOCKET (ANTI-DOUBLON)
============================================================ */
async function pushNotification(userId, data) {
  const filter = {
    user: userId,
    from: data.from,
    type: data.type,
    post: data.post || null,
    read: false,
  };

  const existing = await Notification.findOne(filter);
  if (existing) return existing;

  const notif = await Notification.create({
    user: userId,
    from: data.from,
    type: data.type,
    text: data.text,
    post: data.post || null,
    read: false,
  });

  getIO().to(String(userId)).emit("notification:new", notif);
  return notif;
}

const VALID_REACTIONS = ["like", "love", "haha", "wow", "sad", "angry"];

/* ============================================================
   📌 SCROLL INFINI — PAGINATION
============================================================ */
exports.listPaginated = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const skip = (page - 1) * limit;

    const total = await Post.countDocuments();
    const posts = await Post.find()
      .populate("user", "name avatar")
      .populate("comments.user", "name avatar")
      .populate("comments.replies.user", "name avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      page,
      limit,
      total,
      hasMore: skip + posts.length < total,
      posts,
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur pagination posts" });
  }
};

/* ============================================================
   📌 LISTE DES POSTS
============================================================ */
exports.list = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("user", "name avatar")
      .populate("comments.user", "name avatar")
      .populate("comments.replies.user", "name avatar")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch {
    res.status(500).json({ error: "Erreur chargement posts" });
  }
};

/* ============================================================
   📌 CRÉER UN POST
============================================================ */
exports.create = async (req, res) => {
  try {
    const post = await Post.create({
      text: req.body.text || "",
      user: req.user.id,
      image: req.file ? "/uploads/" + req.file.filename : null,
    });

    getIO().emit("post:new", post);
    res.status(201).json(post);
  } catch {
    res.status(500).json({ error: "Erreur création post" });
  }
};

/* ============================================================
   📌 RÉCUPÉRER UN POST
============================================================ */
exports.getById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("user", "name avatar")
      .populate("comments.user", "name avatar")
      .populate("comments.replies.user", "name avatar");

    if (!post) return res.status(404).json({ error: "Post introuvable" });
    res.json(post);
  } catch {
    res.status(500).json({ error: "Erreur récupération post" });
  }
};

/* ============================================================
   📌 SUPPRIMER UN POST
============================================================ */
exports.remove = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post introuvable" });

    if (post.user.toString() !== req.user.id)
      return res.status(403).json({ error: "Non autorisé" });

    if (post.image) {
      fs.unlink(path.join(__dirname, "..", post.image), () => {});
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Erreur suppression post" });
  }
};

/* ============================================================
   📌 LIKE / UNLIKE
============================================================ */
exports.toggleLike = async (req, res) => {
  try {
    const userId = req.user.id;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post introuvable" });

    const index = post.likes.findIndex((id) => id.toString() === userId);
    if (index >= 0) {
      post.likes.splice(index, 1);
    } else {
      post.likes.push(userId);
      if (post.user.toString() !== userId) {
        await pushNotification(post.user, {
          from: userId,
          type: "like",
          text: "A aimé votre post",
          post: post._id,
        });
      }
    }

    await post.save();
    res.json({ likes: post.likes });
  } catch {
    res.status(500).json({ error: "Erreur like" });
  }
};

/* ============================================================
   📌 COMMENTER
============================================================ */
exports.comment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post introuvable" });

    post.comments.push({
      user: req.user.id,
      text: req.body.text,
    });

    await post.save();

    if (post.user.toString() !== req.user.id) {
      await pushNotification(post.user, {
        from: req.user.id,
        type: "comment",
        text: "Nouveau commentaire",
        post: post._id,
      });
    }

    res.json(post);
  } catch {
    res.status(500).json({ error: "Erreur commentaire" });
  }
};

/* ============================================================
   📌 RÉPONDRE À UN COMMENTAIRE
============================================================ */
exports.reply = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post introuvable" });

    const comment = post.comments.id(req.params.commentId);
    if (!comment)
      return res.status(404).json({ error: "Commentaire introuvable" });

    comment.replies.push({
      user: req.user.id,
      text: req.body.text,
    });

    await post.save();

    if (comment.user.toString() !== req.user.id) {
      await pushNotification(comment.user, {
        from: req.user.id,
        type: "reply",
        text: "Réponse à votre commentaire",
        post: post._id,
      });
    }

    res.json(post);
  } catch {
    res.status(500).json({ error: "Erreur réponse" });
  }
};

/* ============================================================
   📌 RÉACTION POST
============================================================ */
exports.react = async (req, res) => {
  try {
    const { reaction } = req.body;
    if (!VALID_REACTIONS.includes(reaction))
      return res.status(400).json({ error: "Réaction invalide" });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post introuvable" });

    const existing = post.reactions.find(
      (r) => r.user.toString() === req.user.id
    );

    if (existing) {
      existing.type = reaction;
    } else {
      post.reactions.push({ user: req.user.id, type: reaction });
    }

    await post.save();
    res.json(post.reactions);
  } catch {
    res.status(500).json({ error: "Erreur réaction" });
  }
};