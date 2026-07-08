const rateLimit = require("express-rate-limit");
const { errorResponse } = require("../utils/apiResponse");

const createRateLimitHandler = (message) => {
  return (_req, res) => {
    return errorResponse(res, message, 429);
  };
};

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("Too many login attempts. Please try again later"),
});

const registerRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("Too many registration attempts. Please try again later"),
});

const refreshTokenRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("Too many token refresh attempts. Please try again later"),
});

const forgotPasswordRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler(
    "Too many password reset requests. Please try again later"
  ),
});

const resetPasswordRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler(
    "Too many password reset attempts. Please try again later"
  ),
});

const resendVerificationEmailRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler(
    "Too many verification email requests. Please try again later"
  ),
});

module.exports = {
  loginRateLimit,
  registerRateLimit,
  refreshTokenRateLimit,
  forgotPasswordRateLimit,
  resetPasswordRateLimit,
  resendVerificationEmailRateLimit,
};
