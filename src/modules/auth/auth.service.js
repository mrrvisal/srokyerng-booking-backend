const crypto = require("crypto");
const authModel = require("./auth.model");
const { hashPassword, comparePassword } = require("../../utils/hashPassword");
const generateToken = require("../../utils/generateToken");
const { USER_STATUS } = require("../../constants/statuses");
const env = require("../../config/env");
const {
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
} = require("../../utils/email");
const notificationService = require("../notifications/notification.service");

const PASSWORD_RESET_TOKEN_BYTES = 32;
const PASSWORD_RESET_EXPIRES_MS = 60 * 60 * 1000;
const EMAIL_VERIFICATION_TOKEN_BYTES = 32;
const EMAIL_VERIFICATION_EXPIRES_MS = 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_BYTES = 48;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";
const getFacebookGraphUrl = (path) => {
  return `https://graph.facebook.com/${env.FACEBOOK_GRAPH_API_VERSION}${path}`;
};

const toSafeUser = (user) => {
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role_name,
    status: user.status_name,
    profile_image_url: user.profile_image_url,
    last_login: user.last_login,
    email_verified_at: user.email_verified_at,
    google_linked: Boolean(user.google_id),
  };
};

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const createAccessToken = (user) => {
  return generateToken({
    id: user.id,
    role: user.role_name,
  });
};

const createAndStoreRefreshToken = async (userId, metadata = {}) => {
  const refreshToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * MS_PER_DAY);

  await authModel.createRefreshToken({
    userId,
    tokenHash,
    userAgent: metadata.userAgent,
    ipAddress: metadata.ipAddress,
    expiresAt,
  });

  return refreshToken;
};

const createAndSendEmailVerification = async (user) => {
  const token = crypto.randomBytes(EMAIL_VERIFICATION_TOKEN_BYTES).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRES_MS);
  const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${encodeURIComponent(
    token
  )}`;

  await authModel.markUnusedEmailVerificationTokensAsUsed(user.id);
  await authModel.createEmailVerificationToken({
    userId: user.id,
    tokenHash,
    expiresAt,
  });
  await sendEmailVerificationEmail({
    to: user.email,
    fullName: user.full_name,
    verificationUrl,
  });
};

const register = async ({ full_name, email, password, phone, role }) => {
  const existingUser = await authModel.findUserByEmail(email);

  if (existingUser) {
    const error = new Error("Email already exists");
    error.statusCode = 409;
    throw error;
  }

  const selectedRole = await authModel.findRoleByName(role);
  const activeStatus = await authModel.findStatusByName(USER_STATUS.ACTIVE);

  if (!selectedRole || !activeStatus) {
    const error = new Error("System roles/statuses are not seeded");
    error.statusCode = 500;
    throw error;
  }

  const passwordHash = await hashPassword(password);

  const userId = await authModel.createUser({
    roleId: selectedRole.id,
    statusId: activeStatus.id,
    fullName: full_name,
    email,
    phone,
    passwordHash,
  });

  await createAndSendEmailVerification({
    id: userId,
    full_name,
    email,
  });

  return {
    id: userId,
    full_name,
    email,
    phone: phone || null,
    role,
  };
};

const login = async ({ email, password }, metadata = {}) => {
  const user = await authModel.findUserByEmail(email);

  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await comparePassword(password, user.password_hash);

  if (!isMatch) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  if (user.status_name !== USER_STATUS.ACTIVE) {
    const error = new Error("Your account is not active");
    error.statusCode = 403;
    throw error;
  }

  await authModel.updateLastLogin(user.id);

  const accessToken = createAccessToken(user);
  const refreshToken = await createAndStoreRefreshToken(user.id, metadata);

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    user: toSafeUser(user),
  };
};

const verifyGoogleCredential = async (credential) => {
  if (!env.GOOGLE_CLIENT_ID) {
    const error = new Error("Google login is not configured");
    error.statusCode = 500;
    throw error;
  }

  const response = await fetch(
    `${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(credential)}`
  );

  if (!response.ok) {
    const error = new Error("Invalid Google credential");
    error.statusCode = 401;
    throw error;
  }

  const profile = await response.json();

  if (profile.aud !== env.GOOGLE_CLIENT_ID) {
    const error = new Error("Invalid Google credential audience");
    error.statusCode = 401;
    throw error;
  }

  if (profile.email_verified !== "true" && profile.email_verified !== true) {
    const error = new Error("Google email is not verified");
    error.statusCode = 403;
    throw error;
  }

  if (!profile.email) {
    const error = new Error("Google account email is missing");
    error.statusCode = 400;
    throw error;
  }

  if (!profile.sub) {
    const error = new Error("Google credential is missing a subject id");
    error.statusCode = 400;
    throw error;
  }

  return {
    googleId: profile.sub,
    email: String(profile.email).toLowerCase(),
    fullName: profile.name || profile.email,
    profileImageUrl: profile.picture || null,
  };
};

const verifyFacebookAccessToken = async (accessToken) => {
  if (!env.FACEBOOK_APP_ID || !env.FACEBOOK_APP_SECRET) {
    const error = new Error("Facebook login is not configured");
    error.statusCode = 500;
    throw error;
  }

  const appAccessToken = `${env.FACEBOOK_APP_ID}|${env.FACEBOOK_APP_SECRET}`;
  const debugUrl = new URL(getFacebookGraphUrl("/debug_token"));
  debugUrl.searchParams.set("input_token", accessToken);
  debugUrl.searchParams.set("access_token", appAccessToken);

  const debugResponse = await fetch(debugUrl);

  if (!debugResponse.ok) {
    const error = new Error("Invalid Facebook access token");
    error.statusCode = 401;
    throw error;
  }

  const debugPayload = await debugResponse.json();
  const tokenData = debugPayload.data;

  if (!tokenData?.is_valid || tokenData.app_id !== env.FACEBOOK_APP_ID || !tokenData.user_id) {
    const error = new Error("Invalid Facebook access token");
    error.statusCode = 401;
    throw error;
  }

  const profileUrl = new URL(getFacebookGraphUrl("/me"));
  profileUrl.searchParams.set("fields", "id,name,email,picture.type(large)");
  profileUrl.searchParams.set("access_token", accessToken);

  const profileResponse = await fetch(profileUrl);

  if (!profileResponse.ok) {
    const error = new Error("Facebook profile could not be fetched");
    error.statusCode = 401;
    throw error;
  }

  const profile = await profileResponse.json();

  if (profile.id !== tokenData.user_id) {
    const error = new Error("Facebook profile does not match token");
    error.statusCode = 401;
    throw error;
  }

  if (!profile.email) {
    const error = new Error("Facebook account email is missing. Please allow email permission.");
    error.statusCode = 400;
    throw error;
  }

  return {
    email: String(profile.email).toLowerCase(),
    fullName: profile.name || profile.email,
    profileImageUrl: profile.picture?.data?.url || null,
  };
};

const socialLogin = async ({ profile, role }, metadata = {}) => {
  let user = await authModel.findUserByEmail(profile.email);

  if (user && user.role_name !== role) {
    const error = new Error(`This account is registered as ${user.role_name}`);
    error.statusCode = 403;
    throw error;
  }

  if (user && user.status_name !== USER_STATUS.ACTIVE) {
    const error = new Error("Your account is not active");
    error.statusCode = 403;
    throw error;
  }

  if (!user) {
    const selectedRole = await authModel.findRoleByName(role);
    const activeStatus = await authModel.findStatusByName(USER_STATUS.ACTIVE);

    if (!selectedRole || !activeStatus) {
      const error = new Error("System roles/statuses are not seeded");
      error.statusCode = 500;
      throw error;
    }

    const passwordHash = await hashPassword(crypto.randomBytes(32).toString("hex"));
    const userId = await authModel.createVerifiedUser({
      roleId: selectedRole.id,
      statusId: activeStatus.id,
      fullName: profile.fullName,
      email: profile.email,
      phone: null,
      passwordHash,
      profileImageUrl: profile.profileImageUrl,
    });

    user = await authModel.findUserById(userId);
  } else if (!user.email_verified_at) {
    await authModel.markEmailAsVerified(user.id);
    user = await authModel.findUserById(user.id);
  }

  await authModel.updateLastLogin(user.id);

  const accessToken = createAccessToken(user);
  const refreshToken = await createAndStoreRefreshToken(user.id, metadata);

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    user: toSafeUser(user),
  };
};

const googleLogin = async ({ credential, role }, metadata = {}) => {
  const googleProfile = await verifyGoogleCredential(credential);
  return socialLogin({ profile: googleProfile, role }, metadata);
};

const facebookLogin = async ({ access_token, role }, metadata = {}) => {
  const facebookProfile = await verifyFacebookAccessToken(access_token);
  return socialLogin({ profile: facebookProfile, role }, metadata);
};

const linkGoogleAccount = async (userId, credential) => {
  const googleProfile = await verifyGoogleCredential(credential);
  const currentUser = await authModel.findUserById(userId);

  if (!currentUser) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (googleProfile.email !== String(currentUser.email).toLowerCase()) {
    const error = new Error(
      "This Google account's email does not match your account email."
    );
    error.statusCode = 409;
    throw error;
  }

  const existingLink = await authModel.findUserByGoogleId(googleProfile.googleId);
  if (existingLink && existingLink.id !== userId) {
    const error = new Error("This Google account is already linked to another user.");
    error.statusCode = 409;
    throw error;
  }

  await authModel.linkGoogleId(userId, googleProfile.googleId);
  if (!currentUser.email_verified_at) {
    await authModel.markEmailAsVerified(userId);
  }

  return getCurrentUser(userId);
};

const unlinkGoogleAccount = async (userId) => {
  await authModel.unlinkGoogleId(userId);
  return getCurrentUser(userId);
};

const getCurrentUser = async (userId) => {
  const user = await authModel.findUserById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (user.status_name !== USER_STATUS.ACTIVE) {
    const error = new Error("Your account is not active");
    error.statusCode = 403;
    throw error;
  }

  return toSafeUser(user);
};

const getPasswordResetSuccessMessage = () => {
  return "If an account exists for this email, a password reset link has been sent";
};

const verifyEmail = async ({ token }) => {
  const tokenHash = hashToken(token);
  const verificationToken = await authModel.findValidEmailVerificationToken(tokenHash);

  if (!verificationToken) {
    const error = new Error("Invalid or expired email verification token");
    error.statusCode = 400;
    throw error;
  }

  if (verificationToken.status_name !== USER_STATUS.ACTIVE) {
    const error = new Error("Your account is not active");
    error.statusCode = 403;
    throw error;
  }

  await authModel.markEmailAsVerified(verificationToken.user_id);
  await authModel.markEmailVerificationTokenAsUsed(verificationToken.id);
  await notificationService.notifyUserSafely({
    userId: verificationToken.user_id,
    type: notificationService.NOTIFICATION_TYPES.SYSTEM,
    title: "Email verified",
    message: "Your email address has been verified successfully.",
  });

  return {
    email: verificationToken.email,
    fullName: verificationToken.full_name,
    role: verificationToken.role_name,
  };
};

const resendVerificationEmail = async (userId) => {
  const user = await authModel.findUserById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (user.status_name !== USER_STATUS.ACTIVE) {
    const error = new Error("Your account is not active");
    error.statusCode = 403;
    throw error;
  }

  if (user.email_verified_at) {
    const error = new Error("Email is already verified");
    error.statusCode = 400;
    throw error;
  }

  await createAndSendEmailVerification(user);
};

const forgotPassword = async ({ email }) => {
  const user = await authModel.findUserByEmail(email);

  if (!user || user.status_name !== USER_STATUS.ACTIVE) {
    return;
  }

  const token = crypto.randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRES_MS);
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(
    token
  )}`;

  await authModel.markUnusedPasswordResetTokensAsUsed(user.id);
  await authModel.createPasswordResetToken({
    userId: user.id,
    tokenHash,
    expiresAt,
  });
  await sendPasswordResetEmail({
    to: user.email,
    fullName: user.full_name,
    resetUrl,
  });
};

const resetPassword = async ({ token, password }) => {
  const tokenHash = hashToken(token);
  const resetToken = await authModel.findValidPasswordResetToken(tokenHash);

  if (!resetToken) {
    const error = new Error("Invalid or expired password reset token");
    error.statusCode = 400;
    throw error;
  }

  if (resetToken.status_name !== USER_STATUS.ACTIVE) {
    const error = new Error("Your account is not active");
    error.statusCode = 403;
    throw error;
  }

  const passwordHash = await hashPassword(password);
  await authModel.updatePassword(resetToken.user_id, passwordHash);
  await authModel.markPasswordResetTokenAsUsed(resetToken.id);
  await authModel.revokeRefreshTokensForUser(resetToken.user_id);
  await notificationService.notifyUserSafely({
    userId: resetToken.user_id,
    type: notificationService.NOTIFICATION_TYPES.PASSWORD_CHANGED,
    title: "Password reset completed",
    message: "Your password was reset successfully. All active sessions were signed out.",
    critical: true,
    email: {
      subject: "Your SrokYerng Booking password was reset",
      title: "Password reset completed",
      message:
        "Your password was reset successfully. If this was not you, contact support immediately.",
    },
  });
};

const refreshToken = async ({ refresh_token }, metadata = {}) => {
  const tokenHash = hashToken(refresh_token);
  const storedToken = await authModel.findValidRefreshToken(tokenHash);

  if (!storedToken) {
    const error = new Error("Invalid or expired refresh token");
    error.statusCode = 401;
    throw error;
  }

  if (storedToken.status_name !== USER_STATUS.ACTIVE) {
    const error = new Error("Your account is not active");
    error.statusCode = 403;
    throw error;
  }

  await authModel.revokeRefreshToken(tokenHash);
  const nextRefreshToken = await createAndStoreRefreshToken(
    storedToken.user_id,
    metadata
  );

  return {
    access_token: createAccessToken({
      id: storedToken.user_id,
      role_name: storedToken.role_name,
    }),
    refresh_token: nextRefreshToken,
    user: toSafeUser({
      ...storedToken,
      id: storedToken.user_id,
    }),
  };
};

const logout = async ({ refresh_token }) => {
  const tokenHash = hashToken(refresh_token);

  await authModel.revokeRefreshToken(tokenHash);
};

const logoutAll = async (userId) => {
  await authModel.revokeRefreshTokensForUser(userId);
};

const listSessions = async (userId) => {
  return authModel.findActiveRefreshTokensByUserId(userId);
};

const revokeSession = async (userId, sessionId) => {
  const affectedRows = await authModel.revokeRefreshTokenByIdForUser(sessionId, userId);

  if (affectedRows === 0) {
    const error = new Error("Session not found");
    error.statusCode = 404;
    throw error;
  }
};

module.exports = {
  register,
  login,
  googleLogin,
  facebookLogin,
  linkGoogleAccount,
  unlinkGoogleAccount,
  getCurrentUser,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
  logoutAll,
  listSessions,
  revokeSession,
  getPasswordResetSuccessMessage,
};
