const fs = require("fs");
const mysql = require("mysql2/promise");
const env = require("./env");

/**
 * Managed MySQL hosts that mandate TLS (e.g. TiDB Cloud Serverless tier)
 * reject insecure connections outright ("insecure transport" error), so TLS is
 * always enabled for them — even if SSL_CERT_PATH is not configured.
 */
const MANAGED_MYSQL_HOST_PATTERN = /tidbcloud\.com$/i;
const isManagedHost = MANAGED_MYSQL_HOST_PATTERN.test(env.DB_HOST);

/**
 * Build the mysql2 `ssl` option.
 *
 * If `SSL_CERT_PATH` is explicitly set it MUST be usable — silently falling
 * back to an insecure connection would only reproduce the confusing
 * "Connections using insecure transport are prohibited" error at query time.
 */
const buildSslConfig = () => {
  if (!env.SSL_CERT_PATH && !env.DB_SSL && !isManagedHost) {
    return {};
  }

  const readCaBundle = () => {
    try {
      return fs.readFileSync(env.SSL_CERT_PATH, "utf8");
    } catch (error) {
      throw new Error(
        `[db] SSL_CERT_PATH "${env.SSL_CERT_PATH}" could not be read (` +
          `${error.code || error.message}). Fix the path in .env, or set DB_SSL=true ` +
          "to force TLS without certificate verification (dev only).",
        { cause: error }
      );
    }
  };

  if (env.SSL_CERT_PATH) {
    const ca = readCaBundle();

    if (!ca.trim()) {
      throw new Error(
        `[db] SSL_CERT_PATH "${env.SSL_CERT_PATH}" is empty. Fix the path in .env, ` +
          "or set DB_SSL=true to force TLS without certificate verification (dev only)."
      );
    }

    return { ssl: { ca } };
  }

  // TLS is required for managed hosts (no CA configured) or explicitly forced
  // via DB_SSL. Skips certificate verification — for managed TiDB Cloud
  // hosts, set SSL_CERT_PATH in .env to restore full verification.
  console.warn(
    isManagedHost
      ? "[db] TLS forced for managed MySQL host — set SSL_CERT_PATH in .env to verify the server certificate."
      : "[db] TLS enabled via DB_SSL=true (skipping certificate verification — dev only)"
  );

  return { ssl: { rejectUnauthorized: false } };
};

const sslConfig = buildSslConfig();

if (sslConfig.ssl && sslConfig.ssl.ca) {
  console.log("[db] TLS enabled (server cert verified against CA bundle)");
} else if (sslConfig.ssl && sslConfig.ssl.rejectUnauthorized === false) {
  console.log(
    isManagedHost
      ? "[db] TLS enabled for managed host (certificate verification skipped)"
      : "[db] TLS enabled (skipping certificate verification — dev only)"
  );
} else {
  console.log("[db] TLS disabled (plain local MySQL)");
}

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ...sslConfig,
});

module.exports = pool;
