const notificationModel = require("./notification.model");
const emailService = require("./email.service");
const { getIO } = require("../../services/socket.registry");

const NOTIFICATION_TYPES = {
  RESERVATION_CREATED: "reservation_created",
  RESERVATION_CONFIRMED: "reservation_confirmed",
  RESERVATION_CANCELLED: "reservation_cancelled",
  PAYMENT_SUBMITTED: "payment_submitted",
  PAYMENT_VERIFIED: "payment_verified",
  PAYMENT_REJECTED: "payment_rejected",
  PAYMENT_REFUNDED: "payment_refunded",
  PROPERTY_APPROVED: "property_approved",
  PROPERTY_REJECTED: "property_rejected",
  PASSWORD_CHANGED: "password_changed",
  SYSTEM: "system",
};

const parseMetadata = (metadata) => {
  if (!metadata) {
    return null;
  }

  if (typeof metadata === "object") {
    return metadata;
  }

  try {
    return JSON.parse(metadata);
  } catch {
    return null;
  }
};

const toNotification = (row) => {
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.notification_type,
    channel: row.channel,
    title: row.title,
    message: row.message,
    data: parseMetadata(row.metadata),
    delivery_status: row.delivery_status,
    is_read: Boolean(row.is_read),
    read_at: row.read_at,
    archived_at: row.archived_at,
    sent_at: row.sent_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

const listMyNotifications = async (userId, { page, limit, status, type }) => {
  const offset = (page - 1) * limit;
  const listStatus = status === "all" ? null : status;
  const [rows, total] = await Promise.all([
    notificationModel.findNotificationsByUserId({
      userId,
      status: listStatus,
      type,
      limit,
      offset,
    }),
    notificationModel.countNotificationsByUserId({
      userId,
      status: listStatus,
      type,
    }),
  ]);

  return {
    notifications: rows.map(toNotification),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
};

const getMyNotification = async (userId, notificationId) => {
  const notification = await notificationModel.findNotificationForUser(notificationId, userId);

  if (!notification) {
    const error = new Error("Notification not found");
    error.statusCode = 404;
    throw error;
  }

  return toNotification(notification);
};

const getUnreadCount = async (userId) => {
  const unreadCount = await notificationModel.countUnreadByUserId(userId);

  return {
    unread_count: unreadCount,
  };
};

const markOneAsRead = async (userId, notificationId) => {
  await getMyNotification(userId, notificationId);

  await notificationModel.markNotificationRead(notificationId, userId);
  const updatedNotification = await notificationModel.findNotificationForUser(
    notificationId,
    userId
  );

  return toNotification(updatedNotification);
};

const markAllAsRead = async (userId) => {
  const updatedCount = await notificationModel.markAllNotificationsRead(userId);

  return {
    updated_count: updatedCount,
  };
};

const archiveOne = async (userId, notificationId) => {
  await getMyNotification(userId, notificationId);
  await notificationModel.archiveNotification(notificationId, userId);

  return {
    archived: true,
  };
};

const sendCriticalEmail = async ({ userId, email, type }) => {
  if (!email) {
    return;
  }

  const user = await notificationModel.findUserEmailById(userId);

  if (!user) {
    return;
  }

  try {
    await emailService.sendNotificationEmail({
      to: user.email,
      subject: email.subject,
      title: email.title || email.subject,
      message: email.message,
      actionUrl: email.actionUrl,
      type,
    });
  } catch (error) {
    console.error("Notification email failed:", error);
  }
};

const notifyUser = async ({
  userId,
  type = NOTIFICATION_TYPES.SYSTEM,
  title,
  message,
  data = null,
  email = null,
  critical = false,
}) => {
  const notificationId = await notificationModel.createNotification({
    userId,
    type,
    title,
    message,
    metadata: data,
    deliveryStatus: "delivered",
  });

  try {
    getIO()?.to(`user_${userId}`).emit("notification:new", {
      id: notificationId,
      type,
      title,
      message,
      data,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Realtime notification emit failed:", error);
  }

  if (critical || email) {
    await sendCriticalEmail({
      userId,
      email: email || {
        subject: title,
        title,
        message,
      },
      type,
    });
  }

  return notificationId;
};

const notifyUserSafely = async (payload) => {
  try {
    return await notifyUser(payload);
  } catch (error) {
    console.error("Notification failed:", error);
    return null;
  }
};

module.exports = {
  NOTIFICATION_TYPES,
  listMyNotifications,
  getMyNotification,
  getUnreadCount,
  markOneAsRead,
  markAllAsRead,
  archiveOne,
  notifyUser,
  notifyUserSafely,
};
