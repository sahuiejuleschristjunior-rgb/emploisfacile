const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/notificationController");

// 1. Lister les notifications
router.get("/", auth, ctrl.getNotifications);

// 2. Marquer toutes comme lues
router.put("/read-all", auth, ctrl.markAllAsRead);

// 3. Compter les non lues
router.get("/unread/count", auth, ctrl.countUnread);

module.exports = router;
