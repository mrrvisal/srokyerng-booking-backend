const Joi = require("joi");

const createReportSchema = Joi.object({
  report_type: Joi.string()
    .valid(
      "reservation_issue",
      "payment_issue",
      "property_issue",
      "owner_issue",
      "customer_issue",
      "review_issue",
      "other"
    )
    .required(),

  subject: Joi.string().min(3).max(150).required(),

  description: Joi.string().min(10).required(),

  property_id: Joi.number().integer().positive(),

  reservation_id: Joi.number().integer().positive(),

  payment_id: Joi.number().integer().positive(),
});

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid("open", "in_review", "resolved", "rejected", "closed")
    .required(),
});

const resolveReportSchema = Joi.object({
  resolution_note: Joi.string().trim().min(1).max(1000).required(),
});

module.exports = {
  createReportSchema,
  updateStatusSchema,
  resolveReportSchema,
};
