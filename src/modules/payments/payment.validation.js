const Joi = require("joi");

// ─── Create Payment ───────────────────────────────────────────────
const createPaymentSchema = Joi.object({
  reservation_id: Joi.number().integer().positive().required().messages({
    "any.required": "Reservation ID is required",
    "number.base": "Reservation ID must be a number",
    "number.positive": "Reservation ID must be positive",
  }),
  payment_method_id: Joi.number().integer().positive().required().messages({
    "any.required": "Payment method ID is required",
    "number.base": "Payment method ID must be a number",
    "number.positive": "Payment method ID must be positive",
  }),
  owner_payment_account_id: Joi.number().integer().positive().optional().messages({
    "number.base": "Owner payment account ID must be a number",
    "number.positive": "Owner payment account ID must be positive",
  }),
  transaction_reference: Joi.string().trim().max(255).allow("", null).optional(),
});

// ─── Admin Verify / Reject / Refund ──────────────────────────────
const verifyPaymentSchema = Joi.object({
  notes: Joi.string().trim().max(500).allow("", null).optional(),
});

const rejectPaymentSchema = Joi.object({
  rejection_reason: Joi.string().trim().min(1).max(500).required().messages({
    "any.required": "Rejection reason is required",
    "string.empty": "Rejection reason cannot be empty",
    "string.min": "Rejection reason cannot be empty",
  }),
});

const refundPaymentSchema = Joi.object({
  notes: Joi.string().trim().max(500).allow("", null).optional(),
});

const createOwnerPaymentAccountSchema = Joi.object({
  payment_method_id: Joi.number().integer().positive().required().messages({
    "any.required": "Payment method ID is required",
    "number.base": "Payment method ID must be a number",
    "number.positive": "Payment method ID must be positive",
  }),
  account_name: Joi.string().trim().min(1).max(150).required().messages({
    "any.required": "Account name is required",
    "string.empty": "Account name is required",
  }),
  account_number: Joi.string().trim().max(100).allow("", null).optional(),
});

const updateOwnerPaymentAccountSchema = Joi.object({
  payment_method_id: Joi.number().integer().positive().optional().messages({
    "number.base": "Payment method ID must be a number",
    "number.positive": "Payment method ID must be positive",
  }),
  account_name: Joi.string().trim().min(1).max(150).optional().messages({
    "string.empty": "Account name cannot be empty",
  }),
  account_number: Joi.string().trim().max(100).allow("", null).optional(),
});

// ─── Allowed status transitions ────────────────────────────────────
// pending   → submitted (customer uploads receipt)
// submitted → paid      (admin verify)
// submitted → failed    (admin reject)
// paid      → refunded  (admin refund)
const ALLOWED_TRANSITIONS = {
  pending: ["submitted"],
  submitted: ["paid", "failed"],
  paid: ["refunded"],
  failed: ["submitted"],
  refunded: [],
};

const isValidTransition = (from, to) => {
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
};

// ─── Helpers ──────────────────────────────────────────────────────
const validationOptions = { abortEarly: false, stripUnknown: true };

const formatErrors = (joiError) =>
  joiError ? joiError.details.map((d) => d.message) : [];

const validateCreatePayment = (body) => {
  const { error, value } = createPaymentSchema.validate(body, validationOptions);
  return { errors: formatErrors(error), value: error ? null : value };
};

const validateVerifyPayment = (body) => {
  const { error, value } = verifyPaymentSchema.validate(body, validationOptions);
  return { errors: formatErrors(error), value: error ? null : value };
};

const validateRejectPayment = (body) => {
  const { error, value } = rejectPaymentSchema.validate(body, validationOptions);
  return { errors: formatErrors(error), value: error ? null : value };
};

const validateRefundPayment = (body) => {
  const { error, value } = refundPaymentSchema.validate(body, validationOptions);
  return { errors: formatErrors(error), value: error ? null : value };
};

const validateCreateOwnerPaymentAccount = (body) => {
  const { error, value } = createOwnerPaymentAccountSchema.validate(body, validationOptions);
  return { errors: formatErrors(error), value: error ? null : value };
};

const validateUpdateOwnerPaymentAccount = (body) => {
  const { error, value } = updateOwnerPaymentAccountSchema.validate(body, validationOptions);
  return { errors: formatErrors(error), value: error ? null : value };
};

module.exports = {
  validateCreatePayment,
  validateVerifyPayment,
  validateRejectPayment,
  validateRefundPayment,
  validateCreateOwnerPaymentAccount,
  validateUpdateOwnerPaymentAccount,
  isValidTransition,
  ALLOWED_TRANSITIONS,
};
