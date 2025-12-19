require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const net = require("net");

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
const DESIRED_PORT = Number(process.env.PORT) || 4000;

const findAvailablePort = async (port) =>
  new Promise((resolve, reject) => {
    const tester = net
      .createServer()
      .once("error", (err) => {
        if (err.code === "EADDRINUSE") {
          resolve(findAvailablePort(port + 1));
          return;
        }

        reject(err);
      })
      .once("listening", () => {
        tester.close(() => resolve(port));
      })
      .listen(port);
  });

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
    console.error(`❌ Port ${DESIRED_PORT} already in use. Set PORT env to use a different port.`);
    process.exit(1);
  }

  throw err;
});

/* ============================================================
   START SERVER
============================================================ */
db.connect()
  .then(async () => {
    const port = await findAvailablePort(DESIRED_PORT);

    if (port !== DESIRED_PORT) {
      console.warn(
        `⚠️  Port ${DESIRED_PORT} unavailable. Using available port ${port} instead. Set PORT to a free port to silence this warning.`
      );
    }

    server.listen(port, () => console.log("✔ Backend ON PORT", port));
  })
  .catch((err) => {
    console.error("❌ DB ERROR :", err);
    process.exit(1);
  });