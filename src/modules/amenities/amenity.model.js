const db = require("../../config/db");

const getAllAmenities = async () => {

    const [amenities] = await db.query(
        `
        SELECT *
        FROM amenities
        ORDER BY amenity_name ASC
        `
    );

    return amenities;

};

const getPropertyAmenities = async (
    propertyId
) => {

    const [amenities] = await db.query(
        `
        SELECT
            amenities.id,
            amenities.amenity_name,
            amenities.description
        FROM property_amenities
        JOIN amenities
            ON property_amenities.amenity_id =
               amenities.id
        WHERE property_amenities.property_id = ?
        `,
        [propertyId]
    );

    return amenities;

};

const getPropertyById = async (
    propertyId
) => {

    const [properties] = await db.query(
        `
        SELECT *
        FROM properties
        WHERE id = ?
        `,
        [propertyId]
    );

    return properties[0];

};

const checkAmenitiesExist = async (
    amenityIds
) => {

    const [amenities] = await db.query(
        `
        SELECT id
        FROM amenities
        WHERE id IN (?)
        `,
        [amenityIds]
    );

    return amenities;

};

const clearPropertyAmenities = async (
  connection,
  propertyId
) => {

  await connection.query(
    `
    DELETE FROM property_amenities
    WHERE property_id = ?
    `,
    [propertyId]
  );

};

const attachAmenitiesToProperty = async (
  connection,
  propertyId,
  amenityIds
) => {

  if (amenityIds.length === 0) {
    return;
  }

  const values = amenityIds.map(
    (amenityId) => [
      propertyId,
      amenityId
    ]
  );

  await connection.query(
    `
    INSERT INTO property_amenities (
      property_id,
      amenity_id
    )
    VALUES ?
    `,
    [values]
  );

};

module.exports = {
    getAllAmenities,
    getPropertyAmenities,
    getPropertyById,
    checkAmenitiesExist,
    clearPropertyAmenities,
    attachAmenitiesToProperty
};