const Joi = require("joi");

// =========================
// CREATE PROPERTY VALIDATION
// =========================
const createPropertySchema = Joi.object({
  category_id: Joi.number().integer().positive().required().messages({
    "any.required": "Category ID is required",
    "number.base": "Category ID must be a number",
    "number.integer": "Category ID must be an integer",
    "number.positive": "Category ID must be a positive number",
  }),

  property_name: Joi.string().trim().min(3).max(150).required().messages({
    "any.required": "Property name is required",
    "string.base": "Property name must be a string",
    "string.empty": "Property name cannot be empty",
    "string.min": "Property name must be at least 3 characters",
    "string.max": "Property name cannot exceed 150 characters",
  }),

  description: Joi.string().max(5000).allow(null, "").messages({
    "string.max": "Description cannot exceed 5000 characters",
  }),

  address: Joi.string().trim().min(5).max(500).required().messages({
    "any.required": "Address is required",
    "string.base": "Address must be a string",
    "string.empty": "Address cannot be empty",
    "string.min": "Address must be at least 5 characters",
    "string.max": "Address cannot exceed 500 characters",
  }),

  city_id: Joi.number().integer().positive().required().messages({
    "any.required": "City ID is required",
    "number.base": "City ID must be a number",
    "number.integer": "City ID must be an integer",
    "number.positive": "City ID must be a positive number",
  }),

  province_id: Joi.number().integer().positive().required().messages({
    "any.required": "Province ID is required",
    "number.base": "Province ID must be a number",
    "number.integer": "Province ID must be an integer",
    "number.positive": "Province ID must be a positive number",
  }),

  country_id: Joi.number().integer().positive().required().messages({
    "any.required": "Country ID is required",
    "number.base": "Country ID must be a number",
    "number.integer": "Country ID must be an integer",
    "number.positive": "Country ID must be a positive number",
  }),

  latitude: Joi.number().min(-90).max(90).allow(null).messages({
    "number.base": "Latitude must be a number",
    "number.min": "Latitude must be between -90 and 90",
    "number.max": "Latitude must be between -90 and 90",
  }),

  longitude: Joi.number().min(-180).max(180).allow(null).messages({
    "number.base": "Longitude must be a number",
    "number.min": "Longitude must be between -180 and 180",
    "number.max": "Longitude must be between -180 and 180",
  }),

  contact_phone: Joi.string()
    .trim()
    .max(30)
    .pattern(/^[+\d\s()-]+$/)
    .allow(null, "")
    .messages({
      "string.base": "Contact phone must be a string",
      "string.max": "Contact phone cannot exceed 30 characters",
      "string.pattern": "Contact phone contains invalid characters",
    }),

  contact_email: Joi.string().trim().email().max(150).allow(null, "").messages({
    "string.email": "Please provide a valid email address",
    "string.max": "Contact email cannot exceed 150 characters",
  }),

  number_of_floors: Joi.number().integer().positive().allow(null).messages({
    "number.integer": "Number of floors must be an integer",
    "number.positive": "Number of floors must be a positive number",
  }),
});

// =========================
// UPDATE PROPERTY VALIDATION
// =========================
const updatePropertySchema = Joi.object({
  category_id: Joi.number().integer().positive().messages({
    "number.base": "Category ID must be a number",
    "number.integer": "Category ID must be an integer",
    "number.positive": "Category ID must be a positive number",
  }),

  property_name: Joi.string().trim().min(3).max(150).messages({
    "string.min": "Property name must be at least 3 characters",
    "string.max": "Property name cannot exceed 150 characters",
  }),

  description: Joi.string().max(5000).allow(null, ""),

  address: Joi.string().trim().min(5).max(500),

  city_id: Joi.number().integer().positive().messages({
    "number.base": "City ID must be a number",
    "number.integer": "City ID must be an integer",
    "number.positive": "City ID must be a positive number",
  }),

  province_id: Joi.number().integer().positive().messages({
    "number.base": "Province ID must be a number",
    "number.integer": "Province ID must be an integer",
    "number.positive": "Province ID must be a positive number",
  }),

  country_id: Joi.number().integer().positive().messages({
    "number.base": "Country ID must be a number",
    "number.integer": "Country ID must be an integer",
    "number.positive": "Country ID must be a positive number",
  }),

  latitude: Joi.number().min(-90).max(90).allow(null),
  longitude: Joi.number().min(-180).max(180).allow(null),

  contact_phone: Joi.string()
    .trim()
    .max(30)
    .pattern(/^[+\d\s()-]+$/)
    .allow(null, ""),

  contact_email: Joi.string().trim().email().max(150).allow(null, ""),

  number_of_floors: Joi.number().integer().positive().allow(null),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });

// =========================
// HELPERS
// =========================
const isValidRow = (row) => {
  return Array.isArray(row) && row.length > 0;
};

const rejectUpdateRequestSchema = Joi.object({
  reason: Joi.string().trim().min(1).max(500).required().messages({
    "any.required": "Rejection reason is required",
    "string.empty": "Rejection reason cannot be empty",
    "string.max": "Rejection reason cannot exceed 500 characters",
  }),
});

module.exports = {
  createPropertySchema,
  updatePropertySchema,
  rejectUpdateRequestSchema,
  isValidRow,
};
