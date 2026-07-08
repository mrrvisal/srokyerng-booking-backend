const amenityModel = require("./amenity.model");
const db = require("../../config/db");
const AppError = require("../../utils/appError");

const getAllAmenities = async () => {

  return await amenityModel.getAllAmenities();

};

const getPropertyAmenities = async (
  propertyId
) => {

  const property =
    await amenityModel.getPropertyById(
      propertyId
    );

  if (!property) {

    throw new AppError(
      "Property not found",
      404
    );

  }

  return await amenityModel.getPropertyAmenities(
    propertyId
  );

};

const updatePropertyAmenities = async (
  userId,
  propertyId,
  amenityIds
) => {

  // 1. check property
  const property =
    await amenityModel.getPropertyById(
      propertyId
    );

  if (!property) {

    throw new AppError(
      "Property not found",
      404
    );

  }

  // 2. ownership check
  if (property.owner_id !== userId) {

    throw new AppError(
      "Forbidden",
      403
    );

  }

  // 3. remove duplicates FIRST
  const uniqueAmenityIds =
    [...new Set(amenityIds)];

  // 4. validate amenity ids
  const existingAmenities =
    await amenityModel.checkAmenitiesExist(
      uniqueAmenityIds
    );

  if (
    existingAmenities.length !==
    uniqueAmenityIds.length
  ) {

    throw new AppError(
      "One or more amenity IDs are invalid",
      400
    );

  }

  // 5. transaction
  const connection =
    await db.getConnection();

  try {

    await connection.beginTransaction();

    // clear old amenities
    await amenityModel.clearPropertyAmenities(
      connection,
      propertyId
    );

    // batch insert
    if (uniqueAmenityIds.length > 0) {

      await amenityModel.attachAmenitiesToProperty(
        connection,
        propertyId,
        uniqueAmenityIds
      );

    }

    await connection.commit();

  } catch (error) {

    await connection.rollback();

    throw error;

  } finally {

    connection.release();

  }

  // 6. return updated amenities
  return await amenityModel.getPropertyAmenities(
    propertyId
  );

};

module.exports = {
  getAllAmenities,
  getPropertyAmenities,
  updatePropertyAmenities,
};