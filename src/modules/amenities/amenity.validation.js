const Joi = require("joi");

const updatePropertyAmenitiesSchema =
    Joi.object({
        amenity_ids: Joi.array()
            .items(
                Joi.number()
                    .integer()
                    .positive()
            )
            .required()
    });

module.exports = {
    updatePropertyAmenitiesSchema
};