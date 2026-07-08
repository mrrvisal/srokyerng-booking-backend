const pool = require("../../config/db");

const findRefundRequestById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM refund_requests WHERE id = ?", [id]);
  return rows[0];
};

// Locks the refund request row for the duration of a transaction so
// concurrent approve/reject calls on the same request serialize.
// Must be called with a connection that has an open transaction.
const lockRefundRequestById = async (connection, id) => {
  const [rows] = await connection.query(
    "SELECT * FROM refund_requests WHERE id = ? FOR UPDATE",
    [id]
  );
  return rows[0];
};

const findRefundRequestsByPaymentId = async (paymentId) => {
  const [rows] = await pool.query(
    "SELECT * FROM refund_requests WHERE payment_id = ? ORDER BY requested_at DESC",
    [paymentId]
  );
  return rows;
};

const findRefundRequestsByUserId = async (userId, limit = 50) => {
  const [rows] = await pool.query(
    `SELECT * FROM refund_requests 
     WHERE requested_by = ? 
     ORDER BY requested_at DESC 
     LIMIT ?`,
    [userId, limit]
  );
  return rows;
};

const findPendingRefundRequests = async (limit = 50) => {
  const [rows] = await pool.query(
    `SELECT * FROM refund_requests 
     WHERE refund_status = 'requested' 
     ORDER BY requested_at ASC 
     LIMIT ?`,
    [limit]
  );
  return rows;
};

const createRefundRequest = async (paymentId, requestedBy, amount, reason) => {
  const [result] = await pool.query(
    `INSERT INTO refund_requests 
     (payment_id, requested_by, amount, reason) 
     VALUES (?, ?, ?, ?)`,
    [paymentId, requestedBy, amount, reason]
  );
  return result.insertId;
};

const updateRefundRequestStatus = async (id, status, handledBy, decisionNote, connection = pool) => {
  const [result] = await connection.query(
    `UPDATE refund_requests
     SET refund_status = ?, handled_by = ?, decision_note = ?, handled_at = NOW()
     WHERE id = ?`,
    [status, handledBy, decisionNote, id]
  );
  return result.affectedRows > 0;
};

const findRefundRequestsByOwner = async (ownerId, limit = 50, refundRequestId = null) => {
  let query = `SELECT rr.*,
            p.amount as payment_amount,
            p.reservation_id,
            p.owner_id,
            res.check_in_date,
            res.check_out_date,
            res.reservation_status,
            rm.room_name,
            prop.property_name,
            u.full_name as customer_name
     FROM refund_requests rr
     JOIN payments p ON rr.payment_id = p.id
     JOIN reservations res ON p.reservation_id = res.id
     JOIN rooms rm ON res.room_id = rm.id
     JOIN properties prop ON rm.property_id = prop.id
     JOIN users u ON res.customer_id = u.id
     WHERE p.owner_id = ?`;
  const params = [ownerId];

  if (refundRequestId) {
    query += ` AND rr.id = ?`;
    params.push(refundRequestId);
  }

  query += ` ORDER BY rr.requested_at DESC LIMIT ?`;
  params.push(limit);

  const [rows] = await pool.query(query, params);
  return rows;
};

const findPendingRefundRequestsByOwner = async (ownerId, limit = 50) => {
  const [rows] = await pool.query(
    `SELECT rr.*,
            p.amount as payment_amount,
            p.reservation_id,
            p.owner_id,
            res.check_in_date,
            res.check_out_date,
            res.reservation_status,
            rm.room_name,
            prop.property_name,
            u.full_name as customer_name
     FROM refund_requests rr
     JOIN payments p ON rr.payment_id = p.id
     JOIN reservations res ON p.reservation_id = res.id
     JOIN rooms rm ON res.room_id = rm.id
     JOIN properties prop ON rm.property_id = prop.id
     JOIN users u ON res.customer_id = u.id
     WHERE p.owner_id = ? AND rr.refund_status = 'requested'
     ORDER BY rr.requested_at ASC
     LIMIT ?`,
    [ownerId, limit]
  );
  return rows;
};

const getRefundRequestStats = async (startDate = null, endDate = null) => {
  let query = `
    SELECT 
      refund_status,
      COUNT(*) as count,
      COALESCE(SUM(amount), 0) as total_amount
    FROM refund_requests
  `;
  const params = [];

  if (startDate && endDate) {
    query += " WHERE requested_at BETWEEN ? AND ?";
    params.push(startDate, endDate);
  }

  query += " GROUP BY refund_status";

  const [rows] = await pool.query(query, params);
  return rows;
};

module.exports = {
  findRefundRequestById,
  lockRefundRequestById,
  findRefundRequestsByPaymentId,
  findRefundRequestsByUserId,
  findPendingRefundRequests,
  findRefundRequestsByOwner,
  findPendingRefundRequestsByOwner,
  createRefundRequest,
  updateRefundRequestStatus,
  getRefundRequestStats,
};