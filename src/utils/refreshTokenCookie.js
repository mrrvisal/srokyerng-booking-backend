const env = require("../config/env");

const REFRESH_TOKEN_COOKIE_NAME = "refresh_token";

const getRefreshTokenCookieOptions = () => {
  return {
    httpOnly: true,
    secure: env.REFRESH_TOKEN_COOKIE_SECURE,
    sameSite: env.REFRESH_TOKEN_COOKIE_SAME_SITE,
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
