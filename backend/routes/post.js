const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const postCtrl = require("../controllers/postController");

/* =====================================================
   📁 UPLOADS
===================================================== */
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, name + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
});

/* =====================================================
   📌 POSTS
===================================================== */

router.post("/", auth, upload.single("media"), postCtrl.create);
router.get("/paginated", auth, postCtrl.listPaginated);
router.get("/", auth, postCtrl.list);
router.get("/:id", auth, postCtrl.getById);
router.post("/:id/like", auth, postCtrl.toggleLike);
router.post("/:id/react", auth, postCtrl.react);
router.delete("/:id", auth, postCtrl.remove);

/* =====================================================
   💬 COMMENTAIRES
===================================================== */

router.post("/:id/comment", auth, postCtrl.comment);
router.post(
  "/:postId/comment/:commentId/reply",
  auth,
  postCtrl.reply
);

module.exports = router;