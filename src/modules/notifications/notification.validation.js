const Joi = require("joi");

const validationOptions = {
  abortEarly: false,
  stripUnknown: true,
};

const listNotificationsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().trim().lowercase().valid("all", "read", "unread", "archived").default("all"),
  type: Joi.string().trim().max(80).allow("", null).optional(),
});

const notificationIdSchema = Joi.number().integer().positive().required();

const formatErrors = (error) => {
  return error ? error.details.map((detail) => detail.message) : [];
};

const validateListNotificationsQuery = (query) => {
  const { error } = listNotificationsSchema.validate(query, validationOptions);
  return formatErrors(error);
};

const normalizeListNotificationsQuery = (query = {}) => {
  const { value } = listNotificationsSchema.validate(query, validationOptions);

  return {
    page: value.page,
    limit: value.limit,
    status: value.status,
    type: value.type || null,
  };
};

const validateNotificationId = (id) => {
  const { error } = notificationIdSchema.validate(Number(id), validationOptions);
  return formatErrors(error);
};

module.exports = {
  validateListNotificationsQuery,
  normalizeListNotificationsQuery,
  validateNotificationId,
};
