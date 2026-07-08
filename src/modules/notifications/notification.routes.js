const express = require("express");
const authMiddleware = require("../../middleware/auth.middleware");
const notificationController = require("./notification.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/", notificationController.listMyNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.patch("/mark-all-read", notificationController.markAllAsRead);
router.patch("/read-all", notificationController.markAllAsRead);
router.get("/:id", notificationController.getMyNotification);
router.patch("/:id/read", notificationController.markOneAsRead);
router.patch("/:id/archive", notificationController.archiveOne);

module.exports = router;
