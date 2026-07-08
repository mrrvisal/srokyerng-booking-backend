const Joi = require("joi");

const createConversation = Joi.object({
  property_id: Joi.number().integer().positive().optional(),
  reservation_id: Joi.number().integer().positive().optional(),
  initial_message: Joi.string().min(1).max(2000).required(),
});

const sendMessage = Joi.object({
  message_body: Joi.string().min(1).max(2000).optional(),
  attachment_url: Joi.string().uri().optional(),
});

module.exports = {
  createConversation,
  sendMessage,
};