const Notification = require("../models/Notification");
const { io } = require("../server");

async function createNotificationAndEmit({ userId, type, title, message, meta }) {
  const notif = await Notification.create({
    user: userId,
    type,
    title,
    message,
    meta,
  });

  io.to(userId.toString()).emit("notification", notif);

  return notif;
}

module.exports = { createNotificationAndEmit };