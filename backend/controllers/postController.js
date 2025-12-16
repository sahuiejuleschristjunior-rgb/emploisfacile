const Post = require("../models/Post");
const Notification = require("../models/Notification");
const fs = require("fs");
const path = require("path");
const { getIO } = require("../socket");

/* ============================================================
   🔥 UTILITAIRE — NOTIFICATION + SOCKET
============================================================ */
async function pushNotification(userId, data) {
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
    const text = typeof req.body.text === "string" ? req.body.text : "";
    let media = [];

    if (req.body.media) {
      try {
        media = Array.isArray(req.body.media)
          ? req.body.media
          : JSON.parse(req.body.media);
      } catch {
        media = [];
      }
    }

    if (req.files?.length) {
      const uploaded = req.files.map((f) => ({
        url: "/uploads/" + f.filename,
        type: f.mimetype.startsWith("image")
          ? "image"
          : f.mimetype.startsWith("video")
          ? "video"
          : "audio",
      }));

      media = [...media, ...uploaded];
    }

    const created = await Post.create({
      user: req.userId,
      text,
      media,
    });

    const post = await Post.findById(created._id)
      .populate("user", "name email avatar avatarColor")
      .populate("comments.user", "name email avatar avatarColor")
      .populate("comments.replies.user", "name email avatar avatarColor");

    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ error: "Erreur création post" });
  }
};

/* ============================================================
   📌 COMMENTAIRE (texte + média) + NOTIFICATION
============================================================ */
exports.comment = async (req, res) => {
  try {
    // texte vient de JSON OU de FormData
    const rawText = req.body.text || "";
    const text = rawText.trim();

    // fichier venant de multer.single("media") ou .array()
    let media = null;
    if (req.file) {
      media = {
        url: "/uploads/" + req.file.filename,
        type: req.file.mimetype.startsWith("image")
          ? "image"
          : req.file.mimetype.startsWith("video")
          ? "video"
          : "audio",
      };
    } else if (req.files && req.files[0]) {
      const f = req.files[0];
      media = {
        url: "/uploads/" + f.filename,
        type: f.mimetype.startsWith("image")
          ? "image"
          : f.mimetype.startsWith("video")
          ? "video"
          : "audio",
      };
    }

    if (!text && !media) {
      return res.status(400).json({ error: "Commentaire vide" });
    }

    const postId = req.params.id || req.params.postId;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post introuvable" });

    const userId = req.userId;

    const comment = {
      user: userId,
      text: text || "",
      media: media || undefined,
      likes: [],
      reactions: [],
    };

    post.comments.push(comment);
    await post.save();

    // 🔥 NOTIFICATION — commenter un post
    if (String(post.user) !== String(userId)) {
      await pushNotification(post.user, {
        from: userId,
        post: post._id,
        type: "comment",
        text: "A commenté votre publication.",
      });
    }

    const updated = await Post.findById(post._id)
      .populate("user", "name email avatar avatarColor")
      .populate("comments.user", "name email avatar avatarColor")
      .populate("comments.replies.user", "name email avatar avatarColor");

    getIO().emit("post:update", updated);

    res.json(updated);
  } catch (err) {
    console.error("COMMENT ERROR:", err);
    res.status(500).json({ error: "Erreur ajout commentaire" });
  }
};

/* ============================================================
   📌 LIKE / UNLIKE POST + NOTIFICATION
============================================================ */
exports.like = async (req, res) => {
  try {
    const postId = req.params.id || req.params.postId;
    const post = await Post.findById(postId);
    const userId = req.userId;

    if (!post) return res.status(404).json({ error: "Post introuvable" });

    const alreadyLiked = post.likes.some(
      (u) => String(u) === String(userId)
    );

    if (alreadyLiked) {
      post.likes = post.likes.filter((u) => String(u) !== String(userId));
    } else {
      post.likes.push(userId);

      if (String(post.user) !== String(userId)) {
        await pushNotification(post.user, {
          from: userId,
          type: "like",
          post: post._id,
          text: "A aimé votre publication.",
        });
      }
    }

    await post.save();

    res.json({ liked: !alreadyLiked });
  } catch (err) {
    res.status(500).json({ error: "Erreur Like" });
  }
};

/* ============================================================
   📌 RÉPONSE (texte + media) + NOTIFICATION
============================================================ */
exports.reply = async (req, res) => {
  try {
    const { postId, commentId } = req.params;

    const rawText = req.body.text || "";
    const text = rawText.trim();

    let media = null;
    if (req.file) {
      media = {
        url: "/uploads/" + req.file.filename,
        type: req.file.mimetype.startsWith("image")
          ? "image"
          : req.file.mimetype.startsWith("video")
          ? "video"
          : "audio",
      };
    } else if (req.files && req.files[0]) {
      const f = req.files[0];
      media = {
        url: "/uploads/" + f.filename,
        type: f.mimetype.startsWith("image")
          ? "image"
          : f.mimetype.startsWith("video")
          ? "video"
          : "audio",
      };
    }

    if (!text && !media) {
      return res.status(400).json({ error: "Réponse vide" });
    }

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post introuvable" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ error: "Commentaire introuvable" });

    const reply = {
      user: req.userId,
      text: text || "",
      media: media || undefined,
      likes: [],
      reactions: [],
    };

    comment.replies.push(reply);
    await post.save();

    if (String(comment.user) !== String(req.userId)) {
      await pushNotification(comment.user, {
        from: req.userId,
        post: post._id,
        type: "reply",
        text: "A répondu à votre commentaire.",
      });
    }

    const updated = await Post.findById(postId)
      .populate("user", "name email avatar avatarColor")
      .populate("comments.user", "name email avatar avatarColor")
      .populate("comments.replies.user", "name email avatar avatarColor");

    getIO().emit("post:update", updated);

    res.json(updated);
  } catch (err) {
    console.error("REPLY ERROR:", err);
    res.status(500).json({ error: "Erreur ajout réponse" });
  }
};

/* ============================================================
   📌 LIKE / UNLIKE COMMENTAIRE
   Route attendue : POST /posts/:postId/comment/:commentId/like
============================================================ */
exports.likeComment = async (req, res) => {
  try {
    const postId = req.params.postId || req.params.id;
    const { commentId } = req.params;
    const userId = req.userId;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post introuvable" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ error: "Commentaire introuvable" });

    const alreadyLiked = (comment.likes || []).some(
      (u) => String(u) === String(userId)
    );

    if (alreadyLiked) {
      comment.likes = comment.likes.filter(
        (u) => String(u) !== String(userId)
      );
    } else {
      comment.likes = comment.likes || [];
      comment.likes.push(userId);
    }

    await post.save();

    const updated = await Post.findById(postId)
      .populate("user", "name email avatar avatarColor")
      .populate("comments.user", "name email avatar avatarColor")
      .populate("comments.replies.user", "name email avatar avatarColor");

    getIO().emit("post:update", updated);

    res.json(updated);
  } catch (err) {
    console.error("LIKE COMMENT ERROR:", err);
    res.status(500).json({ error: "Erreur like commentaire" });
  }
};

/* ============================================================
   📌 LIKE / UNLIKE RÉPONSE
   Route : POST /posts/:postId/comment/:commentId/reply/:replyId/like
============================================================ */
exports.likeReply = async (req, res) => {
  try {
    const postId = req.params.postId || req.params.id;
    const { commentId, replyId } = req.params;
    const userId = req.userId;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post introuvable" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ error: "Commentaire introuvable" });

    const reply = comment.replies.id(replyId);
    if (!reply) return res.status(404).json({ error: "Réponse introuvable" });

    const alreadyLiked = (reply.likes || []).some(
      (u) => String(u) === String(userId)
    );

    if (alreadyLiked) {
      reply.likes = reply.likes.filter(
        (u) => String(u) !== String(userId)
      );
    } else {
      reply.likes = reply.likes || [];
      reply.likes.push(userId);
    }

    await post.save();

    const updated = await Post.findById(postId)
      .populate("user", "name email avatar avatarColor")
      .populate("comments.user", "name email avatar avatarColor")
      .populate("comments.replies.user", "name email avatar avatarColor");

    getIO().emit("post:update", updated);

    res.json(updated);
  } catch (err) {
    console.error("LIKE REPLY ERROR:", err);
    res.status(500).json({ error: "Erreur like réponse" });
  }
};

/* ============================================================
   📌 RÉACTION SUR COMMENTAIRE (👍❤️😂😮😢😡)
   Route : POST /posts/:postId/comment/:commentId/react
   body: { type: "like" | "love" | ... }
============================================================ */
exports.reactToComment = async (req, res) => {
  try {
    const postId = req.params.postId || req.params.id;
    const { commentId } = req.params;
    const userId = req.userId;
    const { type } = req.body;

    if (!VALID_REACTIONS.includes(type)) {
      return res.status(400).json({ error: "Type de réaction invalide" });
    }

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post introuvable" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ error: "Commentaire introuvable" });

    comment.reactions = comment.reactions || [];

    // retirer ancienne réaction du user (s'il y en a une)
    comment.reactions = comment.reactions.filter(
      (r) => String(r.user) !== String(userId)
    );

    // si on veut "enlever" la réaction : on ne remet rien
    if (type) {
      comment.reactions.push({ user: userId, type });
    }

    await post.save();

    const updated = await Post.findById(postId)
      .populate("user", "name email avatar avatarColor")
      .populate("comments.user", "name email avatar avatarColor")
      .populate("comments.replies.user", "name email avatar avatarColor");

    getIO().emit("post:update", updated);

    res.json(updated);
  } catch (err) {
    console.error("REACT COMMENT ERROR:", err);
    res.status(500).json({ error: "Erreur réaction commentaire" });
  }
};

/* ============================================================
   📌 RÉACTION SUR RÉPONSE
   Route : POST /posts/:postId/comment/:commentId/reply/:replyId/react
============================================================ */
exports.reactToReply = async (req, res) => {
  try {
    const postId = req.params.postId || req.params.id;
    const { commentId, replyId } = req.params;
    const userId = req.userId;
    const { type } = req.body;

    if (!VALID_REACTIONS.includes(type)) {
      return res.status(400).json({ error: "Type de réaction invalide" });
    }

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post introuvable" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ error: "Commentaire introuvable" });

    const reply = comment.replies.id(replyId);
    if (!reply) return res.status(404).json({ error: "Réponse introuvable" });

    reply.reactions = reply.reactions || [];

    reply.reactions = reply.reactions.filter(
      (r) => String(r.user) !== String(userId)
    );

    if (type) {
      reply.reactions.push({ user: userId, type });
    }

    await post.save();

    const updated = await Post.findById(postId)
      .populate("user", "name email avatar avatarColor")
      .populate("comments.user", "name email avatar avatarColor")
      .populate("comments.replies.user", "name email avatar avatarColor");

    getIO().emit("post:update", updated);

    res.json(updated);
  } catch (err) {
    console.error("REACT REPLY ERROR:", err);
    res.status(500).json({ error: "Erreur réaction réponse" });
  }
};

/* ============================================================
   📌 SUPPRIMER COMMENTAIRE
============================================================ */
exports.deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post introuvable" });

    const comment = post.comments.id(commentId);
    if (!comment)
      return res.status(404).json({ error: "Commentaire introuvable" });

    if (
      String(comment.user) !== String(req.userId) &&
      String(post.user) !== String(req.userId)
    ) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    comment.deleteOne();
    await post.save();

    const updated = await Post.findById(postId)
      .populate("user", "name email avatar avatarColor")
      .populate("comments.user", "name email avatar avatarColor")
      .populate("comments.replies.user", "name email avatar avatarColor");

    getIO().emit("post:update", updated);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Erreur suppression commentaire" });
  }
};

/* ============================================================
   📌 SUPPRIMER RÉPONSE
============================================================ */
exports.deleteReply = async (req, res) => {
  try {
    const { postId, commentId, replyId } = req.params;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post introuvable" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ error: "Commentaire introuvable" });

    const reply = comment.replies.id(replyId);
    if (!reply) return res.status(404).json({ error: "Réponse introuvable" });

    if (
      String(reply.user) !== String(req.userId) &&
      String(post.user) !== String(req.userId)
    ) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    reply.deleteOne();
    await post.save();

    const updated = await Post.findById(postId)
      .populate("user", "name email avatar avatarColor")
      .populate("comments.user", "name email avatar avatarColor")
      .populate("comments.replies.user", "name email avatar avatarColor");

    getIO().emit("post:update", updated);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Erreur suppression réponse" });
  }
};

/* ============================================================
   📌 SUPPRIMER UN POST
============================================================ */
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ error: "Post introuvable" });

    if (String(post.user) !== String(req.userId)) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    if (Array.isArray(post.media)) {
      post.media.forEach((m) => {
        const filePath = path.join(__dirname, "..", m.url);
        fs.unlink(filePath, () => {});
      });
    }

    await Post.findByIdAndDelete(id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur suppression post" });
  }
};

/* ============================================================
   📌 PUBLICATIONS D’UN UTILISATEUR
============================================================ */
exports.getPostsByUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const posts = await Post.find({ user: userId })
      .populate("user", "name email avatar avatarColor")
      .populate("comments.user", "name email avatar avatarColor")
      .populate("comments.replies.user", "name email avatar avatarColor")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: "Erreur chargement publications" });
  }
};