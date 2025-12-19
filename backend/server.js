require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");

// DB
const db = require("./config/db");

// Routes
const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/post");
const uploadRoutes = require("./routes/upload");
const jobRoutes = require("./routes/JobRoutes");
const applicationRoutes = require("./routes/ApplicationRoutes");
const storyRoutes = require("./routes/story");
const notificationRoutes = require("./routes/notifications");
const savedJobRoutes = require("./routes/SavedJobRoutes");
const messageRoutes = require("./routes/MessageRoutes");
const pagesRoutes = require("./routes/pages");
const pagePostsRoutes = require("./routes/pagePosts");

// ⭐ SEARCH
const searchRoutes = require("./routes/SearchRoutes");

// ⭐ SOCIAL SYSTEM (amis + follow)
const socialRoutes = require("./routes/socialRoutes");

// Socket.io
const { initSocket } = require("./socket");

// Express
const app = express();
const server = http.createServer(app);
const DEFAULT_PORT = 4000;
const envPort = Number(process.env.PORT);
const definedPort = Number.isFinite(envPort) && envPort > 0 ? envPort : null;
let currentPort = definedPort || DEFAULT_PORT;

/* ============================================================
   CORS
============================================================ */
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* ============================================================
   BODY PARSER
============================================================ */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

/* ============================================================
   STATIC FILES
============================================================ */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ============================================================
   ROUTES API
============================================================ */

// Auth / User
app.use("/api/auth", authRoutes);

// Posts
app.use("/api/posts", postRoutes);

// Stories
app.use("/api/stories", storyRoutes);

// Upload
app.use("/api/upload", uploadRoutes);

// Notifications
app.use("/api/notifications", notificationRoutes);

// Jobs
app.use("/api/jobs", jobRoutes);

// Applications
app.use("/api/applications", applicationRoutes);

// Saved jobs
app.use("/api/saved-jobs", savedJobRoutes);

// Messages
app.use("/api/messages", messageRoutes);

// Search
app.use("/api/search", searchRoutes);

// ⭐ SOCIAL SYSTEM (amis + follow)
app.use("/api/social", socialRoutes);

// Pages
app.use("/api/pages", pagesRoutes);
app.use("/api/page-posts", pagePostsRoutes);

/* Simple Health Check */
app.get("/api/health", (req, res) => res.json({ ok: true }));

/* ============================================================
   SOCKET.IO
============================================================ */
initSocket(server);

/* ============================================================
   SERVER EVENTS
============================================================ */
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    if (!definedPort) {
      const fallbackPort = currentPort + 1;
      console.warn(`⚠️ Port ${currentPort} already in use. Retrying on ${fallbackPort}...`);
      currentPort = fallbackPort;
      server.listen(currentPort, () => console.log("✔ Backend ON PORT", currentPort));
      return;
    }

    console.error(`❌ Port ${currentPort} already in use. Set PORT env to use a different port.`);
    process.exit(1);
  }

  throw err;
});

/* ============================================================
   START SERVER
============================================================ */
db.connect()
  .then(() => {
    server.listen(currentPort, () => console.log("✔ Backend ON PORT", currentPort));
  })
  .catch((err) => {
    console.error("❌ DB ERROR :", err);
    process.exit(1);
  });

