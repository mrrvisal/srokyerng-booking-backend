const env = require("../config/env");

const REFRESH_TOKEN_COOKIE_NAME = "refresh_token";

const getRefreshTokenCookieOptions = () => {
  const secure = env.REFRESH_TOKEN_COOKIE_SECURE;

  // Browsers reject a SameSite=None cookie that is not Secure, silently
  // dropping it on local HTTP. Fall back to "lax" in that case so the
  // refresh-token cookie is actually stored during development.
  const configuredSameSite = String(
    env.REFRESH_TOKEN_COOKIE_SAME_SITE || ""
  ).toLowerCase();
  const sameSite = configuredSameSite === "none" && !secure ? "lax" : configuredSameSite;

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: "/api/auth",
    maxAge: env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  };
};

const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, getRefreshTokenCookieOptions());
};

const clearRefreshTokenCookie = (res) => {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    ...getRefreshTokenCookieOptions(),
    maxAge: undefined,
  });
};

module.exports = {
  REFRESH_TOKEN_COOKIE_NAME,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
};
