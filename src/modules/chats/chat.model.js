const pool = require("../../config/db");

const findPropertyById = async (propertyId) => {
  const [rows] = await pool.query(
    `
    SELECT p.id, p.property_name, p.owner_id, ps.status_name
    FROM properties p
    JOIN property_statuses ps ON ps.id = p.status_id
    WHERE p.id = ? AND p.deleted_at IS NULL
    `,
    [propertyId]
  );
  return rows[0];
};

const findReservationById = async (reservationId) => {
  const [rows] = await pool.query(
    `
    SELECT r.id, r.customer_id, r.room_id, rm.property_id, p.owner_id
    FROM reservations r
    JOIN rooms rm ON rm.id = r.room_id
    JOIN properties p ON p.id = rm.property_id
    WHERE r.id = ?
    `,
    [reservationId]
  );
  return rows[0];
};

const createConversation = async (data) => {
  const { property_id, reservation_id, customer_id, owner_id } = data;
  const [result] = await pool.query(
    `
    INSERT INTO chat_conversations (property_id, reservation_id, customer_id, owner_id, last_message_at)
    VALUES (?, ?, ?, ?, NOW())
    `,
    [property_id || null, reservation_id || null, customer_id, owner_id]
  );
  return result.insertId;
};

const findConversationByReservation = async (reservationId) => {
  const [rows] = await pool.query(
    `
    SELECT * FROM chat_conversations WHERE reservation_id = ?
    `,
    [reservationId]
  );
  return rows[0];
};

const createMessage = async (data) => {
  const { conversation_id, sender_id, message_body, attachment_url } = data;
  const body = message_body || (attachment_url ? "" : null);
  const [result] = await pool.query(
    `
    INSERT INTO chat_messages (conversation_id, sender_id, message_body, attachment_url)
    VALUES (?, ?, ?, ?)
    `,
    [conversation_id, sender_id, body, attachment_url || null]
  );
  return result.insertId;
};

const updateConversationLastMessage = async (conversationId) => {
  await pool.query(
    `
    UPDATE chat_conversations SET last_message_at = NOW() WHERE id = ?
    `,
    [conversationId]
  );
};

const findConversationById = async (conversationId) => {
  const [rows] = await pool.query(
    `
    SELECT cc.*, p.property_name, p.owner_id AS property_owner_id
    FROM chat_conversations cc
    LEFT JOIN properties p ON p.id = cc.property_id
    WHERE cc.id = ?
    `,
    [conversationId]
  );
  return rows[0];
};

const getConversationsForUser = async (userId) => {
  const [rows] = await pool.query(
    `
    SELECT
      cc.id,
      cc.property_id,
      cc.reservation_id,
      cc.customer_id,
      cc.owner_id,
      cc.status,
      cc.last_message_at,
      cc.created_at,
      cc.updated_at,
      p.property_name,
      IF(cc.customer_id = ?, own.full_name, cust.full_name) AS other_user_name,
      IF(cc.customer_id = ?, own.profile_image_url, cust.profile_image_url) AS other_user_avatar,
      IF(cc.customer_id = ?, 'owner', 'customer') AS other_user_role,
      (
        SELECT cm.message_body
        FROM chat_messages cm
        WHERE cm.conversation_id = cc.id
        ORDER BY cm.created_at DESC
        LIMIT 1
      ) AS last_message,
      (
        SELECT COUNT(*)
        FROM chat_messages cm
        WHERE cm.conversation_id = cc.id
        AND cm.sender_id != ?
        AND cm.is_read = FALSE
      ) AS unread_count
    FROM chat_conversations cc
    LEFT JOIN properties p ON p.id = cc.property_id
    LEFT JOIN users cust ON cust.id = cc.customer_id
    LEFT JOIN users own ON own.id = cc.owner_id
    WHERE cc.customer_id = ? OR cc.owner_id = ?
    ORDER BY cc.last_message_at DESC, cc.created_at DESC
    `,
    [userId, userId, userId, userId, userId, userId]
  );
  return rows;
};

const getMessagesByConversationId = async (conversationId) => {
  const [rows] = await pool.query(
    `
    SELECT
      cm.id,
      cm.conversation_id,
      cm.sender_id,
      cm.message_body,
      cm.attachment_url,
      cm.is_read,
      cm.read_at,
      cm.created_at,
      u.full_name AS sender_name
    FROM chat_messages cm
    JOIN users u ON u.id = cm.sender_id
    WHERE cm.conversation_id = ?
    ORDER BY cm.created_at ASC
    `,
    [conversationId]
  );
  return rows;
};

const markMessagesAsRead = async (conversationId, userId) => {
  const [result] = await pool.query(
    `
    UPDATE chat_messages
    SET is_read = TRUE, read_at = NOW()
    WHERE conversation_id = ?
    AND sender_id != ?
    AND is_read = FALSE
    `,
    [conversationId, userId]
  );
  return result.affectedRows;
};

const findMessageById = async (messageId) => {
  const [rows] = await pool.query(
    `
    SELECT * FROM chat_messages WHERE id = ?
    `,
    [messageId]
  );
  return rows[0];
};

const deleteMessage = async (messageId) => {
  await pool.query(
    `
    DELETE FROM chat_messages WHERE id = ?
    `,
    [messageId]
  );
};

module.exports = {
  findPropertyById,
  findReservationById,
  createConversation,
  findConversationByReservation,
  createMessage,
  updateConversationLastMessage,
  findConversationById,
  getConversationsForUser,
  getMessagesByConversationId,
  markMessagesAsRead,
  findMessageById,
  deleteMessage,
};