// socket.js
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io = null;

/* ============================================================
   FONCTION GLOBALE POUR ENVOYER UNE NOTIFICATION
============================================================ */
function sendNotification(userId, notification) {
  if (!io) return;
  io.to(String(userId)).emit("notification", {
    ...notification,
    createdAt: new Date(),
  });
}

/* ============================================================
   INITIALISATION SOCKET.IO
============================================================ */
function initSocket(server) {
  const FRONTEND_ORIGIN = process.env.FRONTEND_URL || "*";

  io = new Server(server, {
    cors: {
      origin: FRONTEND_ORIGIN,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    },

    // 🔥 ROUTE EXPLICITE POUR MATCHER AVEC NGINX
    path: "/socket.io/",

    // important : accepter polling puis websocket (upgrade)
    transports: ["polling", "websocket"],

    pingInterval: 25000,
    pingTimeout: 60000,
  });

  /* ============================================================
     AUTH AVEC TOKEN (middleware)
============================================================ */
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        const err = new Error("Token obligatoire");
        err.data = { code: "NO_TOKEN" };
        return next(err);
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      return next();
    } catch (err) {
      const error = new Error("Token invalide");
      error.data = { code: "INVALID_TOKEN" };
      return next(error);
    }
  });

  /* ============================================================
     SOCKET.IO CONNECTÉ
============================================================ */
  io.on("connection", (socket) => {
    const userId = socket.userId;
    socket.join(String(userId));

    console.log("🔌 Socket connecté :", userId, "| ID :", socket.id);

    /* ============================================================
       MESSAGES — TEMPS RÉÉL
    ============================================================ */
    socket.on("send_message", ({ receiver, content, type }) => {
      if (!receiver || !content) return;

      const payload = {
        sender: userId,
        receiver,
        content,
        type: type || "text",
        createdAt: new Date(),
      };

      io.to(String(receiver)).emit("new_message", payload);
      io.to(String(userId)).emit("new_message", payload);

      sendNotification(receiver, {
        type: "message",
        from: userId,
        text: "Vous avez reçu un nouveau message",
      });
    });

    /* ============================================================
       TYPING
    ============================================================ */
    socket.on("typing", ({ to, isTyping = true }) => {
      if (!to) return;
      io.to(String(to)).emit("typing", { from: userId, isTyping });
    });

    /* ============================================================
       READ RECEIPTS
    ============================================================ */
    socket.on("messages_read", ({ readerId, withUserId }) => {
      if (!withUserId) return;

      io.to(String(withUserId)).emit("messages_read_update", {
        readerId,
        withUserId,
        readAt: new Date(),
      });
    });

    /* ============================================================
       AMIS - TEMPS RÉEL
    ============================================================ */
    socket.on("friend_request", ({ to }) => {
      if (!to) return;
      sendNotification(to, {
        type: "friend_request",
        from: userId,
        text: "Vous avez reçu une demande d’amitié",
      });
    });

    socket.on("friend_accept", ({ to }) => {
      if (!to) return;
      sendNotification(to, {
        type: "friend_accept",
        from: userId,
        text: "Votre demande d’amitié a été acceptée",
      });
    });

    socket.on("friend_reject", ({ to }) => {
      if (!to) return;
      sendNotification(to, {
        type: "friend_reject",
        from: userId,
        text: "Votre demande d’amitié a été refusée",
      });
    });

    socket.on("friend_remove", ({ to }) => {
      if (!to) return;
      sendNotification(to, {
        type: "friend_remove",
        from: userId,
        text: "Vous n’êtes plus amis",
      });
    });

    /* ============================================================
       FOLLOW — TEMPS RÉEL
    ============================================================ */
    socket.on("follow_user", ({ to }) => {
      if (!to) return;
      sendNotification(to, {
        type: "follow",
        from: userId,
        text: "Vous avez un nouvel abonné",
      });
    });

    socket.on("unfollow_user", ({ to }) => {
      if (!to) return;
      sendNotification(to, {
        type: "unfollow",
        from: userId,
        text: "Un utilisateur s'est désabonné",
      });
    });

    /* ============================================================
       POSTS — LIKE / COMMENTAIRES
    ============================================================ */
    socket.on("post_like", ({ to, postId }) => {
      if (!to) return;
      sendNotification(to, {
        type: "post_like",
        from: userId,
        postId,
        text: "Quelqu'un aime votre publication",
      });
    });

    socket.on("post_comment", ({ to, postId }) => {
      if (!to) return;
      sendNotification(to, {
        type: "post_comment",
        from: userId,
        postId,
        text: "Quelqu'un a commenté votre publication",
      });
    });

    socket.on("post_reply", ({ to, postId }) => {
      if (!to) return;
      sendNotification(to, {
        type: "post_reply",
        from: userId,
        postId,
        text: "Quelqu'un a répondu à votre commentaire",
      });
    });

    /* ============================================================
       SIGNAUX WEBRTC
    ============================================================ */
    socket.on("call_offer", ({ to, offer }) => {
      if (!to) return;
      io.to(String(to)).emit("call_offer", { from: userId, offer });

      sendNotification(to, {
        type: "call",
        from: userId,
        text: "Appel entrant",
      });
    });

    socket.on("call_answer", ({ to, answer }) => {
      if (!to) return;
      io.to(String(to)).emit("call_answer", { from: userId, answer });
    });

    socket.on("call_ice_candidate", ({ to, candidate }) => {
      if (!to) return;
      io.to(String(to)).emit("call_ice_candidate", {
        from: userId,
        candidate,
      });
    });

    socket.on("call_hangup", ({ to }) => {
      if (!to) return;
      io.to(String(to)).emit("call_hangup", {
        from: userId,
      });
    });

    /* ============================================================
       USER STATUS
    ============================================================ */
    socket.broadcast.emit("user_online", userId);

    socket.on("disconnect", () => {
      console.log("❌ Déconnexion :", userId);
      socket.broadcast.emit("user_offline", userId);
    });
  });

  return io;
}

/* ============================================================
   EXPORTS
============================================================ */
function getIO() {
  if (!io) throw new Error("Socket.io non initialisé !");
  return io;
}

module.exports = { initSocket, getIO, sendNotification };
