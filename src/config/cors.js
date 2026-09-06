const env = require("./env");

/**
 * Centralized CORS allow-listing shared by the Express app (REST) and the
 * Socket.IO server, so both layers always agree on what's allowed.
 *
 * Allowed by default (no env-var surgery needed):
 *  - loopback origins (http://localhost:5173, 127.0.0.1, etc.) during dev
 *  - any https://*.onrender.com host (Render Free hosts are on this suffix)
 *  - any origin explicitly listed in FRONTEND_URLS (custom domains, etc.)
 */

const isLoopbackOrigin = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?$/.test(origin || "");

const isOnRenderOrigin = (origin) => {
  if (!/^https:\/\//i.test(origin || "")) return false;

  try {
    const { hostname } = new URL(origin);
    return hostname === "onrender.com" || hostname.endsWith(".onrender.com");
  } catch {
    return false;
  }
};

const buildAllowedOrigins = () => new Set(env.FRONTEND_URLS);

const isAllowedOrigin = (origin) => {
  if (!origin) {
    // Server-to-server / non-browser (curl, health checks) calls.
    return true;
  }

  const normalizedOrigin = origin.replace(/\/+$/, "");

  if (isLoopbackOrigin(normalizedOrigin) || isOnRenderOrigin(normalizedOrigin)) {
    return true;
  }

  const allowedOrigins = buildAllowedOrigins();
  if (allowedOrigins.has(normalizedOrigin)) {
    return true;
  }

  const originWithoutPort = normalizedOrigin.replace(/:\d+$/, "");
  return allowedOrigins.has(originWithoutPort);
};

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    const error = new Error(`CORS origin not allowed: ${origin}`);
    error.statusCode = 403;
    return callback(error);
  },
  credentials: true,
};

module.exports = {
  isAllowedOrigin,
  isLoopbackOrigin,
  isOnRenderOrigin,
  corsOptions,
};