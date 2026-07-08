const Joi = require("joi");

const createReviewSchema = Joi.object({
    rating: Joi.number()
        .integer()
        .min(1)
        .max(5)
        .required(),

    comment: Joi.string()
        .max(500)
        .required()
});

const updateReviewSchema = Joi.object({
    rating: Joi.number()
        .integer()
        .min(1)
        .max(5),

    comment: Joi.string()
        .max(500)
}).min(1);

const replyReviewSchema = Joi.object({
    owner_reply: Joi.string()
        .max(1000)
        .required()
});

module.exports = {
    createReviewSchema,
    updateReviewSchema,
    replyReviewSchema
};