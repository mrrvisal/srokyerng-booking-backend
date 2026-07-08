const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

const authController = require("../src/modules/auth/auth.controller");
const authMiddleware = require("../src/middleware/auth.middleware");
const roleMiddleware = require("../src/middleware/role.middleware");
const {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} = require("../src/utils/refreshTokenCookie");

const authServicePath = require.resolve("../src/modules/auth/auth.service");
const authModelPath = require.resolve("../src/modules/auth/auth.model");
const hashPasswordPath = require.resolve("../src/utils/hashPassword");
const generateTokenPath = require.resolve("../src/utils/generateToken");
const emailPath = require.resolve("../src/utils/email");
const notificationServicePath = require.resolve(
  "../src/modules/notifications/notification.service"
);

const createRes = () => {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    },
  };
};

const loadAuthService = ({
  authModel,
  hashPassword,
  comparePassword,
  generateToken,
  notificationService,
}) => {
  const originalCache = {
    authService: require.cache[authServicePath],
    authModel: require.cache[authModelPath],
    hashPassword: require.cache[hashPasswordPath],
    generateToken: require.cache[generateTokenPath],
    email: require.cache[emailPath],
    notificationService: require.cache[notificationServicePath],
  };

  delete require.cache[authServicePath];
  require.cache[authModelPath] = {
    id: authModelPath,
    filename: authModelPath,
    loaded: true,
    exports: authModel,
  };
  require.cache[hashPasswordPath] = {
    id: hashPasswordPath,
    filename: hashPasswordPath,
    loaded: true,
    exports: {
      hashPassword,
      comparePassword,
    },
  };
  require.cache[generateTokenPath] = {
    id: generateTokenPath,
    filename: generateTokenPath,
    loaded: true,
    exports: generateToken,
  };
  require.cache[emailPath] = {
    id: emailPath,
    filename: emailPath,
    loaded: true,
    exports: {
      sendPasswordResetEmail: authModel.sendPasswordResetEmail || (async () => {}),
      sendEmailVerificationEmail:
        authModel.sendEmailVerificationEmail || (async () => {}),
    },
  };
  require.cache[notificationServicePath] = {
    id: notificationServicePath,
    filename: notificationServicePath,
    loaded: true,
    exports: notificationService || {
      NOTIFICATION_TYPES: {
        PASSWORD_CHANGED: "password_changed",
        SYSTEM: "system",
      },
      notifyUserSafely: async () => {},
    },
  };

  const authService = require(authServicePath);

  const restore = () => {
    delete require.cache[authServicePath];
    delete require.cache[authModelPath];
    delete require.cache[hashPasswordPath];
    delete require.cache[generateTokenPath];
    delete require.cache[emailPath];
    delete require.cache[notificationServicePath];

    Object.entries(originalCache).forEach(([key, value]) => {
      if (!value) {
        return;
      }

      const pathByKey = {
        authService: authServicePath,
        authModel: authModelPath,
        hashPassword: hashPasswordPath,
        generateToken: generateTokenPath,
        email: emailPath,
        notificationService: notificationServicePath,
      };

      require.cache[pathByKey[key]] = value;
    });
  };

  return { authService, restore };
};

const createUserRow = (overrides = {}) => {
  return {
    id: 1,
    full_name: "Customer User",
    email: "customer@example.com",
    phone: "012345678",
    password_hash: "stored-hash",
    role_name: "customer",
    status_name: "active",
    profile_image_url: null,
    last_login: null,
    email_verified_at: null,
    ...overrides,
  };
};

test("register returns 400 for invalid payload", async () => {
  const req = { body: {} };
  const res = createRes();
  const next = () => {};

  await authController.register(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.message, "Validation failed");
});

test("login returns 400 for invalid payload", async () => {
  const req = { body: {} };
  const res = createRes();
  const next = () => {};

  await authController.login(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.message, "Validation failed");
});

test("auth middleware returns 401 without bearer token", () => {
  const req = { headers: {} };
  const res = createRes();
  const next = () => {};

  authMiddleware(req, res, next);

  assert.equal(res.statusCode, 401);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.message, "Unauthorized access");
});

test("role middleware returns 403 when role is not allowed", () => {
  const req = { user: { id: 1, role: "owner" } };
  const res = createRes();
  const next = () => {};

  roleMiddleware("customer")(req, res, next);

  assert.equal(res.statusCode, 403);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.message, "Forbidden access");
});

test("role middleware allows customer role for customer endpoints", () => {
  const req = { user: { id: 2, role: "customer" } };
  const res = createRes();
  let called = false;

  const next = () => {
    called = true;
  };

  roleMiddleware("customer")(req, res, next);

  assert.equal(called, true);
});

test("refresh token cookie helper sets and clears an HttpOnly cookie", () => {
  const calls = {};
  const res = {
    cookie(name, value, options) {
      calls.cookie = { name, value, options };
    },
    clearCookie(name, options) {
      calls.clearCookie = { name, options };
    },
  };

  setRefreshTokenCookie(res, "refresh-token");
  clearRefreshTokenCookie(res);

  assert.equal(calls.cookie.name, "refresh_token");
  assert.equal(calls.cookie.value, "refresh-token");
  assert.equal(calls.cookie.options.httpOnly, true);
  assert.equal(calls.cookie.options.path, "/api/auth");
  assert.equal(calls.clearCookie.name, "refresh_token");
  assert.equal(calls.clearCookie.options.httpOnly, true);
  assert.equal(calls.clearCookie.options.path, "/api/auth");
});

test("logout returns 400 without refresh token", async () => {
  const req = { user: { id: 1, role: "customer" }, body: {} };
  const res = createRes();
  const next = () => {};

  await authController.logout(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.message, "Validation failed");
});

test("forgot password returns 400 for invalid payload", async () => {
  const req = { body: {} };
  const res = createRes();
  const next = () => {};

  await authController.forgotPassword(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.message, "Validation failed");
});

test("reset password returns 400 for invalid payload", async () => {
  const req = { body: {} };
  const res = createRes();
  const next = () => {};

  await authController.resetPassword(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.message, "Validation failed");
});

test("refresh token returns 400 for invalid payload", async () => {
  const req = { body: {} };
  const res = createRes();
  const next = () => {};

  await authController.refreshToken(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.message, "Validation failed");
});

test("verify email returns 400 for invalid payload", async () => {
  const req = { body: {} };
  const res = createRes();
  const next = () => {};

  await authController.verifyEmail(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.message, "Validation failed");
});

test("auth service registers a new customer with a hashed password", async () => {
  const calls = {};
  const authModel = {
    findUserByEmail: async (email) => {
      calls.findUserByEmail = email;
      return null;
    },
    findRoleByName: async (roleName) => {
      calls.findRoleByName = roleName;
      return { id: 2, role_name: roleName };
    },
    findStatusByName: async (statusName) => {
      calls.findStatusByName = statusName;
      return { id: 1, status_name: statusName };
    },
    createUser: async (payload) => {
      calls.createUser = payload;
      return 10;
    },
    markUnusedEmailVerificationTokensAsUsed: async (userId) => {
      calls.markUnusedEmailVerificationTokensAsUsed = userId;
    },
    createEmailVerificationToken: async (payload) => {
      calls.createEmailVerificationToken = payload;
      return 4;
    },
    sendEmailVerificationEmail: async (payload) => {
      calls.sendEmailVerificationEmail = payload;
    },
  };

  const { authService, restore } = loadAuthService({
    authModel,
    hashPassword: async (password) => {
      calls.hashPassword = password;
      return "hashed-password";
    },
    comparePassword: async () => false,
    generateToken: () => "token",
  });

  try {
    const user = await authService.register({
      full_name: "Customer User",
      email: "customer@example.com",
      password: "password123",
      phone: "012345678",
      role: "customer",
    });

    assert.deepEqual(user, {
      id: 10,
      full_name: "Customer User",
      email: "customer@example.com",
      phone: "012345678",
      role: "customer",
    });
    assert.equal(calls.findUserByEmail, "customer@example.com");
    assert.equal(calls.findRoleByName, "customer");
    assert.equal(calls.findStatusByName, "active");
    assert.equal(calls.hashPassword, "password123");
    assert.deepEqual(calls.createUser, {
      roleId: 2,
      statusId: 1,
      fullName: "Customer User",
      email: "customer@example.com",
      phone: "012345678",
      passwordHash: "hashed-password",
    });
    assert.equal(calls.markUnusedEmailVerificationTokensAsUsed, 10);
    assert.equal(calls.createEmailVerificationToken.userId, 10);
    assert.match(calls.createEmailVerificationToken.tokenHash, /^[a-f0-9]{64}$/);
    assert.ok(calls.createEmailVerificationToken.expiresAt instanceof Date);
    assert.equal(calls.sendEmailVerificationEmail.to, "customer@example.com");
    assert.equal(calls.sendEmailVerificationEmail.fullName, "Customer User");
    assert.match(
      calls.sendEmailVerificationEmail.verificationUrl,
      /^http:\/\/localhost:5173\/verify-email\?token=[a-f0-9]{64}$/
    );
  } finally {
    restore();
  }
});

test("auth service verifies email with a valid verification token", async () => {
  const calls = {};
  const rawToken = "valid-email-verification-token";
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const { authService, restore } = loadAuthService({
    authModel: {
      findValidEmailVerificationToken: async (hash) => {
        calls.findValidEmailVerificationToken = hash;
        return {
          id: 8,
          user_id: 1,
          status_name: "active",
        };
      },
      markEmailAsVerified: async (userId) => {
        calls.markEmailAsVerified = userId;
      },
      markEmailVerificationTokenAsUsed: async (tokenId) => {
        calls.markEmailVerificationTokenAsUsed = tokenId;
      },
    },
    hashPassword: async () => "hashed-password",
    comparePassword: async () => false,
    generateToken: () => "token",
    notificationService: {
      NOTIFICATION_TYPES: {
        PASSWORD_CHANGED: "password_changed",
        SYSTEM: "system",
      },
      notifyUserSafely: async (payload) => {
        calls.notifyUserSafely = payload;
      },
    },
  });

  try {
    await authService.verifyEmail({ token: rawToken });

    assert.equal(calls.findValidEmailVerificationToken, tokenHash);
    assert.equal(calls.markEmailAsVerified, 1);
    assert.equal(calls.markEmailVerificationTokenAsUsed, 8);
    assert.deepEqual(calls.notifyUserSafely, {
      userId: 1,
      type: "system",
      title: "Email verified",
      message: "Your email address has been verified successfully.",
    });
  } finally {
    restore();
  }
});

test("auth service resends verification email for an unverified active user", async () => {
  const calls = {};
  const { authService, restore } = loadAuthService({
    authModel: {
      findUserById: async (userId) => createUserRow({ id: userId }),
      markUnusedEmailVerificationTokensAsUsed: async (userId) => {
        calls.markUnusedEmailVerificationTokensAsUsed = userId;
      },
      createEmailVerificationToken: async (payload) => {
        calls.createEmailVerificationToken = payload;
        return 9;
      },
      sendEmailVerificationEmail: async (payload) => {
        calls.sendEmailVerificationEmail = payload;
      },
    },
    hashPassword: async () => "hashed-password",
    comparePassword: async () => false,
    generateToken: () => "token",
  });

  try {
    await authService.resendVerificationEmail(1);

    assert.equal(calls.markUnusedEmailVerificationTokensAsUsed, 1);
    assert.equal(calls.createEmailVerificationToken.userId, 1);
    assert.match(calls.createEmailVerificationToken.tokenHash, /^[a-f0-9]{64}$/);
    assert.equal(calls.sendEmailVerificationEmail.to, "customer@example.com");
  } finally {
    restore();
  }
});

test("auth service rejects resending verification email when already verified", async () => {
  const { authService, restore } = loadAuthService({
    authModel: {
      findUserById: async () =>
        createUserRow({ email_verified_at: "2026-05-18T01:00:00.000Z" }),
    },
    hashPassword: async () => "hashed-password",
    comparePassword: async () => false,
    generateToken: () => "token",
  });

  try {
    await assert.rejects(authService.resendVerificationEmail(1), (error) => {
      assert.equal(error.message, "Email is already verified");
      assert.equal(error.statusCode, 400);
      return true;
    });
  } finally {
    restore();
  }
});

test("auth service sends a password reset email for an active user", async () => {
  const calls = {};
  const authModel = {
    findUserByEmail: async (email) => {
      calls.findUserByEmail = email;
      return createUserRow();
    },
    markUnusedPasswordResetTokensAsUsed: async (userId) => {
      calls.markUnusedPasswordResetTokensAsUsed = userId;
    },
    createPasswordResetToken: async (payload) => {
      calls.createPasswordResetToken = payload;
      return 3;
    },
    sendPasswordResetEmail: async (payload) => {
      calls.sendPasswordResetEmail = payload;
    },
  };

  const { authService, restore } = loadAuthService({
    authModel,
    hashPassword: async () => "hashed-password",
    comparePassword: async () => false,
    generateToken: () => "token",
  });

  try {
    await authService.forgotPassword({ email: "customer@example.com" });

    assert.equal(calls.findUserByEmail, "customer@example.com");
    assert.equal(calls.markUnusedPasswordResetTokensAsUsed, 1);
    assert.equal(calls.createPasswordResetToken.userId, 1);
    assert.match(calls.createPasswordResetToken.tokenHash, /^[a-f0-9]{64}$/);
    assert.ok(calls.createPasswordResetToken.expiresAt instanceof Date);
    assert.equal(calls.sendPasswordResetEmail.to, "customer@example.com");
    assert.equal(calls.sendPasswordResetEmail.fullName, "Customer User");
    assert.match(
      calls.sendPasswordResetEmail.resetUrl,
      /^http:\/\/localhost:5173\/reset-password\?token=[a-f0-9]{64}$/
    );
  } finally {
    restore();
  }
});

test("auth service returns generic success for unknown password reset email", async () => {
  const calls = {};
  const authModel = {
    findUserByEmail: async () => null,
    markUnusedPasswordResetTokensAsUsed: async () => {
      calls.markUnusedPasswordResetTokensAsUsed = true;
    },
    createPasswordResetToken: async () => {
      calls.createPasswordResetToken = true;
    },
    sendPasswordResetEmail: async () => {
      calls.sendPasswordResetEmail = true;
    },
  };

  const { authService, restore } = loadAuthService({
    authModel,
    hashPassword: async () => "hashed-password",
    comparePassword: async () => false,
    generateToken: () => "token",
  });

  try {
    await authService.forgotPassword({ email: "missing@example.com" });

    assert.equal(calls.markUnusedPasswordResetTokensAsUsed, undefined);
    assert.equal(calls.createPasswordResetToken, undefined);
    assert.equal(calls.sendPasswordResetEmail, undefined);
    assert.equal(
      authService.getPasswordResetSuccessMessage(),
      "If an account exists for this email, a password reset link has been sent"
    );
  } finally {
    restore();
  }
});

test("auth service resets password with a valid reset token", async () => {
  const calls = {};
  const rawToken = "valid-reset-token";
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const authModel = {
    findValidPasswordResetToken: async (hash) => {
      calls.findValidPasswordResetToken = hash;
      return {
        id: 5,
        user_id: 1,
        status_name: "active",
      };
    },
    updatePassword: async (userId, passwordHash) => {
      calls.updatePassword = { userId, passwordHash };
    },
    markPasswordResetTokenAsUsed: async (tokenId) => {
      calls.markPasswordResetTokenAsUsed = tokenId;
    },
    revokeRefreshTokensForUser: async (userId) => {
      calls.revokeRefreshTokensForUser = userId;
    },
  };

  const { authService, restore } = loadAuthService({
    authModel,
    hashPassword: async (password) => {
      calls.hashPassword = password;
      return "new-hash";
    },
    comparePassword: async () => false,
    generateToken: () => "token",
    notificationService: {
      NOTIFICATION_TYPES: {
        PASSWORD_CHANGED: "password_changed",
        SYSTEM: "system",
      },
      notifyUserSafely: async (payload) => {
        calls.notifyUserSafely = payload;
      },
    },
  });

  try {
    await authService.resetPassword({
      token: rawToken,
      password: "new-password",
    });

    assert.equal(calls.findValidPasswordResetToken, tokenHash);
    assert.equal(calls.hashPassword, "new-password");
    assert.deepEqual(calls.updatePassword, {
      userId: 1,
      passwordHash: "new-hash",
    });
    assert.equal(calls.markPasswordResetTokenAsUsed, 5);
    assert.equal(calls.revokeRefreshTokensForUser, 1);
    assert.equal(calls.notifyUserSafely.userId, 1);
    assert.equal(calls.notifyUserSafely.type, "password_changed");
    assert.equal(calls.notifyUserSafely.critical, true);
    assert.equal(
      calls.notifyUserSafely.email.subject,
      "Your SrokYerng Booking password was reset"
    );
  } finally {
    restore();
  }
});

test("auth service rejects invalid password reset token", async () => {
  const { authService, restore } = loadAuthService({
    authModel: {
      findValidPasswordResetToken: async () => null,
    },
    hashPassword: async () => "new-hash",
    comparePassword: async () => false,
    generateToken: () => "token",
  });

  try {
    await assert.rejects(
      authService.resetPassword({
        token: "bad-token",
        password: "new-password",
      }),
      (error) => {
        assert.equal(error.message, "Invalid or expired password reset token");
        assert.equal(error.statusCode, 400);
        return true;
      }
    );
  } finally {
    restore();
  }
});

test("auth service rejects duplicate email registration", async () => {
  const { authService, restore } = loadAuthService({
    authModel: {
      findUserByEmail: async () => createUserRow(),
    },
    hashPassword: async () => "hashed-password",
    comparePassword: async () => false,
    generateToken: () => "token",
  });

  try {
    await assert.rejects(
      authService.register({
        full_name: "Customer User",
        email: "customer@example.com",
        password: "password123",
        role: "customer",
      }),
      (error) => {
        assert.equal(error.message, "Email already exists");
        assert.equal(error.statusCode, 409);
        return true;
      }
    );
  } finally {
    restore();
  }
});

test("auth service logs in an active user and returns access and refresh tokens", async () => {
  const calls = {};
  const userRow = createUserRow({
    password_hash: "stored-hash",
    last_login: "2026-05-10T10:00:00.000Z",
  });

  const { authService, restore } = loadAuthService({
    authModel: {
      findUserByEmail: async (email) => {
        calls.findUserByEmail = email;
        return userRow;
      },
      updateLastLogin: async (userId) => {
        calls.updateLastLogin = userId;
      },
      createRefreshToken: async (payload) => {
        calls.createRefreshToken = payload;
        return 11;
      },
    },
    hashPassword: async () => "hashed-password",
    comparePassword: async (password, hash) => {
      calls.comparePassword = { password, hash };
      return true;
    },
    generateToken: (payload) => {
      calls.generateToken = payload;
      return "signed-token";
    },
  });

  try {
    const result = await authService.login(
      {
        email: "customer@example.com",
        password: "password123",
      },
      {
        userAgent: "Mozilla/5.0",
        ipAddress: "127.0.0.1",
      }
    );

    assert.equal(result.access_token, "signed-token");
    assert.match(result.refresh_token, /^[a-f0-9]{96}$/);
    assert.deepEqual(result.user, {
      id: 1,
      full_name: "Customer User",
      email: "customer@example.com",
      phone: "012345678",
      role: "customer",
      status: "active",
      profile_image_url: null,
      last_login: "2026-05-10T10:00:00.000Z",
      email_verified_at: null,
    });
    assert.equal(calls.findUserByEmail, "customer@example.com");
    assert.deepEqual(calls.comparePassword, {
      password: "password123",
      hash: "stored-hash",
    });
    assert.equal(calls.updateLastLogin, 1);
    assert.deepEqual(calls.generateToken, {
      id: 1,
      role: "customer",
    });
    assert.equal(calls.createRefreshToken.userId, 1);
    assert.equal(calls.createRefreshToken.userAgent, "Mozilla/5.0");
    assert.equal(calls.createRefreshToken.ipAddress, "127.0.0.1");
    assert.match(calls.createRefreshToken.tokenHash, /^[a-f0-9]{64}$/);
    assert.ok(calls.createRefreshToken.expiresAt instanceof Date);
    assert.equal(Object.hasOwn(result.user, "password_hash"), false);
  } finally {
    restore();
  }
});

test("auth service refreshes access token with a valid refresh token", async () => {
  const calls = {};
  const rawToken = "valid-refresh-token";
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const { authService, restore } = loadAuthService({
    authModel: {
      findValidRefreshToken: async (hash) => {
        calls.findValidRefreshToken = hash;
        return {
          ...createUserRow(),
          id: 22,
          user_id: 1,
        };
      },
      revokeRefreshToken: async (hash) => {
        calls.revokeRefreshToken = hash;
      },
      createRefreshToken: async (payload) => {
        calls.createRefreshToken = payload;
        return 23;
      },
    },
    hashPassword: async () => "hashed-password",
    comparePassword: async () => true,
    generateToken: (payload) => {
      calls.generateToken = payload;
      return "new-access-token";
    },
  });

  try {
    const result = await authService.refreshToken(
      {
        refresh_token: rawToken,
      },
      {
        userAgent: "Mobile Safari",
        ipAddress: "192.168.1.10",
      }
    );

    assert.equal(calls.findValidRefreshToken, tokenHash);
    assert.equal(calls.revokeRefreshToken, tokenHash);
    assert.equal(calls.createRefreshToken.userId, 1);
    assert.equal(calls.createRefreshToken.userAgent, "Mobile Safari");
    assert.equal(calls.createRefreshToken.ipAddress, "192.168.1.10");
    assert.match(calls.createRefreshToken.tokenHash, /^[a-f0-9]{64}$/);
    assert.ok(calls.createRefreshToken.expiresAt instanceof Date);
    assert.deepEqual(calls.generateToken, {
      id: 1,
      role: "customer",
    });
    assert.equal(result.access_token, "new-access-token");
    assert.match(result.refresh_token, /^[a-f0-9]{96}$/);
    assert.equal(result.user.id, 1);
    assert.equal(result.user.role, "customer");
    assert.equal(Object.hasOwn(result.user, "password_hash"), false);
  } finally {
    restore();
  }
});

test("auth service rejects invalid refresh token", async () => {
  const { authService, restore } = loadAuthService({
    authModel: {
      findValidRefreshToken: async () => null,
    },
    hashPassword: async () => "hashed-password",
    comparePassword: async () => true,
    generateToken: () => "new-access-token",
  });

  try {
    await assert.rejects(
      authService.refreshToken({
        refresh_token: "bad-refresh-token",
      }),
      (error) => {
        assert.equal(error.message, "Invalid or expired refresh token");
        assert.equal(error.statusCode, 401);
        return true;
      }
    );
  } finally {
    restore();
  }
});

test("auth service logout revokes refresh token", async () => {
  const calls = {};
  const rawToken = "refresh-token-to-revoke";
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const { authService, restore } = loadAuthService({
    authModel: {
      revokeRefreshToken: async (hash) => {
        calls.revokeRefreshToken = hash;
      },
    },
    hashPassword: async () => "hashed-password",
    comparePassword: async () => true,
    generateToken: () => "access-token",
  });

  try {
    await authService.logout({
      refresh_token: rawToken,
    });

    assert.equal(calls.revokeRefreshToken, tokenHash);
  } finally {
    restore();
  }
});

test("auth service logout all revokes all refresh tokens for user", async () => {
  const calls = {};

  const { authService, restore } = loadAuthService({
    authModel: {
      revokeRefreshTokensForUser: async (userId) => {
        calls.revokeRefreshTokensForUser = userId;
      },
    },
    hashPassword: async () => "hashed-password",
    comparePassword: async () => true,
    generateToken: () => "access-token",
  });

  try {
    await authService.logoutAll(7);

    assert.equal(calls.revokeRefreshTokensForUser, 7);
  } finally {
    restore();
  }
});

test("auth service lists active sessions for user", async () => {
  const calls = {};
  const sessions = [
    {
      id: 1,
      user_agent: "Mozilla/5.0",
      ip_address: "127.0.0.1",
      expires_at: "2026-06-18T01:00:00.000Z",
      last_used_at: "2026-05-18T01:00:00.000Z",
      created_at: "2026-05-18T01:00:00.000Z",
    },
  ];

  const { authService, restore } = loadAuthService({
    authModel: {
      findActiveRefreshTokensByUserId: async (userId) => {
        calls.findActiveRefreshTokensByUserId = userId;
        return sessions;
      },
    },
    hashPassword: async () => "hashed-password",
    comparePassword: async () => true,
    generateToken: () => "access-token",
  });

  try {
    const result = await authService.listSessions(7);

    assert.equal(calls.findActiveRefreshTokensByUserId, 7);
    assert.deepEqual(result, sessions);
  } finally {
    restore();
  }
});

test("auth service revokes one session for user", async () => {
  const calls = {};

  const { authService, restore } = loadAuthService({
    authModel: {
      revokeRefreshTokenByIdForUser: async (sessionId, userId) => {
        calls.revokeRefreshTokenByIdForUser = { sessionId, userId };
        return 1;
      },
    },
    hashPassword: async () => "hashed-password",
    comparePassword: async () => true,
    generateToken: () => "access-token",
  });

  try {
    await authService.revokeSession(7, 3);

    assert.deepEqual(calls.revokeRefreshTokenByIdForUser, {
      sessionId: 3,
      userId: 7,
    });
  } finally {
    restore();
  }
});

test("auth service rejects revoking another user's session", async () => {
  const { authService, restore } = loadAuthService({
    authModel: {
      revokeRefreshTokenByIdForUser: async () => 0,
    },
    hashPassword: async () => "hashed-password",
    comparePassword: async () => true,
    generateToken: () => "access-token",
  });

  try {
    await assert.rejects(authService.revokeSession(7, 3), (error) => {
      assert.equal(error.message, "Session not found");
      assert.equal(error.statusCode, 404);
      return true;
    });
  } finally {
    restore();
  }
});

test("auth service rejects inactive user login", async () => {
  const { authService, restore } = loadAuthService({
    authModel: {
      findUserByEmail: async () => createUserRow({ status_name: "suspended" }),
      updateLastLogin: async () => {
        throw new Error("should not update last login");
      },
    },
    hashPassword: async () => "hashed-password",
    comparePassword: async () => true,
    generateToken: () => "token",
  });

  try {
    await assert.rejects(
      authService.login({
        email: "customer@example.com",
        password: "password123",
      }),
      (error) => {
        assert.equal(error.message, "Your account is not active");
        assert.equal(error.statusCode, 403);
        return true;
      }
    );
  } finally {
    restore();
  }
});

test("auth service fetches the current active user safely", async () => {
  const { authService, restore } = loadAuthService({
    authModel: {
      findUserById: async (userId) => createUserRow({ id: userId }),
    },
    hashPassword: async () => "hashed-password",
    comparePassword: async () => true,
    generateToken: () => "token",
  });

  try {
    const user = await authService.getCurrentUser(7);

    assert.deepEqual(user, {
      id: 7,
      full_name: "Customer User",
      email: "customer@example.com",
      phone: "012345678",
      role: "customer",
      status: "active",
      profile_image_url: null,
      last_login: null,
      email_verified_at: null,
    });
    assert.equal(Object.hasOwn(user, "password_hash"), false);
  } finally {
    restore();
  }
});
