const Joi = require("joi");

const createRoomSchema = Joi.object({
  room_type_id: Joi.number().required(),

  room_name: Joi.string().required(),

  description: Joi.string().allow("", null),

  price_per_night: Joi.number().positive().required(),

  max_guests: Joi.number().integer().positive().required(),

  total_rooms: Joi.number().integer().positive().required(),

  floor_number: Joi.number().integer().positive().allow(null).messages({
    "number.integer": "Floor number must be an integer",
    "number.positive": "Floor number must be a positive number",
  }),
});

const updateRoomSchema = Joi.object({
  room_type_id: Joi.number(),

  room_name: Joi.string(),

  description: Joi.string().allow("", null),

  price_per_night: Joi.number().positive(),

  max_guests: Joi.number().integer().positive(),

  total_rooms: Joi.number().integer().positive(),

  floor_number: Joi.number().integer().positive().allow(null).messages({
    "number.integer": "Floor number must be an integer",
    "number.positive": "Floor number must be a positive number",
  }),
});

module.exports = {
  createRoomSchema,
  updateRoomSchema,
};
