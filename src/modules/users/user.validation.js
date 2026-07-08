const Joi = require("joi");

const validationOptions = {
  abortEarly: false,
  stripUnknown: true,
};

const profileSchema = Joi.object({
  full_name: Joi.string().trim().min(1).max(100).optional().messages({
    "string.empty": "Full name cannot be empty",
    "string.min": "Full name cannot be empty",
    "string.max": "Full name cannot exceed 100 characters",
  }),
  phone: Joi.string().trim().max(30).allow("", null).optional().messages({
    "string.max": "Phone cannot exceed 30 characters",
  }),
  profile_image_url: Joi.string().trim().uri().allow("", null).optional().messages({
    "string.uri": "Profile image URL must be valid",
  }),
  gender: Joi.string()
    .trim()
    .lowercase()
    .valid("male", "female", "other")
    .allow("", null)
    .optional()
    .messages({
      "any.only": "Gender must be male, female, or other",
    }),
  date_of_birth: Joi.string()
    .trim()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .allow("", null)
    .optional()
    .messages({
      "string.pattern.base": "Date of birth must use YYYY-MM-DD format",
    }),
  address: Joi.string().trim().max(500).allow("", null).optional().messages({
    "string.max": "Address cannot exceed 500 characters",
  }),
})
  .min(1)
  .messages({
    "object.min": "At least one profile field is required",
  });

const passwordSchema = Joi.object({
  current_password: Joi.string().required().messages({
    "any.required": "Current password is required",
    "string.empty": "Current password is required",
  }),
  new_password: Joi.string().min(8).required().messages({
    "any.required": "New password is required",
    "string.empty": "New password is required",
    "string.min": "New password must be at least 8 characters",
  }),
});

const listUsersQuerySchema = Joi.object({
  role: Joi.string().trim().lowercase().valid("customer", "owner", "admin").optional(),
  status: Joi.string().trim().lowercase().valid("active", "suspended").optional(),
  search: Joi.string().trim().allow("").optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

const statusSchema = Joi.object({
  status: Joi.string()
    .trim()
    .lowercase()
    .valid("active", "suspended")
    .required()
    .messages({
      "any.required": "Status is required",
      "string.empty": "Status is required",
      "any.only": "Status must be active or suspended",
    }),
});

const formatErrors = (error) => {
  return error ? error.details.map((detail) => detail.message) : [];
};

const emptyToNull = (value) => {
  return value === "" ? null : value;
};

const normalizeProfileBody = (body = {}) => {
  const { value } = profileSchema.validate(body, validationOptions);
  const normalized = { ...value };

  ["phone", "profile_image_url", "gender", "date_of_birth", "address"].forEach(
    (field) => {
      if (Object.hasOwn(normalized, field)) {
        normalized[field] = emptyToNull(normalized[field]);
      }
    }
  );

  return normalized;
};

const normalizePasswordBody = (body = {}) => {
  const { value } = passwordSchema.validate(body, validationOptions);
  return value;
};

const normalizeListUsersQuery = (query = {}) => {
  const { value } = listUsersQuerySchema.validate(
    {
      ...query,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    },
    validationOptions
  );

  return {
    role: value.role,
    status: value.status,
    search: value.search || undefined,
    page: value.page || 1,
    limit: value.limit || 20,
  };
};

const normalizeStatusBody = (body = {}) => {
  const { value } = statusSchema.validate(body, validationOptions);
  return value;
};

const validateProfile = (body) => {
  const { error } = profileSchema.validate(body, validationOptions);
  return formatErrors(error);
};

const validatePassword = (body) => {
  const { error } = passwordSchema.validate(body, validationOptions);
  return formatErrors(error);
};

const validateListUsersQuery = (query) => {
  const { error } = listUsersQuerySchema.validate(query, validationOptions);
  return formatErrors(error);
};

const validateStatus = (body) => {
  const { error } = statusSchema.validate(body, validationOptions);
  return formatErrors(error);
};

module.exports = {
  normalizeProfileBody,
  normalizePasswordBody,
  normalizeListUsersQuery,
  normalizeStatusBody,
  validateProfile,
  validatePassword,
  validateListUsersQuery,
  validateStatus,
};
