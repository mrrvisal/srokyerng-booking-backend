// src/modules/reservations/reservation.model.js
const pool = require("../../config/db");

const findRoomById = async (roomId) => {
  const [rows] = await pool.query(
    `SELECT r.*, 
            p.id as property_id, 
            p.status_id as property_status_id,
            ps.status_name as property_status,
            p.owner_id
     FROM rooms r
     JOIN properties p ON r.property_id = p.id
     JOIN property_statuses ps ON p.status_id = ps.id
     WHERE r.id = ?`,
    [roomId]
  );
  return rows[0];
};

const findPropertyStatusByName = async (statusName) => {
  const [rows] = await pool.query(
    "SELECT id FROM property_statuses WHERE status_name = ? LIMIT 1",
    [statusName]
  );
  return rows[0];
};

const checkAvailability = async (roomId, checkInDate, checkOutDate, excludeReservationId = null) => {
  
  const [roomRows] = await pool.query(
    "SELECT total_rooms FROM rooms WHERE id = ?",
    [roomId]
  );
  
  if (roomRows.length === 0) {
    return { isAvailable: false, availableRooms: 0, totalRooms: 0, bookedCount: 0 };
  }
  
  const totalRooms = roomRows[0].total_rooms;
  
  let query = `
    SELECT COUNT(*) as booked_count
    FROM reservations
    WHERE room_id = ?
      AND reservation_status NOT IN ('cancelled')
      AND check_in_date < ?
      AND check_out_date > ?
  `;
  
  const params = [roomId, checkOutDate, checkInDate];
  
  if (excludeReservationId) {
    query += ` AND id != ?`;
    params.push(excludeReservationId);
  }
  
  const [rows] = await pool.query(query, params);
  const bookedCount = rows[0].booked_count;

  const [blockRows] = await pool.query(
    `SELECT COUNT(*) as block_count
     FROM room_availability_blocks
     WHERE room_id = ?
       AND start_date < ?
       AND end_date >= ?`,
    [roomId, checkOutDate, checkInDate]
  );
  const isBlocked = blockRows[0].block_count > 0;

  return {
    isAvailable: bookedCount < totalRooms && !isBlocked,
    availableRooms: isBlocked ? 0 : totalRooms - bookedCount,
    bookedCount,
    totalRooms,
    isBlocked,
  };
};

const createReservation = async (data) => {
  const [result] = await pool.query(
    `INSERT INTO reservations 
      (customer_id, room_id, check_in_date, check_out_date, 
       total_guests, total_nights, total_amount, reservation_status, special_request)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.customer_id,
      data.room_id,
      data.check_in_date,
      data.check_out_date,
      data.total_guests,
      data.total_nights,
      data.total_amount,
      data.reservation_status || "pending",
      data.special_request || null,
    ]
  );
  return result.insertId;
};

const findReservationById = async (id) => {
  const [rows] = await pool.query(
    `SELECT r.*,
            u.full_name as customer_name,
            u.email as customer_email,
            u.phone as customer_phone,
            rm.room_name,
            rm.price_per_night,
            rm.max_guests,
            p.id as property_id,
            p.property_name,
            p.owner_id,
            owner.full_name as owner_name,
            (
              SELECT rfr.refund_status
              FROM refund_requests rfr
              JOIN payments pmt ON pmt.id = rfr.payment_id
              WHERE pmt.reservation_id = r.id
              ORDER BY rfr.created_at DESC
              LIMIT 1
            ) AS refund_status
     FROM reservations r
     JOIN users u ON r.customer_id = u.id
     JOIN rooms rm ON r.room_id = rm.id
     JOIN properties p ON rm.property_id = p.id
     JOIN users owner ON p.owner_id = owner.id
     WHERE r.id = ?`,
    [id]
  );
  return rows[0];
};

const findReservationsByCustomer = async (customerId, filters = {}) => {
  let query = `
    SELECT r.*,
           rm.room_name,
           p.property_name,
           p.id as property_id,
           (
             SELECT image_url
             FROM property_images
             WHERE property_id = p.id
             AND is_cover = TRUE
             LIMIT 1
           ) AS cover_image
    FROM reservations r
    JOIN rooms rm ON r.room_id = rm.id
    JOIN properties p ON rm.property_id = p.id
    WHERE r.customer_id = ?
  `;
  const params = [customerId];

  if (filters.status) {
    query += ` AND r.reservation_status = ?`;
    params.push(filters.status);
  }

  query += ` ORDER BY r.created_at DESC`;

  const [rows] = await pool.query(query, params);
  return rows;
};

const findReservationsByOwner = async (ownerId, filters = {}) => {
  let query = `
    SELECT r.*,
           rm.room_name,
           p.property_name,
           p.id as property_id,
           u.full_name as customer_name,
           u.email as customer_email
    FROM reservations r
    JOIN rooms rm ON r.room_id = rm.id
    JOIN properties p ON rm.property_id = p.id
    JOIN users u ON r.customer_id = u.id
    WHERE p.owner_id = ?
  `;
  const params = [ownerId];

  if (filters.status) {
    query += ` AND r.reservation_status = ?`;
    params.push(filters.status);
  }

  if (filters.property_id) {
    query += ` AND p.id = ?`;
    params.push(filters.property_id);
  }

  query += ` ORDER BY r.created_at DESC`;

  const [rows] = await pool.query(query, params);
  return rows;
};

const findAllReservations = async (filters = {}) => {
  let query = `
    SELECT r.*,
           rm.room_name,
           p.property_name,
           p.id as property_id,
           p.owner_id,
           owner.full_name as owner_name,
           u.full_name as customer_name,
           u.email as customer_email
    FROM reservations r
    JOIN rooms rm ON r.room_id = rm.id
    JOIN properties p ON rm.property_id = p.id
    JOIN users owner ON p.owner_id = owner.id
    JOIN users u ON r.customer_id = u.id 
    WHERE 1=1
  `;
  const params = [];

  if (filters.status) {
    query += ` AND r.reservation_status = ?`;
    params.push(filters.status);
  }

  if (filters.property_id) {
    query += ` AND p.id = ?`;
    params.push(filters.property_id);
  }

  if (filters.owner_id) {
    query += ` AND p.owner_id = ?`;
    params.push(filters.owner_id);
  }

  query += ` ORDER BY r.id DESC`;

  const [rows] = await pool.query(query, params);
  return rows;
};

const updateReservationStatus = async (
  id,
  status,
  cancellationReason = null
) => {
  const [result] = await pool.query(
    `UPDATE reservations 
     SET reservation_status = ?,
         cancellation_reason = COALESCE(?, cancellation_reason),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [status, cancellationReason, id]
  );
  return result.affectedRows > 0;
};

// Auto-complete reservations where check_out_date has passed
const autoCompleteExpiredReservations = async () => {
  const [result] = await pool.query(
    `UPDATE reservations
     SET reservation_status = 'completed',
         updated_at = CURRENT_TIMESTAMP
     WHERE reservation_status = 'confirmed'
       AND check_out_date < CURDATE()
       AND reservation_status NOT IN ('cancelled', 'completed')`
  );
  return result.affectedRows;
};

// Auto-expire pending reservations that have not been paid within PENDING_EXPIRY_HOURS
const autoExpirePendingReservations = async () => {
  const { PENDING_EXPIRY_HOURS } = require("../../constants/reservation");
  const [result] = await pool.query(
    `UPDATE reservations
     SET reservation_status = 'cancelled',
         cancellation_reason = 'Auto-expired: no payment received within ${PENDING_EXPIRY_HOURS} hours',
         updated_at = CURRENT_TIMESTAMP
     WHERE reservation_status = 'pending'
       AND created_at < DATE_SUB(NOW(), INTERVAL ? HOUR)`,
    [PENDING_EXPIRY_HOURS]
  );
  return result.affectedRows;
};

const findUserById = async (userId) => {
  const [rows] = await pool.query(
    "SELECT id, role_id, full_name, email FROM users WHERE id = ?",
    [userId]
  );
  return rows[0];
};

const findRoleById = async (roleId) => {
  const [rows] = await pool.query("SELECT role_name FROM roles WHERE id = ?", [roleId]);
  return rows[0];
};

const createReservationWithLock = async (data) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Lock the room row
    const [roomRows] = await connection.query(
      "SELECT total_rooms FROM rooms WHERE id = ? FOR UPDATE",
      [data.room_id]
    );

    // Check availability with lock
    const [overlapRows] = await connection.query(
      `SELECT COUNT(*) as booked_count
       FROM reservations
       WHERE room_id = ?
         AND reservation_status NOT IN ('cancelled')
         AND check_in_date < ?
         AND check_out_date > ?
       FOR UPDATE`,
      [data.room_id, data.check_out_date, data.check_in_date]
    );

    // Owner-blocked dates (maintenance/manual holds) are just as much a
    // hard stop as an existing reservation — check them under the same lock.
    const [blockRows] = await connection.query(
      `SELECT COUNT(*) as block_count
       FROM room_availability_blocks
       WHERE room_id = ?
         AND start_date < ?
         AND end_date >= ?
       FOR UPDATE`,
      [data.room_id, data.check_out_date, data.check_in_date]
    );

    const totalRooms = roomRows[0].total_rooms;
    const bookedCount = overlapRows[0].booked_count;
    const isBlocked = blockRows[0].block_count > 0;

    if (bookedCount >= totalRooms || isBlocked) {
      await connection.rollback();
      connection.release();
      return {
        success: false,
        error: isBlocked ? "Room is blocked by the owner for the selected dates" : "Room not available",
      };
    }

    // Create reservation
    const [result] = await connection.query(
      `INSERT INTO reservations 
        (customer_id, room_id, check_in_date, check_out_date, 
         total_guests, total_nights, total_amount, reservation_status, special_request)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.customer_id,
        data.room_id,
        data.check_in_date,
        data.check_out_date,
        data.total_guests,
        data.total_nights,
        data.total_amount,
        data.reservation_status || "pending",
        data.special_request || null,
      ]
    );

    await connection.commit();
    connection.release();
    return { success: true, id: result.insertId };
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
};

module.exports = {
  findRoomById,
  findPropertyStatusByName,
  checkAvailability,
  createReservation,
  findReservationById,
  findReservationsByCustomer,
  findReservationsByOwner,
  findAllReservations,
  updateReservationStatus,
  autoCompleteExpiredReservations,
  autoExpirePendingReservations,
  findUserById,
  findRoleById,
  createReservationWithLock,
};