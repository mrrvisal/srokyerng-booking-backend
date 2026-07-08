const dotenv = require("dotenv");

dotenv.config();

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getRequired = (key) => {
  const value = process.env[key];

  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const parseList = (value, fallback = []) => {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .concat(fallback)
    .filter((item, index, list) => list.indexOf(item) === index);
};

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

const normalizeOrigin = (value) => {
  if (!value) {
    return "";
  }

  return String(value).trim().replace(/\/$/, "");
};

const env = {
  PORT: parseNumber(process.env.PORT, 5001),
  DB_HOST: getRequired("DB_HOST"),
  DB_PORT: parseNumber(process.env.DB_PORT, 3306),
  DB_USER: getRequired("DB_USER"),
  DB_PASSWORD: process.env.DB_PASSWORD || "",
  DB_NAME: getRequired("DB_NAME"),
  JWT_SECRET: getRequired("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "15m",
  REFRESH_TOKEN_EXPIRES_DAYS: parseNumber(process.env.REFRESH_TOKEN_EXPIRES_DAYS, 30),
  REFRESH_TOKEN_COOKIE_SECURE: process.env.REFRESH_TOKEN_COOKIE_SECURE === "true",
  REFRESH_TOKEN_COOKIE_SAME_SITE: process.env.REFRESH_TOKEN_COOKIE_SAME_SITE || "lax",
  FRONTEND_URL: frontendUrl,
  FRONTEND_URLS: parseList(process.env.FRONTEND_URLS, [frontendUrl]).map(normalizeOrigin),
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID || "",
  FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET || "",
  FACEBOOK_GRAPH_API_VERSION: process.env.FACEBOOK_GRAPH_API_VERSION || "v23.0",
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: parseNumber(process.env.SMTP_PORT, 587),
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || "",
  SMTP_FROM: process.env.SMTP_FROM || "",
  SMTP_SECURE: process.env.SMTP_SECURE === "true",
  NODE_ENV: process.env.NODE_ENV || "development",
};

// These two are easy to get right in dev and forget to harden before a real
// deploy, so fail loudly in production and just warn otherwise.
const isProduction = env.NODE_ENV === "production";
const weakJwtSecret = env.JWT_SECRET.length < 32;
const insecureRefreshCookie = !env.REFRESH_TOKEN_COOKIE_SECURE;

if (weakJwtSecret) {
  const message = `JWT_SECRET is only ${env.JWT_SECRET.length} characters long — use a long, random value (32+ chars, e.g. \`openssl rand -hex 32\`).`;
  if (isProduction) throw new Error(message);
  console.warn(`[env] Warning: ${message}`);
}

if (insecureRefreshCookie && isProduction) {
  throw new Error(
    "REFRESH_TOKEN_COOKIE_SECURE must be \"true\" in production (refresh-token cookie must be HTTPS-only)."
  );
} else if (insecureRefreshCookie) {
  console.warn(
    "[env] Warning: REFRESH_TOKEN_COOKIE_SECURE is false — fine for local HTTP dev, but must be \"true\" before any production/HTTPS deploy."
  );
}

module.exports = env;
