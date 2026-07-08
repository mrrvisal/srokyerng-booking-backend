const pool = require("../../config/db");

let sql = "";

const getAllCategories = async () => {
  let sql = `
    SELECT
      id,
      category_name,
      description,
      created_at,
      updated_at
    FROM categories
    ORDER BY id ASC
  `;
  const [rows] = await pool.query(sql);
  return rows;
};

const getAllApproved = async (filters = {}) => {
  let sql = `
    SELECT
      p.id,
      p.property_name,
      p.description,
      p.number_of_floors,
      p.latitude,
      p.longitude,

      p.category_id,
      c.category_name,

      city.id AS city_id,
      city.name AS city_name,

      province.id AS province_id,
      province.name AS province_name,

      country.id AS country_id,
      country.name AS country_name,

      pi.image_url,

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

    FROM properties p

    JOIN property_statuses ps
      ON p.status_id = ps.id

    JOIN categories c
      ON p.category_id = c.id

    JOIN cities city
      ON p.city_id = city.id

    JOIN provinces province
      ON city.province_id = province.id

    JOIN countries country
      ON province.country_id = country.id

    LEFT JOIN property_images pi
      ON p.id = pi.property_id
      AND pi.is_cover = TRUE

    WHERE ps.status_name = 'approved'
      AND p.deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM rooms r 
        WHERE r.property_id = p.id 
        AND r.deleted_at IS NULL
      )
  `;

  const params = [];

  if (filters.city_id) {
    sql += ` AND city.id = ?`;
    params.push(filters.city_id);
  }

  if (filters.province_id) {
    sql += ` AND province.id = ?`;
    params.push(filters.province_id);
  }

  if (filters.category_id) {
    sql += ` AND p.category_id = ?`;
    params.push(filters.category_id);
  }

  if (filters.search) {
    sql += ` AND p.property_name LIKE ?`;
    params.push(`%${filters.search}%`);
  }

  sql += `
    GROUP BY
      p.id,
      p.property_name,
      p.description,
      p.number_of_floors,
      p.category_id,
      c.category_name,
      city.id,
      city.name,
      province.id,
      province.name,
      country.id,
      country.name,
      pi.image_url
  `;

  sql += ` ORDER BY p.created_at DESC`;

  if (filters.limit && filters.page) {
    const limit = parseInt(filters.limit);
    const page = parseInt(filters.page);
    const offset = (page - 1) * limit;

    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);
  }

  const [rows] = await pool.query(sql, params);
  return rows;
};

const getAll = async (filters = {}) => {
  let sql = `
    SELECT 
      p.id,
      p.property_name,
      p.description,
      p.address,
      p.latitude,
      p.longitude,
      p.number_of_floors,

      -- Owner
      u.id AS owner_id,
      u.full_name AS owner_name,
      u.email AS owner_email,
      u.phone AS owner_phone,

      -- Category
      c.id AS category_id,
      c.category_name,

      -- Status
      ps.id AS status_id,
      ps.status_name,

      -- Location
      city.id AS city_id,
      city.name AS city_name,

      province.id AS province_id,
      province.name AS province_name,

      country.id AS country_id,
      country.name AS country_name,

      -- Cover image
      pi.image_url,

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
      ) AS average_rating,

      (
        SELECT COUNT(*)
        FROM rooms
        WHERE property_id = p.id
        AND deleted_at IS NULL
      ) AS room_count,

      -- Approval
      p.rejection_reason,
      p.approved_by,
      p.approved_at,

      -- Time
      p.created_at,
      p.updated_at,
      p.deleted_at

    FROM properties p

    JOIN users u ON p.owner_id = u.id
    JOIN categories c ON p.category_id = c.id
    JOIN property_statuses ps ON p.status_id = ps.id

    LEFT JOIN cities city ON p.city_id = city.id
    LEFT JOIN provinces province ON city.province_id = province.id
    LEFT JOIN countries country ON province.country_id = country.id

    LEFT JOIN property_images pi 
      ON p.id = pi.property_id AND pi.is_cover = TRUE

    WHERE 1=1
  `;

  const params = [];

  // ======================
  // FILTERS
  // ======================

  if (filters.city_id) {
    sql += ` AND city.id = ?`;
    params.push(filters.city_id);
  }

  if (filters.province_id) {
    sql += ` AND province.id = ?`;
    params.push(filters.province_id);
  }

  if (filters.country_id) {
    sql += ` AND country.id = ?`;
    params.push(filters.country_id);
  }

  if (filters.category_id) {
    sql += ` AND p.category_id = ?`;
    params.push(filters.category_id);
  }

  if (filters.status_id) {
    sql += ` AND p.status_id = ?`;
    params.push(filters.status_id);
  }

  if (filters.search) {
    sql += ` AND p.property_name LIKE ?`;
    params.push(`%${filters.search}%`);
  }

  // ======================
  // ORDER
  // ======================
  sql += ` ORDER BY p.created_at DESC`;

  // ======================
  // PAGINATION
  // ======================
  if (filters.limit && filters.page) {
    const limit = parseInt(filters.limit);
    const page = parseInt(filters.page);
    const offset = (page - 1) * limit;

    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);
  }

  const [rows] = await pool.query(sql, params);
  return rows;
};

const getById = async (id) => {
  const sql = `
    SELECT 
      p.id,
      p.property_name,
      NULL AS slug,
      p.description,
      p.address,
      p.latitude,
      p.longitude,
      p.contact_phone,
      p.contact_email,
      p.number_of_floors,
      p.created_at,
      p.rejection_reason,

      ps.id AS status_id,
      ps.status_name,

      u.id AS owner_id,
      u.full_name AS owner_name,
      u.email AS owner_email,

      c.id AS category_id,
      c.category_name,

      city.id AS city_id,
      city.name AS city_name,

      pr.id AS province_id,
      pr.name AS province_name,

      co.id AS country_id,
      co.name AS country_name

    FROM properties p

    JOIN property_statuses ps ON p.status_id = ps.id
    JOIN users u ON p.owner_id = u.id
    JOIN categories c ON p.category_id = c.id
    JOIN cities city ON p.city_id = city.id
    JOIN provinces pr ON city.province_id = pr.id
    JOIN countries co ON pr.country_id = co.id

    WHERE p.id = ?
      AND p.deleted_at IS NULL
  `;

  const [rows] = await pool.query(sql, [id]);
  return rows;
};

const getDetail = async (id) => {
  sql = `SELECT
    p.id,
    p.property_name,
    NULL AS slug,
    p.description,
    p.address,

    p.latitude,
    p.longitude,

    p.contact_phone,
    p.contact_email,

    p.number_of_floors,
    p.rejection_reason,

    p.created_at,
    p.updated_at,

    -- Status
    ps.id AS status_id,
    ps.status_name,

    -- Category
    c.id AS category_id,
    c.category_name,

    -- Owner
    u.id AS owner_id,
    u.full_name,
    u.phone AS owner_phone,
    u.email AS owner_email,

    -- City
    city.id AS city_id,
    city.name AS city_name,

    -- Province
    province.id AS province_id,
    province.name AS province_name,

    -- Country
    country.id AS country_id,
    country.name AS country_name

FROM properties p

JOIN property_statuses ps
    ON p.status_id = ps.id

JOIN categories c
    ON p.category_id = c.id

JOIN users u
    ON p.owner_id = u.id

JOIN cities city
    ON p.city_id = city.id

JOIN provinces province
    ON city.province_id = province.id

JOIN countries country
    ON province.country_id = country.id

WHERE p.id = ?
AND ps.status_name = 'approved'
AND p.deleted_at IS NULL;`;

  let [row] = await pool.query(sql, [id]);
  return row;
};

const create = async (user_id, body) => {
  const sql = `
    INSERT INTO properties (
      owner_id,
      category_id,
      status_id,
      property_name,
      description,
      address,
      city_id,
      latitude,
      longitude,
      contact_phone,
      contact_email,
      number_of_floors
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    user_id,
    body.category_id,
    1, // default status = pending (change if your DB uses different id)
    body.property_name,
    body.description || null,
    body.address,
    body.city_id,
    body.latitude || null,
    body.longitude || null,
    body.contact_phone || null,
    body.contact_email || null,
    body.number_of_floors || null,
  ];

  const [result] = await pool.query(sql, params);
  return result;
};

const getImages = async (property_id) => {
  sql = `SELECT
    id,
    image_url,
    is_cover,
    sort_order
    FROM property_images
    WHERE property_id = ?
    ORDER BY sort_order ASC`;
  let [rows] = await pool.query(sql, [property_id]);
  return rows;
};

const getAmenities = async (property_id) => {
  sql = `SELECT
    a.id,
    a.amenity_name
    FROM property_amenities pa

    JOIN amenities a
    ON pa.amenity_id = a.id

    WHERE pa.property_id = ?`;
  let [rows] = await pool.query(sql, [property_id]);
  return rows;
};

const getRooms = async (property_id) => {
  sql = `SELECT
    r.id,
    r.room_name,
    r.description,
    r.price_per_night,
    r.max_guests,
    r.total_rooms,

    rt.type_name AS room_type

    FROM rooms r

    JOIN room_types rt
    ON r.room_type_id = rt.id

    WHERE r.property_id = ?`;
  let [rows] = await pool.query(sql, [property_id]);
  return rows;
};

const getMyProperty = async (owner_id, filters = {}) => {
  let sql = `
    SELECT
      p.id,
      p.property_name,

      city.id AS city_id,
      city.name AS city_name,

      province.id AS province_id,
      province.name AS province_name,

      country.id AS country_id,
      country.name AS country_name,

      c.id AS category_id,
      c.category_name,

      ps.id AS status_id,
      ps.status_name,

      pi.image_url AS cover_image,

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
      ) AS average_rating,

      p.rejection_reason,
      p.created_at

    FROM properties p

    JOIN categories c
      ON p.category_id = c.id

    JOIN property_statuses ps
      ON p.status_id = ps.id

    JOIN cities city
      ON p.city_id = city.id

    JOIN provinces province
      ON city.province_id = province.id

    JOIN countries country
      ON province.country_id = country.id

    LEFT JOIN property_images pi
      ON p.id = pi.property_id
      AND pi.is_cover = TRUE

    WHERE p.owner_id = ?
      AND p.deleted_at IS NULL
  `;

  const params = [owner_id];

  // Filter by city
  if (filters.city_id) {
    sql += ` AND city.id = ?`;
    params.push(filters.city_id);
  }

  // Filter by province
  if (filters.province_id) {
    sql += ` AND province.id = ?`;
    params.push(filters.province_id);
  }

  // Filter by category
  if (filters.category_id) {
    sql += ` AND c.id = ?`;
    params.push(filters.category_id);
  }

  // Search property name
  if (filters.search) {
    sql += ` AND p.property_name LIKE ?`;
    params.push(`%${filters.search}%`);
  }

  sql += ` ORDER BY p.created_at DESC`;

  // Pagination
  if (filters.limit && filters.page) {
    const limit = parseInt(filters.limit);
    const page = parseInt(filters.page);
    const offset = (page - 1) * limit;

    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);
  }

  const [rows] = await pool.query(sql, params);
  return rows;
};

const updateStatus = async (admin_id, property_id, body) => {
  sql = `UPDATE properties
  SET
      status_id = ?,
      rejection_reason = ?,
      approved_by = ?,
      approved_at = ?
      WHERE id = ?`;
  await pool.query(sql, [
    body.status_id,
    body.rejection_reason,
    admin_id,
    body.approved_at,
    property_id,
  ]);
};

const getUpdatePropertyById = async (property_id) => {
  sql = `SELECT
    p.id,
    p.property_name,

    ps.status_name,

    p.rejection_reason,
    p.approved_at,

    u.full_name AS approved_by_name

    FROM properties p

    JOIN property_statuses ps
    ON p.status_id = ps.id

    LEFT JOIN users u
    ON p.approved_by = u.id

    WHERE p.id = ?
    AND p.deleted_at IS NULL`;
  let [row] = await pool.query(sql, [property_id]);
  return row;
};

const getMyOwnPropertyById = async (property_id, owner_id) => {
  const sql = `
    SELECT
      p.id,
      p.property_name,
      NULL AS slug,
      p.description,
      p.address,

      city.id AS city_id,
      city.name AS city_name,

      province.id AS province_id,
      province.name AS province_name,

      country.id AS country_id,
      country.name AS country_name,

      p.latitude,
      p.longitude,

      p.contact_phone,
      p.contact_email,

      p.number_of_floors,
      p.rejection_reason,

      p.created_at,
      p.updated_at,

      ps.id AS status_id,
      ps.status_name,

      c.id AS category_id,
      c.category_name,

      u.id AS owner_id,
      u.full_name,
      u.phone AS owner_phone,
      u.email AS owner_email,

      pi.id AS image_id,
      pi.image_url,
      pi.is_cover,
      pi.sort_order

    FROM properties p

    JOIN property_statuses ps
      ON p.status_id = ps.id

    JOIN categories c
      ON p.category_id = c.id

    JOIN users u
      ON p.owner_id = u.id

    JOIN cities city
      ON p.city_id = city.id

    JOIN provinces province
      ON city.province_id = province.id

    JOIN countries country
      ON province.country_id = country.id

    LEFT JOIN property_images pi
      ON p.id = pi.property_id

    WHERE p.id = ?
      AND p.owner_id = ?
      AND p.deleted_at IS NULL

    ORDER BY pi.sort_order ASC, pi.id ASC
  `;

  const [rows] = await pool.query(sql, [property_id, owner_id]);

  return rows;
};

const checkOwnerProperty = async (property_id, owner_id) => {
  sql = `SELECT *
    FROM properties
    WHERE id = ?
    AND owner_id = ?
    AND deleted_at IS NULL
    LIMIT 1`;
  let [row] = await pool.query(sql, [property_id, owner_id]);
  return row;
};

const update = async (property_id, owner_id, body) => {
  const sql = `
    UPDATE properties
    SET
      category_id = COALESCE(?, category_id),
      property_name = COALESCE(?, property_name),
      description = COALESCE(?, description),

      address = COALESCE(?, address),
      city_id = COALESCE(?, city_id),

      latitude = COALESCE(?, latitude),
      longitude = COALESCE(?, longitude),

      contact_phone = COALESCE(?, contact_phone),
      contact_email = COALESCE(?, contact_email),
      number_of_floors = COALESCE(?, number_of_floors),

      status_id = 1,
      rejection_reason = NULL,
      approved_by = NULL,
      approved_at = NULL

    WHERE id = ?
      AND owner_id = ?
      AND deleted_at IS NULL
  `;

  const data = [
    body.category_id !== undefined ? body.category_id : null,
    body.property_name !== undefined ? body.property_name : null,
    body.description !== undefined ? body.description : null,

    body.address !== undefined ? body.address : null,
    body.city_id !== undefined ? body.city_id : null,

    body.latitude !== undefined ? body.latitude : null,
    body.longitude !== undefined ? body.longitude : null,

    body.contact_phone !== undefined ? body.contact_phone : null,
    body.contact_email !== undefined ? body.contact_email : null,
    body.number_of_floors !== undefined ? body.number_of_floors : null,

    property_id,
    owner_id,
  ];

  const [result] = await pool.query(sql, data);
  return result;
};

const softDeleteProperty = async (propertyId) => {
  sql = `
    UPDATE properties
    SET deleted_at = NOW()
    WHERE id = ?
  `;

  await pool.query(sql, [propertyId]);
};

const findPropertyById = async (propertyId) => {
  const [rows] = await pool.query(
    `
    SELECT *
    FROM properties
    WHERE id = ?
    AND deleted_at IS NULL
    `,
    [propertyId]
  );

  return rows[0];
};

const createManyPropertyImages = async (images) => {
  const values = images.map((image) => [
    image.property_id,
    image.image_url,
    image.sort_order,
  ]);

  const [rows] = await pool.query(
    `
    INSERT INTO property_images (
      property_id,
      image_url,
      sort_order
    )
    VALUES ?
    `,
    [values]
  );

  return rows;
};

const findImageById = async (imageId) => {
  const [rows] = await pool.query(
    `
    SELECT *
    FROM property_images
    WHERE id = ?
    `,
    [imageId]
  );

  return rows[0];
};

const deleteImage = async (imageId) => {
  await pool.query(
    `
    DELETE FROM property_images
    WHERE id = ?
    `,
    [imageId]
  );
};

const resetCoverImages = async (propertyId) => {
  await pool.query(
    `
    UPDATE property_images
    SET is_cover = FALSE
    WHERE property_id = ?
    `,
    [propertyId]
  );
};

const setCoverImage = async (imageId) => {
  await pool.query(
    `
    UPDATE property_images
    SET is_cover = TRUE
    WHERE id = ?
    `,
    [imageId]
  );
};

const updateImageSortOrder = async (imageId, sortOrder) => {
  await pool.query(
    `
    UPDATE property_images
    SET sort_order = ?
    WHERE id = ?
    `,
    [sortOrder, imageId]
  );
};

const getPropertyDetailForAdmin = async (propertyId) => {
  const [rows] = await pool.query(
    `
    SELECT
      p.*,

      c.category_name,

      ps.status_name,

      u.id AS owner_id,
      u.full_name AS owner_name,
      u.email AS owner_email,
      u.phone AS owner_phone

    FROM properties p

    JOIN categories c
      ON p.category_id = c.id

    JOIN property_statuses ps
      ON p.status_id = ps.id

    JOIN users u
      ON p.owner_id = u.id

    WHERE p.id = ?
    `,
    [propertyId]
  );

  return rows[0];
};

const getAllUpdateRequests = async () => {
  const [rows] = await pool.query(`
    SELECT
      pur.*,
      p.property_name,
      u.full_name owner_name
    FROM property_update_requests pur
    JOIN properties p
      ON pur.property_id = p.id
    JOIN users u
      ON pur.owner_id = u.id
    ORDER BY pur.created_at DESC
  `);

  return rows;
};

const createUpdateRequest = async (propertyId, ownerId, updateData) => {
  const [rows] = await pool.query(
    `
    INSERT INTO property_update_requests
    (
      property_id,
      owner_id,
      update_data
    )
    VALUES (?, ?, ?)
    `,
    [propertyId, ownerId, updateData]
  );

  return rows;
};

const getPendingRequests = async () => {
  const [rows] = await pool.query(
    `
    SELECT
      pur.*,
      p.property_name,
      u.full_name
    FROM property_update_requests pur

    JOIN properties p
      ON pur.property_id = p.id

    JOIN users u
      ON pur.owner_id = u.id

    WHERE pur.status = 'pending'

    ORDER BY pur.created_at DESC
    `
  );

  return rows;
};

const getUpdateRequestById = async (id) => {
  const [rows] = await pool.query(
    `
    SELECT *
    FROM property_update_requests
    WHERE id = ?
    `,
    [id]
  );

  return rows[0];
};

const approveUpdateRequest = async (requestId, adminId) => {
  await pool.query(
    `
    UPDATE property_update_requests
    SET
      status='approved',
      reviewed_by = ?,
      reviewed_at = NOW()
    WHERE id=?
    `,
    [adminId, requestId]
  );
};

const rejectUpdateRequest = async (requestId, adminId, reason) => {
  await pool.query(
    `
    UPDATE property_update_requests
    SET
      status='rejected',
      rejection_reason=?,
      reviewed_by = ?,
      reviewed_at = NOW()
    WHERE id=?
    `,
    [reason, adminId, requestId]
  );
};

// City Model
const CityModel = {
  getAll: async () => {
    const sql = `
      SELECT * FROM cities
    `;

    const [rows] = await pool.query(sql);
    return rows;
  },

  getByProvince: async (provinceId) => {
    const sql = `
      SELECT * FROM cities
      WHERE province_id = ?
    `;

    const [rows] = await pool.query(sql, [provinceId]);
    return rows;
  },
};

const getProvince = async () => {
  sql = "SELECT * FROM provinces";
  const [rows] = await pool.query(sql);
  return rows;
};

module.exports = {
  getAllCategories,
  getAllApproved,
  getAll,
  getById,
  getDetail,
  getImages,
  getAmenities,
  getRooms,
  getMyProperty,
  create,
  updateStatus,
  getUpdatePropertyById,
  getMyOwnPropertyById,
  checkOwnerProperty,
  update,
  softDeleteProperty,
  findPropertyById,
  createManyPropertyImages,
  findImageById,
  deleteImage,
  resetCoverImages,
  setCoverImage,
  updateImageSortOrder,
  getPropertyDetailForAdmin,
  createUpdateRequest,
  getPendingRequests,
  getUpdateRequestById,
  getAllUpdateRequests,
  createUpdateRequest,
  getPendingRequests,
  approveUpdateRequest,
  rejectUpdateRequest,

  CityModel,
  getProvince,
};
