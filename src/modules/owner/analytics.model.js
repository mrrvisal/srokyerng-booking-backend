const db = require("../../config/db");

/**
 * Pre-fetches frequently used lookup IDs to avoid repeated subqueries.
 */
let cachedLookups = null;

const getLookupIds = async () => {
  if (cachedLookups) return cachedLookups;

  const [rows] = await db.query(`
    SELECT
      (SELECT id FROM payment_statuses WHERE status_name = 'paid') AS paid_status_id
  `);

  cachedLookups = rows[0];
  return cachedLookups;
};

/**
 * Builds a date-filter WHERE snippet and parameter array.
 * Uses half-open interval [start, end+1) for index-friendliness.
 */
const dateFilter = (startDate, endDate, alias = "") => {
  const prefix = alias ? `${alias}.` : "";
  if (startDate && endDate) {
    return {
      clause: `AND ${prefix}created_at >= ? AND ${prefix}created_at < DATE_ADD(?, INTERVAL 1 DAY)`,
      params: [startDate, endDate],
    };
  }
  return { clause: "", params: [] };
};

/**
 * Owner Analytics Model - Database queries for owner analytics
 * All queries are filtered to only the authenticated owner's properties
 */

/**
 * Get owner dashboard summary
 * @param {number} ownerId - The owner's user ID
 * @param {string} startDate - Optional start date (YYYY-MM-DD)
 * @param {string} endDate - Optional end date (YYYY-MM-DD)
 */
const getDashboardSummary = async (ownerId, startDate, endDate) => {
  const { clause, params: dateParams } = dateFilter(startDate, endDate, "r");
  const baseParams = [ownerId];

  // Run 4 scalar queries concurrently
  const [
    [[{ total_reservations }]],
    [[{ confirmed_reservations }]],
    [[{ completed_reservations }]],
    [[{ upcoming_reservations }]],
  ] = await Promise.all([
    db.query(
      `SELECT COUNT(r.id) AS total_reservations
       FROM reservations r
       JOIN rooms rm ON r.room_id = rm.id
       JOIN properties p ON rm.property_id = p.id
       WHERE p.owner_id = ? ${clause}`,
      [...baseParams, ...dateParams]
    ),
    db.query(
      `SELECT COUNT(r.id) AS confirmed_reservations
       FROM reservations r
       JOIN rooms rm ON r.room_id = rm.id
       JOIN properties p ON rm.property_id = p.id
       WHERE p.owner_id = ? AND r.reservation_status = 'confirmed' ${clause}`,
      [...baseParams, ...dateParams]
    ),
    db.query(
      `SELECT COUNT(r.id) AS completed_reservations
       FROM reservations r
       JOIN rooms rm ON r.room_id = rm.id
       JOIN properties p ON rm.property_id = p.id
       WHERE p.owner_id = ? AND r.reservation_status = 'completed' ${clause}`,
      [...baseParams, ...dateParams]
    ),
    db.query(
      `SELECT COUNT(r.id) AS upcoming_reservations
       FROM reservations r
       JOIN rooms rm ON r.room_id = rm.id
       JOIN properties p ON rm.property_id = p.id
       WHERE p.owner_id = ? AND r.check_in_date > CURDATE() ${dateFilter(startDate, endDate, "r").clause}`,
      [...baseParams, ...dateParams]
    ),
  ]);

  return {
    total_reservations: Number(total_reservations),
    confirmed_reservations: Number(confirmed_reservations),
    completed_reservations: Number(completed_reservations),
    upcoming_reservations: Number(upcoming_reservations),
  };
};

/**
 * Get reservation statistics for owner's properties
 */
const getReservationStats = async (ownerId, startDate, endDate, propertyId = null) => {
  const { clause, params: dateParams } = dateFilter(startDate, endDate, "r");
  const propertyFilter = propertyId ? "AND p.id = ?" : "";

  let params = [ownerId, ...dateParams];
  if (propertyId) {
    params.push(propertyId);
  }

  const [rows] = await db.query(`
    SELECT
      r.reservation_status AS status,
      COUNT(r.id) AS count,
      AVG(r.total_nights) AS avg_nights,
      SUM(r.total_amount) AS total_amount
    FROM reservations r
    JOIN rooms rm ON r.room_id = rm.id
    JOIN properties p ON rm.property_id = p.id
    WHERE p.owner_id = ? ${clause} ${propertyFilter}
    GROUP BY r.reservation_status
    ORDER BY r.reservation_status
  `, params);

  return rows;
};

/**
 * Get revenue statistics for owner's properties
 */
const getRevenueStats = async (ownerId, startDate, endDate, propertyId = null) => {
  const { clause, params: dateParams } = dateFilter(startDate, endDate, "py");
  const propertyFilter = propertyId ? "AND p.id = ?" : "";

  let params = [ownerId, ...dateParams];
  if (propertyId) {
    params.push(propertyId);
  }

  const [rows] = await db.query(`
    SELECT
      ps.status_name AS status,
      COUNT(py.id) AS count,
      COALESCE(SUM(py.amount), 0) AS total_amount
    FROM payments py
    JOIN reservations r ON py.reservation_id = r.id
    JOIN rooms rm ON r.room_id = rm.id
    JOIN properties p ON rm.property_id = p.id
    JOIN payment_statuses ps ON py.payment_status_id = ps.id
    WHERE p.owner_id = ? ${clause} ${propertyFilter}
    GROUP BY ps.status_name
    ORDER BY ps.status_name
  `, params);

  return rows;
};

/**
 * Get top performing properties for owner
 */
const getTopProperties = async (ownerId, limit = 10, startDate, endDate) => {
  const { clause, params: dateParams } = dateFilter(startDate, endDate, "r");
  const lookups = await getLookupIds();

  const [rows] = await db.query(`
    SELECT
      p.id,
      p.property_name,
      ps.status_name AS status,
      COUNT(r.id) AS reservation_count,
      COALESCE(SUM(py.amount), 0) AS total_revenue,
      COALESCE(AVG(rev.rating), 0) AS avg_rating,
      COUNT(DISTINCT r.customer_id) AS unique_customers
    FROM properties p
    JOIN property_statuses ps ON p.status_id = ps.id
    LEFT JOIN rooms rm ON p.id = rm.property_id
    LEFT JOIN reservations r ON rm.id = r.room_id ${clause}
    LEFT JOIN payments py ON r.id = py.reservation_id AND py.payment_status_id = ?
    LEFT JOIN reviews rev ON r.id = rev.reservation_id
    WHERE p.owner_id = ? and p.deleted_at IS NULL
    GROUP BY p.id, p.property_name, ps.status_name
    ORDER BY total_revenue DESC
    LIMIT ?
  `, [lookups.paid_status_id, ...dateParams, ownerId, limit]);

  return rows;
};

/**
 * Get top performing rooms for owner
 */
const getTopRooms = async (ownerId, limit = 10, startDate, endDate) => {
  const { clause, params: dateParams } = dateFilter(startDate, endDate, "r");
  const lookups = await getLookupIds();

  const [rows] = await db.query(`
    SELECT
      rm.id,
      rm.room_name,
      p.property_name,
      rm.price_per_night,
      COUNT(r.id) AS reservation_count,
      COALESCE(SUM(py.amount), 0) AS total_revenue,
      COALESCE(AVG(rev.rating), 0) AS avg_rating
    FROM rooms rm
    JOIN properties p ON rm.property_id = p.id
    LEFT JOIN reservations r ON rm.id = r.room_id ${clause}
    LEFT JOIN payments py ON r.id = py.reservation_id AND py.payment_status_id = ?
    LEFT JOIN reviews rev ON r.id = rev.reservation_id
    WHERE p.owner_id = ?
    GROUP BY rm.id, rm.room_name, p.property_name, rm.price_per_night
    ORDER BY total_revenue DESC
    LIMIT ?
  `, [lookups.paid_status_id, ...dateParams, ownerId, limit]);

  return rows;
};

/**
 * Check if property belongs to owner
 */
const verifyPropertyOwnership = async (ownerId, propertyId) => {
  const [rows] = await db.query(`
    SELECT id FROM properties WHERE id = ? AND owner_id = ?
  `, [propertyId, ownerId]);

  return rows && rows.length > 0;
};

/**
 * Clears cached lookup IDs (useful for testing).
 */
const clearLookupCache = () => {
  cachedLookups = null;
};

module.exports = {
  getDashboardSummary,
  getReservationStats,
  getRevenueStats,
  getTopProperties,
  getTopRooms,
  verifyPropertyOwnership,
  clearLookupCache,
};