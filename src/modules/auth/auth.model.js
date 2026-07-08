const pool = require("../../config/db");

const findRoleByName = async (roleName) => {
  const [rows] = await pool.query("SELECT * FROM roles WHERE role_name = ? LIMIT 1", [
    roleName,
  ]);

  return rows[0];
};

const findStatusByName = async (statusName) => {
  const [rows] = await pool.query(
    "SELECT * FROM account_statuses WHERE status_name = ? LIMIT 1",
    [statusName]
  );

  return rows[0];
};

const findUserByEmail = async (email) => {
  const [rows] = await pool.query(
    `SELECT 
      users.*,
      roles.role_name,
      account_statuses.status_name
     FROM users
     JOIN roles ON users.role_id = roles.id
     JOIN account_statuses ON users.status_id = account_statuses.id
     WHERE users.email = ?
     LIMIT 1`,
    [email]
  );

  return rows[0];
};

const findUserById = async (userId) => {
  const [rows] = await pool.query(
    `SELECT
      users.id,
      users.full_name,
      users.email,
      users.phone,
      users.profile_image_url,
      users.last_login,
      users.email_verified_at,
      users.google_id,
      roles.role_name,
      account_statuses.status_name
     FROM users
     JOIN roles ON users.role_id = roles.id
     JOIN account_statuses ON users.status_id = account_statuses.id
     WHERE users.id = ?
     LIMIT 1`,
    [userId]
  );

  return rows[0];
};

const findUserByGoogleId = async (googleId) => {
  const [rows] = await pool.query(
    "SELECT id FROM users WHERE google_id = ? LIMIT 1",
    [googleId]
  );

  return rows[0];
};

const linkGoogleId = async (userId, googleId) => {
  await pool.query("UPDATE users SET google_id = ? WHERE id = ?", [
    googleId,
    userId,
  ]);
};

const unlinkGoogleId = async (userId) => {
  await pool.query("UPDATE users SET google_id = NULL WHERE id = ?", [
    userId,
  ]);
};

const createUser = async ({ roleId, statusId, fullName, email, phone, passwordHash }) => {
  const [result] = await pool.query(
    `INSERT INTO users 
      (role_id, status_id, full_name, email, phone, password_hash)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [roleId, statusId, fullName, email, phone || null, passwordHash]
  );

  return result.insertId;
};

const createVerifiedUser = async ({
  roleId,
  statusId,
  fullName,
  email,
  phone,
  passwordHash,
  profileImageUrl,
}) => {
  const [result] = await pool.query(
    `INSERT INTO users 
      (role_id, status_id, full_name, email, phone, password_hash, profile_image_url, email_verified_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      roleId,
      statusId,
      fullName,
      email,
      phone || null,
      passwordHash,
      profileImageUrl || null,
    ]
  );

  return result.insertId;
};

const updateLastLogin = async (userId) => {
  await pool.query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [
    userId,
  ]);
};

const markUnusedPasswordResetTokensAsUsed = async (userId) => {
  await pool.query(
    `UPDATE password_reset_tokens
     SET used_at = CURRENT_TIMESTAMP
     WHERE user_id = ?
       AND used_at IS NULL`,
    [userId]
  );
};

const createPasswordResetToken = async ({ userId, tokenHash, expiresAt }) => {
  const [result] = await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES (?, ?, ?)`,
    [userId, tokenHash, expiresAt]
  );

  return result.insertId;
};

const findValidPasswordResetToken = async (tokenHash) => {
  const [rows] = await pool.query(
    `SELECT
      password_reset_tokens.*,
      users.email,
      users.full_name,
      users.password_hash,
      roles.role_name,
      account_statuses.status_name
     FROM password_reset_tokens
     JOIN users ON password_reset_tokens.user_id = users.id
     JOIN roles ON users.role_id = roles.id
     JOIN account_statuses ON users.status_id = account_statuses.id
     WHERE password_reset_tokens.token_hash = ?
       AND password_reset_tokens.used_at IS NULL
       AND password_reset_tokens.expires_at > CURRENT_TIMESTAMP
     LIMIT 1`,
    [tokenHash]
  );

  return rows[0];
};

const markPasswordResetTokenAsUsed = async (tokenId) => {
  await pool.query(
    "UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?",
    [tokenId]
  );
};

const updatePassword = async (userId, passwordHash) => {
  await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [
    passwordHash,
    userId,
  ]);
};

const createRefreshToken = async ({
  userId,
  tokenHash,
  userAgent,
  ipAddress,
  expiresAt,
}) => {
  const [result] = await pool.query(
    `INSERT INTO refresh_tokens
      (user_id, token_hash, user_agent, ip_address, expires_at, last_used_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [userId, tokenHash, userAgent || null, ipAddress || null, expiresAt]
  );

  return result.insertId;
};

const findValidRefreshToken = async (tokenHash) => {
  const [rows] = await pool.query(
    `SELECT
      refresh_tokens.*,
      users.full_name,
      users.email,
      users.phone,
      users.profile_image_url,
      users.last_login,
      users.email_verified_at,
      roles.role_name,
      account_statuses.status_name
     FROM refresh_tokens
     JOIN users ON refresh_tokens.user_id = users.id
     JOIN roles ON users.role_id = roles.id
     JOIN account_statuses ON users.status_id = account_statuses.id
     WHERE refresh_tokens.token_hash = ?
       AND refresh_tokens.revoked_at IS NULL
       AND refresh_tokens.expires_at > CURRENT_TIMESTAMP
     LIMIT 1`,
    [tokenHash]
  );

  return rows[0];
};

const revokeRefreshToken = async (tokenHash) => {
  await pool.query(
    `UPDATE refresh_tokens
     SET revoked_at = CURRENT_TIMESTAMP
     WHERE token_hash = ?
       AND revoked_at IS NULL`,
    [tokenHash]
  );
};

const revokeRefreshTokensForUser = async (userId) => {
  await pool.query(
    `UPDATE refresh_tokens
     SET revoked_at = CURRENT_TIMESTAMP
     WHERE user_id = ?
       AND revoked_at IS NULL`,
    [userId]
  );
};

const findActiveRefreshTokensByUserId = async (userId) => {
  const [rows] = await pool.query(
    `SELECT
      id,
      user_agent,
      ip_address,
      expires_at,
      last_used_at,
      created_at
     FROM refresh_tokens
     WHERE user_id = ?
       AND revoked_at IS NULL
       AND expires_at > CURRENT_TIMESTAMP
     ORDER BY last_used_at DESC, created_at DESC`,
    [userId]
  );

  return rows;
};

const revokeRefreshTokenByIdForUser = async (tokenId, userId) => {
  const [result] = await pool.query(
    `UPDATE refresh_tokens
     SET revoked_at = CURRENT_TIMESTAMP
     WHERE id = ?
       AND user_id = ?
       AND revoked_at IS NULL`,
    [tokenId, userId]
  );

  return result.affectedRows;
};

const markUnusedEmailVerificationTokensAsUsed = async (userId) => {
  await pool.query(
    `UPDATE email_verification_tokens
     SET used_at = CURRENT_TIMESTAMP
     WHERE user_id = ?
       AND used_at IS NULL`,
    [userId]
  );
};

const createEmailVerificationToken = async ({ userId, tokenHash, expiresAt }) => {
  const [result] = await pool.query(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
     VALUES (?, ?, ?)`,
    [userId, tokenHash, expiresAt]
  );

  return result.insertId;
};

const findValidEmailVerificationToken = async (tokenHash) => {
  const [rows] = await pool.query(
    `SELECT
      email_verification_tokens.*,
      users.email,
      users.full_name,
      users.email_verified_at,
      roles.role_name,
      account_statuses.status_name
     FROM email_verification_tokens
     JOIN users ON email_verification_tokens.user_id = users.id
     JOIN roles ON users.role_id = roles.id
     JOIN account_statuses ON users.status_id = account_statuses.id
     WHERE email_verification_tokens.token_hash = ?
       AND email_verification_tokens.used_at IS NULL
       AND email_verification_tokens.expires_at > CURRENT_TIMESTAMP
     LIMIT 1`,
    [tokenHash]
  );

  return rows[0];
};

const markEmailVerificationTokenAsUsed = async (tokenId) => {
  await pool.query(
    "UPDATE email_verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?",
    [tokenId]
  );
};

const markEmailAsVerified = async (userId) => {
  await pool.query(
    `UPDATE users
     SET email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP)
     WHERE id = ?`,
    [userId]
  );
};

module.exports = {
  findRoleByName,
  findStatusByName,
  findUserByEmail,
  findUserById,
  findUserByGoogleId,
  linkGoogleId,
  unlinkGoogleId,
  createUser,
  createVerifiedUser,
  updateLastLogin,
  markUnusedPasswordResetTokensAsUsed,
  createPasswordResetToken,
  findValidPasswordResetToken,
  markPasswordResetTokenAsUsed,
  updatePassword,
  createRefreshToken,
  findValidRefreshToken,
  revokeRefreshToken,
  revokeRefreshTokensForUser,
  findActiveRefreshTokensByUserId,
  revokeRefreshTokenByIdForUser,
  markUnusedEmailVerificationTokensAsUsed,
  createEmailVerificationToken,
  findValidEmailVerificationToken,
  markEmailVerificationTokenAsUsed,
  markEmailAsVerified,
};
