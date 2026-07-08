const notificationService = require("./notification.service");
const { successResponse, errorResponse } = require("../../utils/apiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const {
  validateListNotificationsQuery,
  normalizeListNotificationsQuery,
  validateNotificationId,
} = require("./notification.validation");

const listMyNotifications = asyncHandler(async (req, res) => {
  const errors = validateListNotificationsQuery(req.query);

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  const query = normalizeListNotificationsQuery(req.query);
  const data = await notificationService.listMyNotifications(req.user.id, query);

  return successResponse(res, "Notifications fetched successfully", data);
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const data = await notificationService.getUnreadCount(req.user.id);

  return successResponse(res, "Unread notification count fetched successfully", data);
});

const getMyNotification = asyncHandler(async (req, res) => {
  const errors = validateNotificationId(req.params.id);

  if (errors.length > 0) {
    return errorResponse(res, "Notification ID must be a positive integer", 400);
  }

  const notification = await notificationService.getMyNotification(
    req.user.id,
    Number(req.params.id)
  );

  return successResponse(res, "Notification fetched successfully", notification);
});

const markOneAsRead = asyncHandler(async (req, res) => {
  const errors = validateNotificationId(req.params.id);

  if (errors.length > 0) {
    return errorResponse(res, "Notification ID must be a positive integer", 400);
  }

  const notification = await notificationService.markOneAsRead(req.user.id, Number(req.params.id));

  return successResponse(res, "Notification marked as read", notification);
});

const markAllAsRead = asyncHandler(async (req, res) => {
  const data = await notificationService.markAllAsRead(req.user.id);

  return successResponse(res, "All notifications marked as read", data);
});

const archiveOne = asyncHandler(async (req, res) => {
  const errors = validateNotificationId(req.params.id);

  if (errors.length > 0) {
    return errorResponse(res, "Notification ID must be a positive integer", 400);
  }

  const data = await notificationService.archiveOne(req.user.id, Number(req.params.id));

  return successResponse(res, "Notification archived successfully", data);
});

module.exports = {
  listMyNotifications,
  getMyNotification,
  getUnreadCount,
  markOneAsRead,
  markAllAsRead,
  archiveOne,
};
