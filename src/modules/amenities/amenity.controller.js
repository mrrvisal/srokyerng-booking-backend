const amenityService = require(
  "./amenity.service"
);

const {
  updatePropertyAmenitiesSchema
} = require(
  "./amenity.validation"
);

const asyncHandler = require(
  "../../utils/asyncHandler"
);

const {
  successResponse,
  errorResponse
} = require(
  "../../utils/apiResponse"
);

const getAllAmenities = asyncHandler(
  async (req, res) => {

    const amenities =
      await amenityService.getAllAmenities();

    return successResponse(
      res,
      "Amenities fetched successfully",
      amenities
    );

  }
);

const getPropertyAmenities = asyncHandler(
  async (req, res) => {

    const propertyId =
      req.params.propertyId;

    const amenities =
      await amenityService.getPropertyAmenities(
        propertyId
      );

    return successResponse(
      res,
      "Property amenities fetched successfully",
      amenities
    );

  }
);

const updatePropertyAmenities = asyncHandler(
  async (req, res) => {

    // const userId = req.user.id;
    const userId = req.user?.id || null;

    const propertyId =
      req.params.propertyId;

    const { error } =
      updatePropertyAmenitiesSchema.validate(
        req.body
      );

    if (error) {

      return errorResponse(
        res,
        error.details[0].message,
        400
      );

    }

    const amenities =
      await amenityService.updatePropertyAmenities(
        userId,
        propertyId,
        req.body.amenity_ids
      );

    return successResponse(
      res,
      "Property amenities updated successfully",
      amenities
    );

  }
);

module.exports = {
  getAllAmenities,
  getPropertyAmenities,
  updatePropertyAmenities
};