const asyncHandler = require("../../utils/asyncHandler");
const { successResponse, errorResponse } = require("../../utils/apiResponse");
const chatValidation = require("./chat.validation");
const chatService = require("./chat.service");

const createConversation = asyncHandler(async (req, res) => {
  const { error, value } = chatValidation.createConversation.validate(req.body);

  if (error) {
    return errorResponse(res, "Validation failed", 400, error.details.map((e) => e.message));
  }

  const conversation = await chatService.createConversation(
    req.user.id,
    req.user.role,
    value
  );

  return successResponse(res, "Conversation created successfully", conversation, 201);
});

const getMyConversations = asyncHandler(async (req, res) => {
  const conversations = await chatService.getMyConversations(req.user.id);

  return successResponse(res, "Conversations retrieved successfully", conversations);
});

const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  if (!conversationId || isNaN(Number(conversationId))) {
    return errorResponse(res, "Invalid conversation ID", 400);
  }

  const messages = await chatService.getMessages(
    Number(conversationId),
    req.user.id
  );

  return successResponse(res, "Messages retrieved successfully", messages);
});

const markAsRead = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  if (!conversationId || isNaN(Number(conversationId))) {
    return errorResponse(res, "Invalid conversation ID", 400);
  }

  const result = await chatService.markAsRead(
    Number(conversationId),
    req.user.id
  );

  return successResponse(res, "Messages marked as read", result);
});

const sendMessage = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  if (!conversationId || isNaN(Number(conversationId))) {
    return errorResponse(res, "Invalid conversation ID", 400);
  }

  const hasImage = !!req.file;
  const hasText = !!req.body.message_body;

  // Must have at least one: image or text
  if (!hasImage && !hasText) {
    return errorResponse(res, "Either image or message text is required", 400);
  }

  const imageUrl = hasImage ? `/uploads/chats/${req.file.filename}` : null;
  const messageBody = req.body.message_body || null;

  const message = await chatService.sendMessage(Number(conversationId), req.user.id, {
    message_body: messageBody,
    attachment_url: imageUrl,
  });

  // Emit real-time event to conversation room
  const io = req.app.get("io");
  if (io) {
    io.to(`conversation_${conversationId}`).emit("new-message", message);
  }

  return successResponse(res, "Message sent successfully", message, 201);
});

const startConversationFromProperty = asyncHandler(async (req, res) => {
  const { propertyId } = req.params;

  if (!propertyId || isNaN(Number(propertyId))) {
    return errorResponse(res, "Invalid property ID", 400);
  }

  const conversation = await chatService.startConversationFromProperty(
    req.user.id,
    req.user.role,
    Number(propertyId)
  );

  return successResponse(res, "Conversation created successfully", conversation, 201);
});

const startConversationFromReservation = asyncHandler(async (req, res) => {
  const { reservationId } = req.params;

  if (!reservationId || isNaN(Number(reservationId))) {
    return errorResponse(res, "Invalid reservation ID", 400);
  }

  const conversation = await chatService.startConversationFromReservation(
    req.user.id,
    req.user.role,
    Number(reservationId)
  );

  return successResponse(res, "Conversation created successfully", conversation, 201);
});

const unsendMessage = asyncHandler(async (req, res) => {
  const { conversationId, messageId } = req.params;

  if (!conversationId || isNaN(Number(conversationId)) || !messageId || isNaN(Number(messageId))) {
    return errorResponse(res, "Invalid IDs", 400);
  }

  const result = await chatService.unsendMessage(
    Number(conversationId),
    Number(messageId),
    req.user.id
  );

  // Emit real-time event to conversation room
  const io = req.app.get("io");
  if (io) {
    io.to(`conversation_${conversationId}`).emit("message-unsent", {
      conversationId: Number(conversationId),
      messageId: Number(messageId),
    });
  }

  return successResponse(res, "Message unsent successfully", result);
});

module.exports = {
  createConversation,
  getMyConversations,
  getMessages,
  sendMessage,
  markAsRead,
  startConversationFromProperty,
  startConversationFromReservation,
  unsendMessage,
};