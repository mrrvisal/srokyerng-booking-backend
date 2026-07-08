const pool = require("../src/config/db");
const { hashPassword } = require("../src/utils/hashPassword");

const getRequired = (key) => {
  const value = process.env[key];

  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value.trim();
};

const createAdmin = async () => {
  const fullName = process.env.ADMIN_FULL_NAME?.trim() || "System Admin";
  const email = getRequired("ADMIN_EMAIL").toLowerCase();
  const password = getRequired("ADMIN_PASSWORD");

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters");
  }

  const [[adminRole]] = await pool.query(
    "SELECT id FROM roles WHERE role_name = ? LIMIT 1",
    ["admin"]
  );
  const [[activeStatus]] = await pool.query(
    "SELECT id FROM account_statuses WHERE status_name = ? LIMIT 1",
    ["active"]
  );

  if (!adminRole || !activeStatus) {
    throw new Error("Run role and account status seed files before creating admin");
  }

  const passwordHash = await hashPassword(password);

  await pool.query(
    `INSERT INTO users
      (role_id, status_id, full_name, email, password_hash, email_verified_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE
      role_id = VALUES(role_id),
      status_id = VALUES(status_id),
      full_name = VALUES(full_name),
      password_hash = VALUES(password_hash),
      email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP)`,
    [adminRole.id, activeStatus.id, fullName, email, passwordHash]
  );

  console.log(`Admin account is ready: ${email}`);
};

createAdmin()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
