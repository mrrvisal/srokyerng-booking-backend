const pool = require("../../config/db");

const NOTIFICATION_SELECT = `
  notifications.id,
  notifications.user_id,
  notifications.notification_type,
  notifications.channel,
  notifications.title,
  notifications.message,
  notifications.metadata,
  notifications.delivery_status,
  notifications.is_read,
  notifications.read_at,
  notifications.archived_at,
  notifications.sent_at,
  notifications.created_at,
  notifications.updated_at
`;

const createNotification = async ({
  userId,
  type,
  title,
  message,
  metadata = null,
  channel = "in_app",
  deliveryStatus = "delivered",
  sentAt = null,
}) => {
  const [result] = await pool.query(
    `INSERT INTO notifications
      (user_id, notification_type, channel, title, message, metadata, delivery_status, sent_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      type,
      channel,
      title,
      message,
      metadata ? JSON.stringify(metadata) : null,
      deliveryStatus,
      sentAt,
    ]
  );

  return result.insertId;
};

const buildNotificationFilters = ({ userId, status, type }) => {
  const clauses = ["notifications.user_id = ?"];
  const params = [userId];

  if (status === "archived") {
    clauses.push("notifications.archived_at IS NOT NULL");
  } else {
    clauses.push("notifications.archived_at IS NULL");
    if (status === "unread") {
      clauses.push("notifications.is_read = FALSE");
    }
    if (status === "read") {
      clauses.push("notifications.is_read = TRUE");
    }
  }

  if (type) {
    clauses.push("notifications.notification_type = ?");
    params.push(type);
  }

  return {
    whereSql: `WHERE ${clauses.join(" AND ")}`,
    params,
  };
};

const findNotificationsByUserId = async ({ userId, status, type, limit, offset }) => {
  const { whereSql, params } = buildNotificationFilters({ userId, status, type });
  const [rows] = await pool.query(
    `SELECT ${NOTIFICATION_SELECT}
     FROM notifications
     ${whereSql}
     ORDER BY notifications.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return rows;
};

const countNotificationsByUserId = async ({ userId, status, type }) => {
  const { whereSql, params } = buildNotificationFilters({ userId, status, type });
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM notifications
     ${whereSql}`,
    params
  );

  return rows[0].total;
};

const countUnreadByUserId = async (userId) => {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM notifications
     WHERE user_id = ? AND is_read = FALSE AND archived_at IS NULL`,
    [userId]
  );

  return rows[0].total;
};

const findNotificationForUser = async (notificationId, userId) => {
  const [rows] = await pool.query(
    `SELECT ${NOTIFICATION_SELECT}
     FROM notifications
     WHERE id = ? AND user_id = ? AND archived_at IS NULL
     LIMIT 1`,
    [notificationId, userId]
  );

  return rows[0];
};

const markNotificationRead = async (notificationId, userId) => {
  await pool.query(
    `UPDATE notifications
     SET is_read = TRUE,
         read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE id = ? AND user_id = ?`,
    [notificationId, userId]
  );
};

const markAllNotificationsRead = async (userId) => {
  const [result] = await pool.query(
    `UPDATE notifications
     SET is_read = TRUE,
         read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE user_id = ? AND is_read = FALSE AND archived_at IS NULL`,
    [userId]
  );

  return result.affectedRows;
};

const archiveNotification = async (notificationId, userId) => {
  await pool.query(
    `UPDATE notifications
     SET archived_at = CURRENT_TIMESTAMP,
         is_read = TRUE,
         read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE id = ? AND user_id = ? AND archived_at IS NULL`,
    [notificationId, userId]
  );
};

const findUserEmailById = async (userId) => {
  const [rows] = await pool.query(
    `SELECT id, full_name, email
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId]
  );

  return rows[0];
};

module.exports = {
  createNotification,
  findNotificationsByUserId,
  countNotificationsByUserId,
  countUnreadByUserId,
  findNotificationForUser,
  markNotificationRead,
  markAllNotificationsRead,
  archiveNotification,
  findUserEmailById,
};
