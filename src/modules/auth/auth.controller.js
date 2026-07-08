const authService = require("./auth.service");
const { successResponse, errorResponse } = require("../../utils/apiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const {
  REFRESH_TOKEN_COOKIE_NAME,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} = require("../../utils/refreshTokenCookie");
const {
  validateRegister,
  validateLogin,
  validateGoogleLogin,
  validateFacebookLogin,
  validateLinkGoogleAccount,
  validateForgotPassword,
  validateResetPassword,
  validateRefreshToken,
  validateVerifyEmail,
  normalizeRegisterBody,
  normalizeLoginBody,
  normalizeGoogleLoginBody,
  normalizeFacebookLoginBody,
  normalizeLinkGoogleAccountBody,
  normalizeForgotPasswordBody,
  normalizeResetPasswordBody,
  normalizeVerifyEmailBody,
} = require("./auth.validation");

const register = asyncHandler(async (req, res) => {
  const payload = normalizeRegisterBody(req.body);
  const errors = validateRegister(payload);

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  const user = await authService.register(payload);

  return successResponse(res, "Account registered successfully", user, 201);
});

const getRequestMetadata = (req) => {
  return {
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  };
};

const getCookieValue = (req, cookieName) => {
  const parsedCookie = req.cookies?.[cookieName];

  if (parsedCookie) {
    return parsedCookie;
  }

  const cookieHeader = req.headers?.cookie;

  if (!cookieHeader) {
    return undefined;
  }

  const cookiePrefix = `${cookieName}=`;
  const rawCookie = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(cookiePrefix));

  if (!rawCookie) {
    return undefined;
  }

  return decodeURIComponent(rawCookie.slice(cookiePrefix.length));
};

const login = asyncHandler(async (req, res) => {
  const payload = normalizeLoginBody(req.body);
  const errors = validateLogin(payload);

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  const data = await authService.login(payload, getRequestMetadata(req));
  setRefreshTokenCookie(res, data.refresh_token);

  return successResponse(res, "Login successful", {
    access_token: data.access_token,
    user: data.user,
  });
});

const googleLogin = asyncHandler(async (req, res) => {
  const payload = normalizeGoogleLoginBody(req.body);
  const errors = validateGoogleLogin(payload);

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  const data = await authService.googleLogin(payload, getRequestMetadata(req));
  setRefreshTokenCookie(res, data.refresh_token);

  return successResponse(res, "Google login successful", {
    access_token: data.access_token,
    user: data.user,
  });
});

const facebookLogin = asyncHandler(async (req, res) => {
  const payload = normalizeFacebookLoginBody(req.body);
  const errors = validateFacebookLogin(payload);

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  const data = await authService.facebookLogin(payload, getRequestMetadata(req));
  setRefreshTokenCookie(res, data.refresh_token);

  return successResponse(res, "Facebook login successful", {
    access_token: data.access_token,
    user: data.user,
  });
});

const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);

  return successResponse(res, "Current user fetched successfully", user);
});

const linkGoogleAccount = asyncHandler(async (req, res) => {
  const payload = normalizeLinkGoogleAccountBody(req.body);
  const errors = validateLinkGoogleAccount(payload);

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  const user = await authService.linkGoogleAccount(req.user.id, payload.credential);

  return successResponse(res, "Google account linked successfully", user);
});

const unlinkGoogleAccount = asyncHandler(async (req, res) => {
  const user = await authService.unlinkGoogleAccount(req.user.id);

  return successResponse(res, "Google account unlinked successfully", user);
});

const verifyEmail = asyncHandler(async (req, res) => {
  const payload = normalizeVerifyEmailBody(req.body);
  const errors = validateVerifyEmail(payload);

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  const verificationInfo = await authService.verifyEmail(payload);

  return successResponse(res, "Email verified successfully", verificationInfo);
});

const resendVerificationEmail = asyncHandler(async (req, res) => {
  await authService.resendVerificationEmail(req.user.id);

  return successResponse(res, "Verification email sent successfully");
});

const logout = asyncHandler(async (req, res) => {
  const payload = {
    refresh_token: getCookieValue(req, REFRESH_TOKEN_COOKIE_NAME),
  };
  const errors = validateRefreshToken(payload);

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  await authService.logout(payload);
  clearRefreshTokenCookie(res);

  return successResponse(res, "Logout successful");
});

const forgotPassword = asyncHandler(async (req, res) => {
  const payload = normalizeForgotPasswordBody(req.body);
  const errors = validateForgotPassword(payload);

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  await authService.forgotPassword(payload);

  return successResponse(res, authService.getPasswordResetSuccessMessage());
});

const resetPassword = asyncHandler(async (req, res) => {
  const payload = normalizeResetPasswordBody(req.body);
  const errors = validateResetPassword(payload);

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  await authService.resetPassword(payload);

  return successResponse(res, "Password reset successfully");
});

const refreshToken = asyncHandler(async (req, res) => {
  const payload = {
    refresh_token: getCookieValue(req, REFRESH_TOKEN_COOKIE_NAME),
  };
  const errors = validateRefreshToken(payload);

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  const data = await authService.refreshToken(payload, getRequestMetadata(req));
  setRefreshTokenCookie(res, data.refresh_token);

  return successResponse(res, "Token refreshed successfully", {
    access_token: data.access_token,
    user: data.user,
  });
});

const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req.user.id);
  clearRefreshTokenCookie(res);

  return successResponse(res, "Logged out from all devices successfully");
});

const getSessions = asyncHandler(async (req, res) => {
  const sessions = await authService.listSessions(req.user.id);

  return successResponse(res, "Sessions fetched successfully", sessions);
});

const revokeSession = asyncHandler(async (req, res) => {
  const sessionId = Number(req.params.id);

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return errorResponse(res, "Session ID must be a positive integer", 400);
  }

  await authService.revokeSession(req.user.id, sessionId);

  return successResponse(res, "Session revoked successfully");
});

module.exports = {
  register,
  login,
  googleLogin,
  facebookLogin,
  linkGoogleAccount,
  unlinkGoogleAccount,
  getMe,
  verifyEmail,
  resendVerificationEmail,
  logout,
  forgotPassword,
  resetPassword,
  refreshToken,
  logoutAll,
  getSessions,
  revokeSession,
};
