const test = require("node:test");
const assert = require("node:assert/strict");

const userController = require("../src/modules/users/user.controller");

const userServicePath = require.resolve("../src/modules/users/user.service");
const userModelPath = require.resolve("../src/modules/users/user.model");
const hashPasswordPath = require.resolve("../src/utils/hashPassword");
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

const loadUserService = ({ userModel, hashPassword, comparePassword, notificationService }) => {
  const originalCache = {
    userService: require.cache[userServicePath],
    userModel: require.cache[userModelPath],
    hashPassword: require.cache[hashPasswordPath],
    notificationService: require.cache[notificationServicePath],
  };

  delete require.cache[userServicePath];
  require.cache[userModelPath] = {
    id: userModelPath,
    filename: userModelPath,
    loaded: true,
    exports: userModel,
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
  require.cache[notificationServicePath] = {
    id: notificationServicePath,
    filename: notificationServicePath,
    loaded: true,
    exports: notificationService || {
      NOTIFICATION_TYPES: {
        PASSWORD_CHANGED: "password_changed",
      },
      notifyUserSafely: async () => {},
    },
  };

  const userService = require(userServicePath);

  const restore = () => {
    delete require.cache[userServicePath];
    delete require.cache[userModelPath];
    delete require.cache[hashPasswordPath];
    delete require.cache[notificationServicePath];

    const pathByKey = {
      userService: userServicePath,
      userModel: userModelPath,
      hashPassword: hashPasswordPath,
      notificationService: notificationServicePath,
    };

    Object.entries(originalCache).forEach(([key, value]) => {
      if (value) {
        require.cache[pathByKey[key]] = value;
      }
    });
  };

  return { userService, restore };
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
    gender: null,
    date_of_birth: null,
    address: null,
    last_login: null,
    email_verified_at: null,
    ...overrides,
  };
};

test("update profile returns 400 when no profile fields are provided", async () => {
  const req = { user: { id: 1 }, body: {} };
  const res = createRes();
  const next = () => {};

  await userController.updateMe(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.message, "Validation failed");
});

test("change password returns 400 for invalid payload", async () => {
  const req = { user: { id: 1 }, body: {} };
  const res = createRes();
  const next = () => {};

  await userController.changePassword(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.message, "Validation failed");
});

test("admin user status update returns 400 for invalid status", async () => {
  const req = { user: { id: 1, role: "admin" }, params: { id: "2" }, body: {} };
  const res = createRes();
  const next = () => {};

  await userController.updateStatus(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.message, "Validation failed");
});

test("admin user detail returns 400 for invalid user id", async () => {
  const req = { params: { id: "abc" } };
  const res = createRes();
  const next = () => {};

  await userController.getById(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.message, "User ID must be a positive integer");
});

test("user service updates profile fields and allows clearing optional values", async () => {
  const calls = {};
  let readCount = 0;
  const beforeUpdate = createUserRow({
    phone: "012345678",
    address: "Old address",
  });
  const afterUpdate = createUserRow({
    full_name: "Updated User",
    phone: null,
    address: "New address",
  });

  const { userService, restore } = loadUserService({
    userModel: {
      findUserById: async () => {
        readCount += 1;
        return readCount === 1 ? beforeUpdate : afterUpdate;
      },
      updateProfile: async (userId, profile) => {
        calls.updateProfile = { userId, profile };
      },
    },
    hashPassword: async () => "new-hash",
    comparePassword: async () => true,
  });

  try {
    const user = await userService.updateMyProfile(1, {
      full_name: "Updated User",
      phone: null,
      address: "New address",
    });

    assert.deepEqual(calls.updateProfile, {
      userId: 1,
      profile: {
        full_name: "Updated User",
        phone: null,
        profile_image_url: null,
        gender: null,
        date_of_birth: null,
        address: "New address",
      },
    });
    assert.equal(user.full_name, "Updated User");
    assert.equal(user.phone, null);
    assert.equal(user.address, "New address");
    assert.equal(Object.hasOwn(user, "password_hash"), false);
  } finally {
    restore();
  }
});

test("user service updates profile image", async () => {
  const calls = {};
  let readCount = 0;
  const { userService, restore } = loadUserService({
    userModel: {
      findUserById: async () => {
        readCount += 1;
        return readCount === 1
          ? createUserRow()
          : createUserRow({
              profile_image_url: "/uploads/profiles/profile-test.jpg",
            });
      },
      updateProfileImage: async (userId, profileImageUrl) => {
        calls.updateProfileImage = { userId, profileImageUrl };
      },
    },
    hashPassword: async () => "new-hash",
    comparePassword: async () => true,
  });

  try {
    const user = await userService.updateMyProfileImage(1, {
      filename: "profile-test.jpg",
    });

    assert.deepEqual(calls.updateProfileImage, {
      userId: 1,
      profileImageUrl: "/uploads/profiles/profile-test.jpg",
    });
    assert.equal(user.profile_image_url, "/uploads/profiles/profile-test.jpg");
  } finally {
    restore();
  }
});

test("user service rejects profile image update without file", async () => {
  const { userService, restore } = loadUserService({
    userModel: {
      findUserById: async () => createUserRow(),
    },
    hashPassword: async () => "new-hash",
    comparePassword: async () => true,
  });

  try {
    await assert.rejects(userService.updateMyProfileImage(1, null), (error) => {
      assert.equal(error.message, "Profile image file is required");
      assert.equal(error.statusCode, 400);
      return true;
    });
  } finally {
    restore();
  }
});

test("user service lists users with pagination metadata", async () => {
  const calls = {};
  const { userService, restore } = loadUserService({
    userModel: {
      findUsers: async (query) => {
        calls.findUsers = query;
        return [
          createUserRow({
            id: 2,
            role_name: "owner",
            created_at: "2026-05-13T01:00:00.000Z",
            updated_at: "2026-05-13T01:00:00.000Z",
          }),
        ];
      },
      countUsers: async (query) => {
        calls.countUsers = query;
        return 21;
      },
    },
    hashPassword: async () => "new-hash",
    comparePassword: async () => true,
  });

  try {
    const result = await userService.listUsers({
      role: "owner",
      status: "active",
      search: "owner",
      page: 2,
      limit: 10,
    });

    assert.deepEqual(calls.findUsers, {
      role: "owner",
      status: "active",
      search: "owner",
      limit: 10,
      offset: 10,
    });
    assert.deepEqual(calls.countUsers, {
      role: "owner",
      status: "active",
      search: "owner",
    });
    assert.equal(result.users.length, 1);
    assert.equal(result.users[0].id, 2);
    assert.equal(result.users[0].role, "owner");
    assert.equal(result.pagination.total, 21);
    assert.equal(result.pagination.total_pages, 3);
    assert.equal(Object.hasOwn(result.users[0], "password_hash"), false);
  } finally {
    restore();
  }
});

test("user service updates user status", async () => {
  const calls = {};
  let readCount = 0;
  const { userService, restore } = loadUserService({
    userModel: {
      findUserById: async (userId) => {
        readCount += 1;
        return readCount === 1
          ? createUserRow({ id: userId, status_name: "active" })
          : createUserRow({ id: userId, status_name: "suspended" });
      },
      findStatusByName: async (status) => {
        calls.findStatusByName = status;
        return { id: 2, status_name: status };
      },
      updateStatus: async (userId, statusId) => {
        calls.updateStatus = { userId, statusId };
      },
    },
    hashPassword: async () => "new-hash",
    comparePassword: async () => true,
  });

  try {
    const user = await userService.updateUserStatus(1, 2, "suspended");

    assert.equal(calls.findStatusByName, "suspended");
    assert.deepEqual(calls.updateStatus, {
      userId: 2,
      statusId: 2,
    });
    assert.equal(user.id, 2);
    assert.equal(user.status, "suspended");
  } finally {
    restore();
  }
});

test("user service prevents admins from suspending their own account", async () => {
  const { userService, restore } = loadUserService({
    userModel: {},
    hashPassword: async () => "new-hash",
    comparePassword: async () => true,
  });

  try {
    await assert.rejects(userService.updateUserStatus(1, 1, "suspended"), (error) => {
      assert.equal(error.message, "Admins cannot suspend their own account");
      assert.equal(error.statusCode, 400);
      return true;
    });
  } finally {
    restore();
  }
});

test("user service changes password after verifying the current password", async () => {
  const calls = {};
  const { userService, restore } = loadUserService({
    userModel: {
      findUserById: async () => createUserRow(),
      updatePassword: async (userId, passwordHash) => {
        calls.updatePassword = { userId, passwordHash };
      },
    },
    hashPassword: async (password) => {
      calls.hashPassword = password;
      return "new-hash";
    },
    comparePassword: async (password, hash) => {
      calls.comparePassword = { password, hash };
      return true;
    },
    notificationService: {
      NOTIFICATION_TYPES: {
        PASSWORD_CHANGED: "password_changed",
      },
      notifyUserSafely: async (payload) => {
        calls.notifyUserSafely = payload;
      },
    },
  });

  try {
    await userService.changeMyPassword(1, {
      current_password: "old-password",
      new_password: "new-password",
    });

    assert.deepEqual(calls.comparePassword, {
      password: "old-password",
      hash: "stored-hash",
    });
    assert.equal(calls.hashPassword, "new-password");
    assert.deepEqual(calls.updatePassword, {
      userId: 1,
      passwordHash: "new-hash",
    });
    assert.equal(calls.notifyUserSafely.userId, 1);
    assert.equal(calls.notifyUserSafely.type, "password_changed");
    assert.equal(calls.notifyUserSafely.critical, true);
    assert.equal(
      calls.notifyUserSafely.email.subject,
      "Your SrokYerng Booking password was changed"
    );
  } finally {
    restore();
  }
});

test("user service rejects password change when current password is wrong", async () => {
  const { userService, restore } = loadUserService({
    userModel: {
      findUserById: async () => createUserRow(),
      updatePassword: async () => {
        throw new Error("should not update password");
      },
    },
    hashPassword: async () => "new-hash",
    comparePassword: async () => false,
  });

  try {
    await assert.rejects(
      userService.changeMyPassword(1, {
        current_password: "wrong-password",
        new_password: "new-password",
      }),
      (error) => {
        assert.equal(error.message, "Current password is incorrect");
        assert.equal(error.statusCode, 401);
        return true;
      }
    );
  } finally {
    restore();
  }
});
