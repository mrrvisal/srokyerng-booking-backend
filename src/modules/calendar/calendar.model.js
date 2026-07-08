const pool = require("../../config/db");

const getPropertyById = async (propertyId) => {
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

const getRoomReservations = async (roomId, startDate, endDate) => {
  const [rows] = await pool.query(
    `
    SELECT
      check_in_date,
      check_out_date
    FROM reservations
    WHERE room_id = ?
    AND reservation_status != 'cancelled'
    AND check_in_date < ?
    AND check_out_date > ?
    `,
    [roomId, endDate, startDate]
  );

  return rows;
};

const getPropertyReservations = async (propertyId, startDate, endDate) => {
  const [rows] = await pool.query(
    `
    SELECT
      r.id room_id,
      rs.check_in_date,
      rs.check_out_date
    FROM rooms r

    JOIN reservations rs
      ON r.id = rs.room_id

    WHERE r.property_id = ?
    AND rs.reservation_status != 'cancelled'
    AND rs.check_in_date < ?
    AND rs.check_out_date > ?
    `,
    [propertyId, endDate, startDate]
  );

  return rows;
};

const getOwnerRoom = async (roomId, ownerId) => {
  const [rows] = await pool.query(
    `
    SELECT r.*

    FROM rooms r

    JOIN properties p
      ON r.property_id = p.id

    WHERE r.id = ?
    AND p.owner_id = ?
    `,
    [roomId, ownerId]
  );

  return rows[0];
};

const getOwnerProperty = async (propertyId, ownerId) => {
  const [rows] = await pool.query(
    `
    SELECT *
    FROM properties
    WHERE id = ?
    AND owner_id = ?
    `,
    [propertyId, ownerId]
  );

  return rows[0];
};

// ── Availability blocks (owner-set maintenance/manual holds) ────────────────
// Each row is a single blocked calendar day (start_date = end_date), matching
// the existing one-day-at-a-time toggle UX in the owner calendar UI.

const getRoomBlocks = async (roomId, startDate, endDate) => {
  const [rows] = await pool.query(
    `
    SELECT id, room_id, start_date, end_date, reason
    FROM room_availability_blocks
    WHERE room_id = ?
    AND start_date < ?
    AND end_date >= ?
    `,
    [roomId, endDate, startDate]
  );

  return rows;
};

const getPropertyBlocks = async (propertyId, startDate, endDate) => {
  const [rows] = await pool.query(
    `
    SELECT b.id, b.room_id, b.start_date, b.end_date, b.reason
    FROM rooms r
    JOIN room_availability_blocks b
      ON b.room_id = r.id
    WHERE r.property_id = ?
    AND b.start_date < ?
    AND b.end_date >= ?
    `,
    [propertyId, endDate, startDate]
  );

  return rows;
};

const getRoomBlockByDate = async (roomId, date) => {
  const [rows] = await pool.query(
    `
    SELECT id, room_id, start_date, end_date, reason
    FROM room_availability_blocks
    WHERE room_id = ?
    AND start_date = ?
    AND end_date = ?
    `,
    [roomId, date, date]
  );

  return rows[0];
};

const insertRoomBlock = async (roomId, ownerId, date, reason) => {
  const [result] = await pool.query(
    `
    INSERT INTO room_availability_blocks (room_id, owner_id, start_date, end_date, reason)
    VALUES (?, ?, ?, ?, ?)
    `,
    [roomId, ownerId, date, date, reason || null]
  );

  return result.insertId;
};

const deleteRoomBlockById = async (blockId) => {
  await pool.query(`DELETE FROM room_availability_blocks WHERE id = ?`, [blockId]);
};

module.exports = {
  getPropertyById,
  getRoomReservations,
  getPropertyReservations,
  getOwnerRoom,
  getOwnerProperty,
  getRoomBlocks,
  getPropertyBlocks,
  getRoomBlockByDate,
  insertRoomBlock,
  deleteRoomBlockById,
};
