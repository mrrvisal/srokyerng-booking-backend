const db = require("../../config/db");

/**
 * Pre-fetches frequently used lookup IDs to avoid repeated subqueries.
 */
let cachedLookups = null;

const getLookupIds = async () => {
  if (cachedLookups) return cachedLookups;

  const [rows] = await db.query(`
    SELECT
      (SELECT id FROM roles WHERE role_name = 'customer')     AS customer_role_id,
      (SELECT id FROM roles WHERE role_name = 'owner')        AS owner_role_id,
      (SELECT id FROM payment_statuses WHERE status_name = 'paid') AS paid_status_id
  `);

  cachedLookups = rows[0];
  return cachedLookups;
};

/**
 * Builds a date-filter WHERE snippet and parameter array.
 * Uses half-open interval [start, end+1) to correctly include the full end_date
 * while allowing the index on created_at to be used.
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
 * Analytics Model - Database queries for admin analytics
 */

/**
 * Get platform summary statistics.
 *
 * Optimisations vs original:
 *  - Lookup IDs fetched once via getLookupIds() instead of repeated subqueries.
 *  - Scalar subqueries run in parallel via Promise.all (MySQL executes each
 *    independently, but they are scheduled concurrently in Node).
 *  - Half-open date range for index-friendliness.
 */
const getPlatformSummary = async (startDate, endDate) => {
  const { clause: dfUsers, params: pUsers } = dateFilter(startDate, endDate, "u");
  const { clause: dfProp,  params: pProp }  = dateFilter(startDate, endDate, "p");
  const { clause: dfRes,   params: pRes }   = dateFilter(startDate, endDate, "r");
  const { clause: dfRev,   params: pRev }   = dateFilter(startDate, endDate, "r");

  const lookups = await getLookupIds();

  // Run all 7 scalar subqueries concurrently
  const [
    [customersRows],
    [ownersRows],
    [propsRows],
    [reservationsRows],
    [paidPaymentsRows],
    [reviewsRows],
    [revenueRows],
  ] = await Promise.all([
    db.query(
      `SELECT COUNT(*) AS total_customers FROM users u WHERE u.role_id = ? ${dfUsers}`,
      [lookups.customer_role_id, ...pUsers]
    ),
    db.query(
      `SELECT COUNT(*) AS total_owners FROM users u WHERE u.role_id = ? ${dfUsers}`,
      [lookups.owner_role_id, ...pUsers]
    ),
    db.query(
      `SELECT COUNT(*) AS total_properties FROM properties p WHERE 1=1 ${dfProp}`,
      pProp
    ),
    db.query(
      `SELECT COUNT(*) AS total_reservations FROM reservations r WHERE 1=1 ${dfRes}`,
      pRes
    ),
    db.query(
      `SELECT COUNT(*) AS paid_payments FROM payments p WHERE p.payment_status_id = ? ${dfProp.replace(/AND p\./, "AND p.")}`,
      [lookups.paid_status_id, ...pProp]
    ),
    db.query(
      `SELECT COUNT(*) AS total_reviews FROM reviews r WHERE 1=1 ${dfRev}`,
      pRev
    ),
    db.query(
      `SELECT COALESCE(SUM(p.amount), 0) AS total_revenue FROM payments p WHERE p.payment_status_id = ? ${dfProp.replace(/AND p\./, "AND p.")}`,
      [lookups.paid_status_id, ...pProp]
    ),
  ]);

  return {
    total_customers: Number(customersRows[0].total_customers),
    total_owners: Number(ownersRows[0].total_owners),
    total_properties: Number(propsRows[0].total_properties),
    total_reservations: Number(reservationsRows[0].total_reservations),
    paid_payments: Number(paidPaymentsRows[0].paid_payments),
    total_reviews: Number(reviewsRows[0].total_reviews),
    total_revenue: parseFloat(revenueRows[0].total_revenue),
  };
};

/**
 * Get user counts by role and status
 */
const getUserCounts = async (startDate, endDate) => {
  const { clause, params } = dateFilter(startDate, endDate, "u");

  const [rows] = await db.query(`
    SELECT
      r.role_name AS role,
      s.status_name AS status,
      COUNT(u.id) AS count
    FROM users u
    JOIN roles r ON u.role_id = r.id
    JOIN account_statuses s ON u.status_id = s.id
    WHERE 1=1 ${clause}
    GROUP BY r.role_name, s.status_name
    ORDER BY r.role_name, s.status_name
  `, params);

  return rows;
};

/**
 * Get property counts by status
 */
const getPropertyCounts = async (startDate, endDate) => {
  const { clause, params } = dateFilter(startDate, endDate, "p");

  const [rows] = await db.query(`
    SELECT
      ps.status_name AS status,
      COUNT(p.id) AS count
    FROM properties p
    JOIN property_statuses ps ON p.status_id = ps.id
    WHERE 1=1 ${clause}
    GROUP BY ps.status_name
    ORDER BY ps.status_name
  `, params);

  return rows;
};

/**
 * Get reservation counts by status
 */
const getReservationCounts = async (startDate, endDate) => {
  const { clause, params } = dateFilter(startDate, endDate, "r");

  const [rows] = await db.query(`
    SELECT
      r.reservation_status AS status,
      COUNT(r.id) AS count
    FROM reservations r
    WHERE 1=1 ${clause}
    GROUP BY r.reservation_status
    ORDER BY r.reservation_status
  `, params);

  return rows;
};

/**
 * Get payment totals by status
 */
const getPaymentCounts = async (startDate, endDate) => {
  const { clause, params } = dateFilter(startDate, endDate, "p");

  const [rows] = await db.query(`
    SELECT
      ps.status_name AS status,
      COUNT(p.id) AS count,
      COALESCE(SUM(p.amount), 0) AS total_amount
    FROM payments p
    JOIN payment_statuses ps ON p.payment_status_id = ps.id
    WHERE 1=1 ${clause}
    GROUP BY ps.status_name
    ORDER BY ps.status_name
  `, params);

  return rows;
};

/**
 * Get review count summary
 */
const getReviewCounts = async (startDate, endDate) => {
  const { clause, params } = dateFilter(startDate, endDate, "r");

  const [rows] = await db.query(`
    SELECT
      COUNT(r.id) AS total_reviews,
      COALESCE(AVG(r.rating), 0) AS average_rating,
      MIN(r.rating) AS min_rating,
      MAX(r.rating) AS max_rating,
      SUM(CASE WHEN r.owner_reply IS NOT NULL THEN 1 ELSE 0 END) AS owner_replied_count
    FROM reviews r
    WHERE 1=1 ${clause}
  `, params);

  return rows[0] || {};
};

/**
 * Get recent platform activity – runs per-table queries in parallel,
 * merges in JS, avoiding a MySQL `UNION ALL` sort on large datasets.
 */
const getRecentActivity = async (limit = 20, startDate, endDate) => {
  const { clause, params: dateParams } = dateFilter(startDate, endDate);

  const tableQueries = [
    { type: "user_created",       table: "users",       nameCol: "full_name",                         resourceType: "user" },
    { type: "property_created",   table: "properties",  nameCol: "property_name",                     resourceType: "property" },
    { type: "reservation_created",table: "reservations", nameCol: "CONCAT('Reservation #', id)",       resourceType: "reservation" },
    { type: "payment_created",    table: "payments",    nameCol: "CONCAT('Payment #', id)",           resourceType: "payment" },
    { type: "review_created",     table: "reviews",     nameCol: "CONCAT('Review #', id)",            resourceType: "review" },
  ];

  const results = await Promise.all(
    tableQueries.map(({ type, table, nameCol, resourceType }) => {
      const sql = `
        SELECT
          ? AS activity_type,
          id AS resource_id,
          ${nameCol} AS resource_name,
          created_at,
          ? AS resource_type
        FROM ${table}
        WHERE 1=1 ${clause}
        ORDER BY created_at DESC
        LIMIT ?
      `;
      const finalParams = [type, resourceType, ...dateParams, limit];
      return db.query(sql, finalParams).then(([rows]) => rows);
    })
  );

  // Merge & sort in JS – avoids MySQL filesort on UNION ALL
  const merged = results.flat().sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  return merged.slice(0, limit);
};

/**
 * Clears cached lookup IDs (useful for testing).
 */
const clearLookupCache = () => {
  cachedLookups = null;
};

module.exports = {
  getPlatformSummary,
  getUserCounts,
  getPropertyCounts,
  getReservationCounts,
  getPaymentCounts,
  getReviewCounts,
  getRecentActivity,
  clearLookupCache,
};