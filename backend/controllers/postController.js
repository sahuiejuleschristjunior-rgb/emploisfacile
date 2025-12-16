const Post = require("../models/Post");
const Notification = require("../models/Notification");
const fs = require("fs");
const path = require("path");
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
    post: data.post || null,
    story: data.story || null,
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
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    if (page < 1) page = 1;
    if (limit < 1) limit = 10;

    const skip = (page - 1) * limit;

    const total = await Post.countDocuments();

    const posts = await Post.find()
      .populate("user", "name email avatar")
      .populate("comments.user", "name email avatar avatarColor")
      .populate("comments.replies.user", "name email avatar avatarColor")
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
      .populate("user", "name email avatar avatarColor")
      .populate("comments.user", "name email avatar avatarColor")
      .populate("comments.replies.user", "name email avatar avatarColor")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: "Erreur chargement posts" });
  }
};

/* ============================================================
   📌 CRÉER UN POST
============================================================ */
exports.create = async (req, res) => {
  try {
    const post = await Post.create({
      ...req.body,
      user: req.user.id,
      image: req.file ? "/uploads/" + req.file.filename : null,
    });

    getIO().emit("post:new", post);

    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ error: "Erreur création post" });
  }
};

/* ============================================================
   📌 RÉCUPÉRER UN POST
============================================================ */
exports.getById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("user", "name email avatar avatarColor")
      .populate("comments.user", "name email avatar avatarColor")
      .populate("comments.replies.user", "name email avatar avatarColor");

    if (!post) return res.status(404).json({ error: "Post introuvable" });

    res.json(post);
  } catch (err) {
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
      fs.unlink(path.join(__dirname, "../", post.image), (err) => {
        if (err) console.error("Erreur suppression image", err);
      });
    }

    await Post.findByIdAndDelete(req.params.id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur suppression post" });
  }
};

/* ============================================================
   📌 LIKE / UNLIKE
============================================================ */
exports.toggleLike = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post introuvable" });

    const alreadyLiked = post.likes.includes(userId);

    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== userId);
    } else {
      post.likes.push(userId);

      if (post.user.toString() !== userId) {
        await pushNotification(post.user, {
          from: userId,
          type: "like",
          text: "Quelqu'un a liké votre post",
          post: post._id,
        });
      }
    }

    await post.save();

    res.json({ likes: post.likes });
  } catch (err) {
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

    getIO().to(String(post.user)).emit("comment:new", {
      postId: post._id,
      comment: post.comments[post.comments.length - 1],
    });

    if (post.user.toString() !== req.user.id) {
      await pushNotification(post.user, {
        from: req.user.id,
        type: "comment",
        text: "Nouveau commentaire sur votre post",
        post: post._id,
      });
    }

    res.json(post);
  } catch (err) {
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
    if (!comment) return res.status(404).json({ error: "Commentaire introuvable" });

    comment.replies.push({
      user: req.user.id,
      text: req.body.text,
    });

    await post.save();

    getIO().to(String(comment.user)).emit("reply:new", {
      postId: post._id,
      commentId: comment._id,
      reply: comment.replies[comment.replies.length - 1],
    });

    if (comment.user.toString() !== req.user.id) {
      await pushNotification(comment.user, {
        from: req.user.id,
        type: "reply",
        text: "Vous avez reçu une réponse à votre commentaire",
        post: post._id,
      });
    }

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: "Erreur réponse" });
  }
};

/* ============================================================
   📌 RÉACTIONS
============================================================ */
exports.react = async (req, res) => {
  try {
    const { reaction } = req.body;
    const userId = req.user.id;
    const postId = req.params.id;

    if (!VALID_REACTIONS.includes(reaction))
      return res.status(400).json({ error: "Réaction invalide" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post introuvable" });

    const existingReaction = post.reactions.find(
      (r) => r.user.toString() === userId
    );

    if (existingReaction) {
      if (existingReaction.type === reaction) {
        post.reactions = post.reactions.filter(
          (r) => r.user.toString() !== userId
        );
      } else {
        existingReaction.type = reaction;
      }
    } else {
      post.reactions.push({ user: userId, type: reaction });

      if (post.user.toString() !== userId) {
        await pushNotification(post.user, {
          from: userId,
          type: "like",
          text: "Une réaction a été ajoutée à votre post",
          post: post._id,
        });
      }
    }

    await post.save();

    res.json(post.reactions);
  } catch (err) {
    res.status(500).json({ error: "Erreur réaction" });
  }
};
