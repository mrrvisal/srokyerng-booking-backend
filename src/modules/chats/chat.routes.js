const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const role = require("../../constants/roles");
const upload = require("../../middleware/upload.middleware");

const chatController = require("./chat.controller");

const router = express.Router();

// Both customer and owner can access chat endpoints
const chatAuth = [authMiddleware, roleMiddleware(role.CUSTOMER, role.OWNER)];

// GET /api/chats - List conversations for current user
router.get("/", ...chatAuth, chatController.getMyConversations);

// POST /api/chats - Create a new conversation
router.post("/", ...chatAuth, chatController.createConversation);

// GET /api/chats/:conversationId/messages - Get message history
router.get(
  "/:conversationId/messages",
  ...chatAuth,
  chatController.getMessages
);

// POST /api/chats/:conversationId/messages - Send a text message
router.post(
  "/:conversationId/messages",
  ...chatAuth,
  upload.chatImage,
  chatController.sendMessage
);

// DELETE /api/chats/:conversationId/messages/:messageId - Unsend a message
router.delete(
  "/:conversationId/messages/:messageId",
  ...chatAuth,
  chatController.unsendMessage
);

// PATCH /api/chats/:conversationId/read - Mark messages as read
router.patch(
  "/:conversationId/read",
  ...chatAuth,
  chatController.markAsRead
);

module.exports = router;
