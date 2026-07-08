const express = require("express");
const authController = require("./auth.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const {
  loginRateLimit,
  registerRateLimit,
  refreshTokenRateLimit,
  forgotPasswordRateLimit,
  resetPasswordRateLimit,
  resendVerificationEmailRateLimit,
} = require("../../middleware/rateLimit.middleware");

const router = express.Router();

router.post("/register", registerRateLimit, authController.register);
router.post("/login", loginRateLimit, authController.login);
router.post("/google", loginRateLimit, authController.googleLogin);
router.post("/facebook", loginRateLimit, authController.facebookLogin);
router.post("/google/link", authMiddleware, authController.linkGoogleAccount);
router.delete("/google/link", authMiddleware, authController.unlinkGoogleAccount);
router.post("/forgot-password", forgotPasswordRateLimit, authController.forgotPassword);
router.post("/reset-password", resetPasswordRateLimit, authController.resetPassword);
router.post("/verify-email", authController.verifyEmail);
router.post(
  "/resend-verification-email",
  authMiddleware,
  resendVerificationEmailRateLimit,
  authController.resendVerificationEmail
);
router.post("/refresh-token", refreshTokenRateLimit, authController.refreshToken);
router.get("/me", authMiddleware, authController.getMe);
router.get("/sessions", authMiddleware, authController.getSessions);
router.delete("/sessions/:id", authMiddleware, authController.revokeSession);
router.post("/logout", authMiddleware, authController.logout);
router.post("/logout-all", authMiddleware, authController.logoutAll);

module.exports = router;
