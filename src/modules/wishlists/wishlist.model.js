const pool = require("../../config/db");

const createWishlist = async (customerId, propertyId) => {
  const [rows] = await pool.query(
    `
    INSERT INTO wishlists (
      customer_id,
      property_id
    )
    VALUES (?, ?)
    `,
    [customerId, propertyId]
  );

  return rows;
};

const getWishlist = async (customerId, propertyId) => {
  const [rows] = await pool.query(
    `
    SELECT *
    FROM wishlists
    WHERE customer_id = ?
    AND property_id = ?
    `,
    [customerId, propertyId]
  );

  return rows[0];
};

const deleteWishlist = async (customerId, propertyId) => {
  const [rows] = await pool.query(
    `
    DELETE FROM wishlists
    WHERE customer_id = ?
    AND property_id = ?
    `,
    [customerId, propertyId]
  );

  return rows;
};

const getMyWishlists = async (customerId) => {
  const [rows] = await pool.query(
    `
    SELECT
      w.id,
      w.created_at,

      p.id AS property_id,
      p.property_name,
      p.latitude,
      p.longitude,
      city.name AS city,
      province.name AS province,

      (
        SELECT image_url
        FROM property_images
        WHERE property_id = p.id
        AND is_cover = TRUE
        LIMIT 1
      ) AS cover_image,

      (
        SELECT MIN(price_per_night)
        FROM rooms
        WHERE property_id = p.id
        AND deleted_at IS NULL
      ) AS price_per_night,

      (
        SELECT AVG(rating)
        FROM reviews
        WHERE property_id = p.id
        AND deleted_at IS NULL
      ) AS average_rating

    FROM wishlists w

    JOIN properties p
      ON p.id = w.property_id

    JOIN property_statuses ps
      ON ps.id = p.status_id

    LEFT JOIN cities city
      ON p.city_id = city.id

    LEFT JOIN provinces province
      ON city.province_id = province.id

    WHERE w.customer_id = ?
    AND p.deleted_at IS NULL
    AND ps.status_name = 'approved'

    ORDER BY w.created_at DESC
    `,
    [customerId]
  );

  return rows;
};

const getApprovedPropertyById = async (propertyId) => {
  const [rows] = await pool.query(
    `
    SELECT p.*
    FROM properties p

    JOIN property_statuses ps
      ON ps.id = p.status_id

    WHERE p.id = ?
    AND p.deleted_at IS NULL
    AND ps.status_name = 'approved'
    `,
    [propertyId]
  );

  return rows[0];
};

module.exports = {
  createWishlist,
  getWishlist,
  deleteWishlist,
  getMyWishlists,
  getApprovedPropertyById,
};
