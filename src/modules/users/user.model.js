const pool = require("../../config/db");

const USER_SELECT_FIELDS = `
  users.id,
  users.full_name,
  users.email,
  users.phone,
  users.password_hash,
  users.profile_image_url,
  users.gender,
  users.date_of_birth,
  users.address,
  users.last_login,
  users.email_verified_at,
  users.created_at,
  users.updated_at,
  roles.role_name,
  account_statuses.status_name
`;

const findUserById = async (userId) => {
  const [rows] = await pool.query(
    `SELECT
      ${USER_SELECT_FIELDS}
     FROM users
     JOIN roles ON users.role_id = roles.id
     JOIN account_statuses ON users.status_id = account_statuses.id
     WHERE users.id = ?
     LIMIT 1`,
    [userId]
  );

  return rows[0];
};

const buildUserFilters = ({ role, status, search } = {}) => {
  const clauses = [];
  const params = [];

  if (role) {
    clauses.push("roles.role_name = ?");
    params.push(role);
  }

  if (status) {
    clauses.push("account_statuses.status_name = ?");
    params.push(status);
  }

  if (search) {
    clauses.push("(users.full_name LIKE ? OR users.email LIKE ? OR users.phone LIKE ?)");
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  return {
    whereSql: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
};

const findUsers = async ({ role, status, search, limit, offset }) => {
  const { whereSql, params } = buildUserFilters({ role, status, search });
  const [rows] = await pool.query(
    `SELECT
      ${USER_SELECT_FIELDS}
     FROM users
     JOIN roles ON users.role_id = roles.id
     JOIN account_statuses ON users.status_id = account_statuses.id
     ${whereSql}
     ORDER BY users.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return rows;
};

const countUsers = async ({ role, status, search }) => {
  const { whereSql, params } = buildUserFilters({ role, status, search });
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM users
     JOIN roles ON users.role_id = roles.id
     JOIN account_statuses ON users.status_id = account_statuses.id
     ${whereSql}`,
    params
  );

  return rows[0].total;
};

const findStatusByName = async (statusName) => {
  const [rows] = await pool.query(
    "SELECT * FROM account_statuses WHERE status_name = ? LIMIT 1",
    [statusName]
  );

  return rows[0];
};

const updateProfile = async (userId, profile) => {
  await pool.query(
    `UPDATE users
     SET full_name = ?,
         phone = ?,
         profile_image_url = ?,
         gender = ?,
         date_of_birth = ?,
         address = ?
     WHERE id = ?`,
    [
      profile.full_name,
      profile.phone,
      profile.profile_image_url,
      profile.gender,
      profile.date_of_birth,
      profile.address,
      userId,
    ]
  );
};

const updatePassword = async (userId, passwordHash) => {
  await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [
    passwordHash,
    userId,
  ]);
};

const updateProfileImage = async (userId, profileImageUrl) => {
  await pool.query("UPDATE users SET profile_image_url = ? WHERE id = ?", [
    profileImageUrl,
    userId,
  ]);
};

const updateStatus = async (userId, statusId) => {
  await pool.query("UPDATE users SET status_id = ? WHERE id = ?", [statusId, userId]);
};

module.exports = {
  findUserById,
  findUsers,
  countUsers,
  findStatusByName,
  updateProfile,
  updatePassword,
  updateProfileImage,
  updateStatus,
};
