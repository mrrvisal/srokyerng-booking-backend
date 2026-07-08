const userService = require("./user.service");
const { successResponse, errorResponse } = require("../../utils/apiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const {
  normalizeProfileBody,
  normalizePasswordBody,
  normalizeListUsersQuery,
  normalizeStatusBody,
  validateProfile,
  validatePassword,
  validateListUsersQuery,
  validateStatus,
} = require("./user.validation");

const getMe = asyncHandler(async (req, res) => {
  const user = await userService.getMyProfile(req.user.id);

  return successResponse(res, "Profile fetched successfully", user);
});

const updateMe = asyncHandler(async (req, res) => {
  const payload = normalizeProfileBody(req.body);
  const errors = validateProfile(payload);

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  const user = await userService.updateMyProfile(req.user.id, payload);

  return successResponse(res, "Profile updated successfully", user);
});

const changePassword = asyncHandler(async (req, res) => {
  const payload = normalizePasswordBody(req.body);
  const errors = validatePassword(payload);

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  await userService.changeMyPassword(req.user.id, payload);

  return successResponse(res, "Password changed successfully");
});

const updateProfileImage = asyncHandler(async (req, res) => {
  const user = await userService.updateMyProfileImage(req.user.id, req.file);

  return successResponse(res, "Profile image updated successfully", user);
});

const deleteProfileImage = asyncHandler(async (req, res) => {
  const user = await userService.deleteMyProfileImage(req.user.id);

  return successResponse(res, "Profile image removed successfully", user);
});

const getAll = asyncHandler(async (req, res) => {
  const query = normalizeListUsersQuery(req.query);
  const errors = validateListUsersQuery(query);

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  const result = await userService.listUsers(query);

  return successResponse(res, "Users fetched successfully", result);
});

const getById = asyncHandler(async (req, res) => {
  const userId = Number(req.params.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return errorResponse(res, "User ID must be a positive integer", 400);
  }

  const user = await userService.getUserById(userId);

  return successResponse(res, "User fetched successfully", user);
});

const updateStatus = asyncHandler(async (req, res) => {
  const payload = normalizeStatusBody(req.body);
  const errors = validateStatus(payload);

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  const userId = Number(req.params.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return errorResponse(res, "User ID must be a positive integer", 400);
  }

  const user = await userService.updateUserStatus(req.user.id, userId, payload.status);

  return successResponse(res, "User status updated successfully", user);
});

module.exports = {
  getMe,
  updateMe,
  changePassword,
  updateProfileImage,
  deleteProfileImage,
  getAll,
  getById,
  updateStatus,
};
