const AppError = require("../../utils/appError");
const chatModel = require("./chat.model");
const signedFileUrl = require("../../utils/signedFileUrl");

// Chat attachments are private to the two conversation participants, so
// (like payment receipts) the URL is only ever handed out signed — see
// signedFileUrl.js for why the signature itself is the authorization.
const signAttachment = (message) =>
  message && message.attachment_url
    ? { ...message, attachment_url: signedFileUrl.sign(message.attachment_url) }
    : message;

const createConversation = async (userId, userRole, payload) => {
  const { property_id, reservation_id, initial_message } = payload;

  if (!property_id && !reservation_id) {
    throw new AppError(
      "Either property_id or reservation_id is required",
      400
    );
  }

  let ownerId = null;
  let customerId = null;

  if (reservation_id) {
    const reservation = await chatModel.findReservationById(reservation_id);

    if (!reservation) {
      throw new AppError("Reservation not found", 404);
    }

    // Check if existing conversation for this reservation
    const existingConversation =
      await chatModel.findConversationByReservation(reservation_id);
    if (existingConversation) {
      throw new AppError(
        "A conversation for this reservation already exists",
        409
      );
    }

    ownerId = reservation.owner_id;
    customerId = reservation.customer_id;

    // Only customer or owner of the reservation can start
    if (userId !== customerId && userId !== ownerId) {
      throw new AppError(
        "You are not a participant in this reservation",
        403
      );
    }
  } else if (property_id) {
    const property = await chatModel.findPropertyById(property_id);

    if (!property) {
      throw new AppError("Property not found", 404);
    }

    ownerId = property.owner_id;

    if (userRole === "customer") {
      customerId = userId;
    } else if (userRole === "owner") {
      if (userId !== ownerId) {
        throw new AppError(
          "You can only start a conversation for your own property",
          403
        );
      }
      // Owner starting conversation - need a customer context.
      // For property-based conversations without reservation, customer must start.
      throw new AppError(
        "Only customers can start conversations from a property",
        403
      );
    }

    // Check if conversation already exists for this customer+property
    if (customerId) {
      const existingConversations = await chatModel.getConversationsForUser(
        customerId
      );
      const alreadyExists = existingConversations.some(
        (c) =>
          c.property_id === Number(property_id) && c.customer_id === customerId
      );
      if (alreadyExists) {
        throw new AppError(
          "A conversation for this property already exists",
          409
        );
      }
    }
  }

  const conversationId = await chatModel.createConversation({
    property_id: property_id || null,
    reservation_id: reservation_id || null,
    customer_id: customerId,
    owner_id: ownerId,
  });

  await chatModel.createMessage({
    conversation_id: conversationId,
    sender_id: userId,
    message_body: initial_message,
    attachment_url: null,
  });

  const conversation = await chatModel.findConversationById(conversationId);

  return conversation;
};

const getMyConversations = async (userId) => {
  const conversations = await chatModel.getConversationsForUser(userId);
  return conversations;
};

const getMessages = async (conversationId, userId) => {
  const conversation = await chatModel.findConversationById(conversationId);

  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  if (
    conversation.customer_id !== userId &&
    conversation.owner_id !== userId
  ) {
    throw new AppError(
      "You do not have access to this conversation",
      403
    );
  }

  const messages = await chatModel.getMessagesByConversationId(conversationId);
  return messages.map(signAttachment);
};

const sendMessage = async (conversationId, userId, payload) => {
  const conversation = await chatModel.findConversationById(conversationId);

  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  if (
    conversation.customer_id !== userId &&
    conversation.owner_id !== userId
  ) {
    throw new AppError(
      "You do not have access to this conversation",
      403
    );
  }

  const messageId = await chatModel.createMessage({
    conversation_id: conversationId,
    sender_id: userId,
    message_body: payload.message_body || null,
    attachment_url: payload.attachment_url || null,
  });

  await chatModel.updateConversationLastMessage(conversationId);

  const messages = await chatModel.getMessagesByConversationId(conversationId);
  const message = messages.find((m) => m.id === messageId) || messages[messages.length - 1];
  return signAttachment(message);
};

const markAsRead = async (conversationId, userId) => {
  const conversation = await chatModel.findConversationById(conversationId);

  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  if (
    conversation.customer_id !== userId &&
    conversation.owner_id !== userId
  ) {
    throw new AppError(
      "You do not have access to this conversation",
      403
    );
  }

  const affectedRows = await chatModel.markMessagesAsRead(
    conversationId,
    userId
  );

  return { marked_read: affectedRows };
};

const startConversationFromProperty = async (userId, userRole, propertyId) => {
  if (userRole !== "customer") {
    throw new AppError("Only customers can start conversations from a property", 403);
  }

  const property = await chatModel.findPropertyById(propertyId);

  if (!property) {
    throw new AppError("Property not found", 404);
  }

  // Check if conversation already exists
  const existingConversations = await chatModel.getConversationsForUser(userId);
  const alreadyExists = existingConversations.some(
    (c) =>
      c.property_id === Number(propertyId) && c.customer_id === userId
  );
  if (alreadyExists) {
    throw new AppError("A conversation for this property already exists", 409);
  }

  const conversationId = await chatModel.createConversation({
    property_id: propertyId,
    reservation_id: null,
    customer_id: userId,
    owner_id: property.owner_id,
  });

  const conversation = await chatModel.findConversationById(conversationId);
  return conversation;
};

const startConversationFromReservation = async (
  userId,
  userRole,
  reservationId
) => {
  const reservation = await chatModel.findReservationById(reservationId);

  if (!reservation) {
    throw new AppError("Reservation not found", 404);
  }

  const ownerId = reservation.owner_id;
  const customerId = reservation.customer_id;

  if (userId !== customerId && userId !== ownerId) {
    throw new AppError(
      "You are not a participant in this reservation",
      403
    );
  }

  const existingConversation =
    await chatModel.findConversationByReservation(reservationId);
  if (existingConversation) {
    throw new AppError(
      "A conversation for this reservation already exists",
      409
    );
  }

  const conversationId = await chatModel.createConversation({
    property_id: null,
    reservation_id: reservationId,
    customer_id: customerId,
    owner_id: ownerId,
  });

  const conversation = await chatModel.findConversationById(conversationId);
  return conversation;
};

const unsendMessage = async (conversationId, messageId, userId) => {
  const conversation = await chatModel.findConversationById(conversationId);

  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  if (
    conversation.customer_id !== userId &&
    conversation.owner_id !== userId
  ) {
    throw new AppError(
      "You do not have access to this conversation",
      403
    );
  }

  const message = await chatModel.findMessageById(messageId);
  if (!message) {
    throw new AppError("Message not found", 404);
  }

  if (message.sender_id !== userId) {
    throw new AppError("You can only unsend your own messages", 403);
  }

  await chatModel.deleteMessage(messageId);
  await chatModel.updateConversationLastMessage(conversationId);

  return { messageId };
};

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