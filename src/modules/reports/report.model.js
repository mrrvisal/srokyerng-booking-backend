const pool = require("../../config/db");

const create = async (data) => {
  const [rows] = await pool.query(
    `
    INSERT INTO reports (
      reporter_id,
      property_id,
      reservation_id,
      payment_id,
      report_type,
      subject,
      description
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      data.reporter_id,
      data.property_id,
      data.reservation_id,
      data.payment_id,
      data.report_type,
      data.subject,
      data.description,
    ]
  );

  return rows;
};

const getById = async (id) => {
  const [rows] = await pool.query(
    `
    SELECT *
    FROM reports
    WHERE id = ?
    `,
    [id]
  );

  return rows[0];
};

const getMyReports = async (userId) => {
  const [rows] = await pool.query(
    `
    SELECT *
    FROM reports
    WHERE reporter_id = ?
    ORDER BY created_at DESC
    `,
    [userId]
  );

  return rows;
};

const getAll = async () => {
  const [rows] = await pool.query(
    `
    SELECT
      r.*,
      u.full_name AS reporter_name
    FROM reports r
    JOIN users u
      ON u.id = r.reporter_id
    ORDER BY r.created_at DESC
    `
  );

  return rows;
};

const updateStatus = async (reportId, status) => {
  const [rows] = await pool.query(
    `
    UPDATE reports
    SET status = ?
    WHERE id = ?
    `,
    [status, reportId]
  );

  return rows;
};

const resolve = async (reportId, adminId, note) => {
  const [rows] = await pool.query(
    `
    UPDATE reports
    SET
      status='resolved',
      resolution_note=?,
      resolved_by=?,
      resolved_at=NOW()
    WHERE id=?
    `,
    [note, adminId, reportId]
  );

  return rows;
};

const getReportByIdAdmin = async (reportId) => {
  const [rows] = await pool.query(
    `
    SELECT
      r.*,
      u.full_name AS reporter_name,
      admin.full_name AS assigned_admin_name
    FROM reports r

    JOIN users u
      ON r.reporter_id = u.id

    LEFT JOIN users admin
      ON r.assigned_admin_id = admin.id

    WHERE r.id = ?
    `,
    [reportId]
  );

  return rows[0];
};

module.exports = {
  create,
  getById,
  getMyReports,
  getAll,
  updateStatus,
  resolve,
  getReportByIdAdmin,
};
