const userModel = require("./user.model");
const { comparePassword, hashPassword } = require("../../utils/hashPassword");
const { USER_STATUS } = require("../../constants/statuses");
const notificationService = require("../notifications/notification.service");

const toSafeUser = (user) => {
  const safeUser = {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role_name,
    status: user.status_name,
    profile_image_url: user.profile_image_url,
    gender: user.gender,
    date_of_birth: user.date_of_birth,
    address: user.address,
    last_login: user.last_login,
    email_verified_at: user.email_verified_at,
  };

  if (Object.hasOwn(user, "created_at")) {
    safeUser.created_at = user.created_at;
  }

  if (Object.hasOwn(user, "updated_at")) {
    safeUser.updated_at = user.updated_at;
  }

  return safeUser;
};

const ensureActiveUser = async (userId) => {
  const user = await userModel.findUserById(userId);

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

  return user;
};

const getMyProfile = async (userId) => {
  const user = await ensureActiveUser(userId);

  return toSafeUser(user);
};

const updateMyProfile = async (userId, payload) => {
  const user = await ensureActiveUser(userId);
  const getNextValue = (field) => {
    return Object.hasOwn(payload, field) ? payload[field] : user[field];
  };

  const nextProfile = {
    full_name: getNextValue("full_name"),
    phone: getNextValue("phone"),
    profile_image_url: getNextValue("profile_image_url"),
    gender: getNextValue("gender"),
    date_of_birth: getNextValue("date_of_birth"),
    address: getNextValue("address"),
  };

  await userModel.updateProfile(userId, nextProfile);

  const updatedUser = await ensureActiveUser(userId);

  return toSafeUser(updatedUser);
};

const changeMyPassword = async (userId, { current_password, new_password }) => {
  const user = await ensureActiveUser(userId);
  const isMatch = await comparePassword(current_password, user.password_hash);

  if (!isMatch) {
    const error = new Error("Current password is incorrect");
    error.statusCode = 401;
    throw error;
  }

  const passwordHash = await hashPassword(new_password);
  await userModel.updatePassword(userId, passwordHash);
  await notificationService.notifyUserSafely({
    userId,
    type: notificationService.NOTIFICATION_TYPES.PASSWORD_CHANGED,
    title: "Password changed",
    message: "Your account password was changed successfully.",
    critical: true,
    email: {
      subject: "Your SrokYerng Booking password was changed",
      title: "Password changed",
      message:
        "Your account password was changed successfully. If this was not you, reset your password immediately.",
    },
  });
};

const updateMyProfileImage = async (userId, file) => {
  await ensureActiveUser(userId);

  if (!file) {
    const error = new Error("Profile image file is required");
    error.statusCode = 400;
    throw error;
  }

  const profileImageUrl = `/uploads/profiles/${file.filename}`;
  await userModel.updateProfileImage(userId, profileImageUrl);

  const updatedUser = await ensureActiveUser(userId);

  return toSafeUser(updatedUser);
};

const deleteMyProfileImage = async (userId) => {
  await ensureActiveUser(userId);

  await userModel.updateProfileImage(userId, null);

  const updatedUser = await ensureActiveUser(userId);

  return toSafeUser(updatedUser);
};

const listUsers = async ({ role, status, search, page, limit }) => {
  const offset = (page - 1) * limit;
  const [users, total] = await Promise.all([
    userModel.findUsers({ role, status, search, limit, offset }),
    userModel.countUsers({ role, status, search }),
  ]);

  return {
    users: users.map(toSafeUser),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
};

const getUserById = async (userId) => {
  const user = await userModel.findUserById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return toSafeUser(user);
};

const updateUserStatus = async (actorUserId, targetUserId, status) => {
  if (actorUserId === targetUserId && status === USER_STATUS.SUSPENDED) {
    const error = new Error("Admins cannot suspend their own account");
    error.statusCode = 400;
    throw error;
  }

  const user = await userModel.findUserById(targetUserId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (user.status_name === status) {
    return toSafeUser(user);
  }

  const selectedStatus = await userModel.findStatusByName(status);

  if (!selectedStatus) {
    const error = new Error("System statuses are not seeded");
    error.statusCode = 500;
    throw error;
  }

  await userModel.updateStatus(targetUserId, selectedStatus.id);

  return getUserById(targetUserId);
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
  updateMyProfileImage,
  deleteMyProfileImage,
  listUsers,
  getUserById,
  updateUserStatus,
};
