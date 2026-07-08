const pool = require("../../config/db");

// ─── Full payment SELECT used for consistent return shape ──────────
const PAYMENT_SELECT = `
  SELECT
    pay.id,
    pay.reservation_id,
    pay.customer_id,
    pay.owner_id,
    pay.amount,
    pay.currency,
    pay.transaction_reference,
    pay.rejection_reason,
    pay.receipt_image_url,
    pay.verified_at,
    pay.paid_at,
    pay.created_at,
    pay.updated_at,

    -- payment method
    pm.id         AS payment_method_id,
    pm.method_name,

    -- payment status
    ps.id         AS payment_status_id,
    ps.status_name,
    ps.status_name AS payment_status,

    -- customer
    cu.full_name  AS customer_name,
    cu.email      AS customer_email,
    cu.phone      AS customer_phone,

    -- reservation
    res.check_in_date,
    res.check_out_date,
    res.total_nights,
    res.reservation_status,

    -- room & property
    r.room_name,
    p.property_name,
    p.id          AS property_id,

    -- selected owner payment account
    opa.id        AS owner_payment_account_id,
    opa.account_name,
    opa.account_number,
    opa.qr_image_url,

    -- admin who verified
    pay.verified_by,
    adm.full_name AS verified_by_name
  FROM payments pay
  LEFT JOIN owner_payment_accounts opa ON pay.owner_payment_account_id = opa.id
  JOIN payment_methods  pm  ON pay.payment_method_id  = pm.id
  JOIN payment_statuses ps  ON pay.payment_status_id  = ps.id
  JOIN users            cu  ON pay.customer_id        = cu.id
  JOIN reservations     res ON pay.reservation_id     = res.id
  JOIN rooms            r   ON res.room_id            = r.id
  JOIN properties       p   ON r.property_id          = p.id
  LEFT JOIN users       adm ON pay.verified_by        = adm.id
`;

// ─── Lookups ──────────────────────────────────────────────────────

const findReservationById = async (reservationId) => {
  const [rows] = await pool.query(
    `SELECT res.*,
            r.property_id,
            p.owner_id
     FROM reservations res
     JOIN rooms       r ON res.room_id      = r.id
     JOIN properties  p ON r.property_id   = p.id
     WHERE res.id = ?
     LIMIT 1`,
    [reservationId]
  );
  return rows[0];
};

const findPaymentMethodById = async (methodId) => {
  const [rows] = await pool.query(
    "SELECT * FROM payment_methods WHERE id = ? AND is_active = TRUE LIMIT 1",
    [methodId]
  );
  return rows[0];
};

const findOwnerPaymentAccountById = async (accountId, activeOnly = true) => {
  let sql = `SELECT opa.*, pm.method_name
     FROM owner_payment_accounts opa
     JOIN payment_methods pm ON opa.payment_method_id = pm.id
     WHERE opa.id = ?`;

  const params = [accountId];
  if (activeOnly) {
    sql += " AND opa.is_active = TRUE";
  }
  sql += " LIMIT 1";

  const [rows] = await pool.query(sql, params);
  return rows[0];
};

const findOwnerPaymentAccountsByOwnerId = async (ownerId) => {
  const [rows] = await pool.query(
    `SELECT opa.id,
            opa.owner_id,
            opa.payment_method_id,
            pm.method_name,
            opa.account_name,
            opa.account_number,
            opa.qr_image_url,
            opa.is_active,
            opa.created_at,
            opa.updated_at
     FROM owner_payment_accounts opa
     JOIN payment_methods pm ON opa.payment_method_id = pm.id
     WHERE opa.owner_id = ?
     ORDER BY opa.created_at DESC`,
    [ownerId]
  );
  return rows;
};

const findActiveOwnerPaymentAccountsByOwnerId = async (ownerId) => {
  const [rows] = await pool.query(
    `SELECT opa.id,
            opa.owner_id,
            opa.payment_method_id,
            pm.method_name,
            opa.account_name,
            opa.account_number,
            opa.qr_image_url
     FROM owner_payment_accounts opa
     JOIN payment_methods pm ON opa.payment_method_id = pm.id
     WHERE opa.owner_id = ? AND opa.is_active = TRUE
     ORDER BY opa.created_at DESC`,
    [ownerId]
  );
  return rows;
};

const findActiveOwnerPaymentAccountsByPropertyId = async (propertyId) => {
  const [rows] = await pool.query(
    `SELECT opa.id,
            opa.owner_id,
            opa.payment_method_id,
            pm.method_name,
            opa.account_name,
            opa.account_number,
            opa.qr_image_url
     FROM owner_payment_accounts opa
     JOIN payment_methods pm ON opa.payment_method_id = pm.id
     JOIN users o ON opa.owner_id = o.id
     JOIN properties p ON p.owner_id = o.id
     WHERE p.id = ? AND opa.is_active = TRUE
     ORDER BY opa.created_at DESC`,
    [propertyId]
  );
  return rows;
};

const findOwnerActivePaymentAccountByOwnerAndMethod = async (ownerId, paymentMethodId) => {
  const [rows] = await pool.query(
    `SELECT * FROM owner_payment_accounts
     WHERE owner_id = ?
       AND payment_method_id = ?
       AND is_active = TRUE
     LIMIT 1`,
    [ownerId, paymentMethodId]
  );
  return rows[0];
};

const findOwnerPaymentAccounts = async (filters = {}) => {
  let query = `SELECT opa.id,
                      opa.owner_id,
                      opa.payment_method_id,
                      pm.method_name,
                      opa.account_name,
                      opa.account_number,
                      opa.qr_image_url,
                      opa.is_active,
                      opa.created_at,
                      opa.updated_at
               FROM owner_payment_accounts opa
               JOIN payment_methods pm ON opa.payment_method_id = pm.id
               WHERE 1=1`;
  const params = [];

  if (filters.owner_id) {
    query += " AND opa.owner_id = ?";
    params.push(filters.owner_id);
  }
  if (filters.payment_method_id) {
    query += " AND opa.payment_method_id = ?";
    params.push(filters.payment_method_id);
  }
  if (typeof filters.is_active !== "undefined") {
    query += " AND opa.is_active = ?";
    params.push(filters.is_active ? 1 : 0);
  }

  query += " ORDER BY opa.created_at DESC";
  const [rows] = await pool.query(query, params);
  return rows;
};

const createOwnerPaymentAccount = async ({
  ownerId,
  paymentMethodId,
  accountName,
  accountNumber,
  qrImageUrl,
  isActive = true,
}) => {
  const [result] = await pool.query(
    `INSERT INTO owner_payment_accounts
       (owner_id, payment_method_id, account_name, account_number, qr_image_url, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [ownerId, paymentMethodId, accountName, accountNumber || null, qrImageUrl || null, isActive]
  );
  return result.insertId;
};

const updateOwnerPaymentAccount = async (accountId, updates) => {
  const sets = [];
  const params = [];

  if (Object.hasOwn(updates, "payment_method_id")) {
    sets.push("payment_method_id = ?");
    params.push(updates.payment_method_id);
  }
  if (Object.hasOwn(updates, "account_name")) {
    sets.push("account_name = ?");
    params.push(updates.account_name);
  }
  if (Object.hasOwn(updates, "account_number")) {
    sets.push("account_number = ?");
    params.push(updates.account_number || null);
  }
  if (Object.hasOwn(updates, "qr_image_url")) {
    sets.push("qr_image_url = ?");
    params.push(updates.qr_image_url || null);
  }
  if (Object.hasOwn(updates, "is_active")) {
    sets.push("is_active = ?");
    params.push(updates.is_active ? 1 : 0);
  }

  if (sets.length === 0) {
    return;
  }

  params.push(accountId);

  await pool.query(
    `UPDATE owner_payment_accounts
     SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    params
  );
};

const setOwnerPaymentAccountActive = async (accountId, isActive) => {
  await pool.query(
    `UPDATE owner_payment_accounts
     SET is_active = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [isActive ? 1 : 0, accountId]
  );
};

const deleteOwnerPaymentAccount = async (accountId) => {
  const [result] = await pool.query(
    `DELETE FROM owner_payment_accounts WHERE id = ?`,
    [accountId]
  );
  return result.affectedRows > 0;
};

const findPaymentsByOwnerPaymentAccountId = async (accountId) => {
  const [rows] = await pool.query(
    `SELECT id FROM payments WHERE owner_payment_account_id = ?`,
    [accountId]
  );
  return rows;
};

const nullifyOwnerPaymentAccountOnPayments = async (accountId) => {
  await pool.query(
    `UPDATE payments SET owner_payment_account_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE owner_payment_account_id = ?`,
    [accountId]
  );
};

const findPaymentStatusByName = async (statusName) => {
  const [rows] = await pool.query(
    "SELECT * FROM payment_statuses WHERE status_name = ? LIMIT 1",
    [statusName]
  );
  return rows[0];
};

const findExistingPaymentForReservation = async (reservationId) => {
  const [rows] = await pool.query(
    "SELECT id, payment_status_id FROM payments WHERE reservation_id = ? LIMIT 1",
    [reservationId]
  );
  return rows[0];
};

const findPaymentByReservationId = async (reservationId) => {
  const [rows] = await pool.query(`${PAYMENT_SELECT} WHERE pay.reservation_id = ? LIMIT 1`, [
    reservationId,
  ]);
  return rows[0];
};

// ─── CRUD ─────────────────────────────────────────────────────────

const createPayment = async ({
  reservationId,
  customerId,
  ownerId,
  paymentMethodId,
  ownerPaymentAccountId,
  paymentStatusId,
  amount,
  transactionReference,
}) => {
  const [result] = await pool.query(
    `INSERT INTO payments
       (reservation_id, customer_id, owner_id,
        payment_method_id, owner_payment_account_id, payment_status_id,
        amount, currency, transaction_reference)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'USD', ?)`,
    [
      reservationId,
      customerId,
      ownerId,
      paymentMethodId,
      ownerPaymentAccountId || null,
      paymentStatusId,
      amount,
      transactionReference || null,
    ]
  );
  return result.insertId;
};

const findPaymentById = async (paymentId) => {
  const [rows] = await pool.query(`${PAYMENT_SELECT} WHERE pay.id = ? LIMIT 1`, [
    paymentId,
  ]);
  return rows[0];
};

// Locks the payment row for the duration of a transaction so concurrent
// verify/reject/refund calls on the same payment serialize instead of racing.
// Must be called with a connection that has an open transaction.
const lockPaymentById = async (connection, paymentId) => {
  const [rows] = await connection.query(
    `SELECT pay.*, ps.status_name
     FROM payments pay
     JOIN payment_statuses ps ON ps.id = pay.payment_status_id
     WHERE pay.id = ?
     FOR UPDATE`,
    [paymentId]
  );
  return rows[0];
};

const findPaymentsByCustomer = async (customerId, filters = {}) => {
  let query = `${PAYMENT_SELECT} WHERE pay.customer_id = ?`;
  const params = [customerId];

  if (filters.status) {
    query += " AND ps.status_name = ?";
    params.push(filters.status);
  }

  query += " ORDER BY pay.created_at DESC";
  const [rows] = await pool.query(query, params);
  return rows;
};

const findPaymentsByOwner = async (ownerId, filters = {}) => {
  let query = `${PAYMENT_SELECT} WHERE pay.owner_id = ?`;
  const params = [ownerId];

  if (filters.status) {
    query += " AND ps.status_name = ?";
    params.push(filters.status);
  }
  if (filters.customer_id) {
    query += " AND pay.customer_id = ?";
    params.push(filters.customer_id);
  }
  if (filters.reservation_id) {
    query += " AND pay.reservation_id = ?";
    params.push(filters.reservation_id);
  }

  query += " ORDER BY pay.created_at DESC";
  const [rows] = await pool.query(query, params);
  return rows;
};

const findAllPayments = async (filters = {}) => {
  let query = `${PAYMENT_SELECT} WHERE 1=1`;
  const params = [];

  if (filters.status) {
    query += " AND ps.status_name = ?";
    params.push(filters.status);
  }
  if (filters.customer_id) {
    query += " AND pay.customer_id = ?";
    params.push(filters.customer_id);
  }
  if (filters.owner_id) {
    query += " AND pay.owner_id = ?";
    params.push(filters.owner_id);
  }

  query += " ORDER BY pay.created_at DESC";
  const [rows] = await pool.query(query, params);
  return rows;
};

const updatePaymentStatus = async (paymentId, statusId, extraFields = {}, connection = pool) => {
  const sets = ["payment_status_id = ?"];
  const params = [statusId];

  if (Object.hasOwn(extraFields, "verified_by")) {
    sets.push("verified_by = ?");
    params.push(extraFields.verified_by);
  }
  if (Object.hasOwn(extraFields, "verified_at")) {
    sets.push("verified_at = ?");
    params.push(extraFields.verified_at);
  }
  if (Object.hasOwn(extraFields, "paid_at")) {
    sets.push("paid_at = ?");
    params.push(extraFields.paid_at);
  }
  if (Object.hasOwn(extraFields, "transaction_reference")) {
    sets.push("transaction_reference = ?");
    params.push(extraFields.transaction_reference);
  }
  if (Object.hasOwn(extraFields, "rejection_reason")) {
    sets.push("rejection_reason = ?");
    params.push(extraFields.rejection_reason);
  }

  params.push(paymentId);

  await connection.query(
    `UPDATE payments SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    params
  );
};

const updateReceiptUrl = async (paymentId, receiptImageUrl, statusId, transactionReference = null) => {
  await pool.query(
    `UPDATE payments
     SET receipt_image_url = ?,
         payment_status_id = ?,
         transaction_reference = COALESCE(?, transaction_reference),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [receiptImageUrl, statusId, transactionReference, paymentId]
  );
};

module.exports = {
  findReservationById,
  lockPaymentById,
  findPaymentMethodById,
  findOwnerPaymentAccountById,
  findOwnerPaymentAccountsByOwnerId,
  findActiveOwnerPaymentAccountsByOwnerId,
  findActiveOwnerPaymentAccountsByPropertyId,
  findOwnerActivePaymentAccountByOwnerAndMethod,
  findOwnerPaymentAccounts,
  findPaymentStatusByName,
  findExistingPaymentForReservation,
  findPaymentByReservationId,
  createPayment,
  createOwnerPaymentAccount,
  updateOwnerPaymentAccount,
  setOwnerPaymentAccountActive,
  deleteOwnerPaymentAccount,
  findPaymentsByOwnerPaymentAccountId,
  nullifyOwnerPaymentAccountOnPayments,
  findPaymentById,
  findPaymentsByCustomer,
  findPaymentsByOwner,
  findAllPayments,
  updatePaymentStatus,
  updateReceiptUrl,
};