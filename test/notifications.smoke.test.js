const test = require("node:test");
const assert = require("node:assert/strict");

const notificationController = require("../src/modules/notifications/notification.controller");

const notificationServicePath = require.resolve(
  "../src/modules/notifications/notification.service"
);
const notificationModelPath = require.resolve("../src/modules/notifications/notification.model");
const emailServicePath = require.resolve("../src/modules/notifications/email.service");

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

const loadNotificationService = ({ notificationModel, emailService }) => {
  const originalCache = {
    notificationService: require.cache[notificationServicePath],
    notificationModel: require.cache[notificationModelPath],
    emailService: require.cache[emailServicePath],
  };

  delete require.cache[notificationServicePath];
  require.cache[notificationModelPath] = {
    id: notificationModelPath,
    filename: notificationModelPath,
    loaded: true,
    exports: notificationModel,
  };
  require.cache[emailServicePath] = {
    id: emailServicePath,
    filename: emailServicePath,
    loaded: true,
    exports: emailService,
  };

  const notificationService = require(notificationServicePath);

  const restore = () => {
    delete require.cache[notificationServicePath];
    delete require.cache[notificationModelPath];
    delete require.cache[emailServicePath];

    const pathByKey = {
      notificationService: notificationServicePath,
      notificationModel: notificationModelPath,
      emailService: emailServicePath,
    };

    Object.entries(originalCache).forEach(([key, value]) => {
      if (value) {
        require.cache[pathByKey[key]] = value;
      }
    });
  };

  return { notificationService, restore };
};

const createNotificationRow = (overrides = {}) => ({
  id: 1,
  user_id: 7,
  notification_type: "reservation_created",
  channel: "in_app",
  title: "Reservation created",
  message: "Your reservation was created.",
  metadata: JSON.stringify({ reservation_id: 10 }),
  delivery_status: "delivered",
  is_read: 0,
  read_at: null,
  archived_at: null,
  sent_at: null,
  created_at: "2026-06-01 10:00:00",
  updated_at: "2026-06-01 10:00:00",
  ...overrides,
});

test("notifications list controller returns 400 for invalid pagination", async () => {
  const req = { user: { id: 1 }, query: { page: "0" } };
  const res = createRes();
  const next = () => {};

  await notificationController.listMyNotifications(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.message, "Validation failed");
});

test("notification service lists only current user's notifications with pagination", async () => {
  const calls = {};
  const { notificationService, restore } = loadNotificationService({
    notificationModel: {
      findNotificationsByUserId: async (query) => {
        calls.find = query;
        return [createNotificationRow()];
      },
      countNotificationsByUserId: async (query) => {
        calls.count = query;
        return 1;
      },
    },
    emailService: {
      sendNotificationEmail: async () => {},
    },
  });

  try {
    const result = await notificationService.listMyNotifications(7, {
      page: 2,
      limit: 5,
      status: "unread",
      type: "reservation_created",
    });

    assert.deepEqual(calls.find, {
      userId: 7,
      status: "unread",
      type: "reservation_created",
      limit: 5,
      offset: 5,
    });
    assert.deepEqual(calls.count, {
      userId: 7,
      status: "unread",
      type: "reservation_created",
    });
    assert.equal(result.notifications[0].type, "reservation_created");
    assert.deepEqual(result.notifications[0].data, { reservation_id: 10 });
    assert.deepEqual(result.pagination, {
      page: 2,
      limit: 5,
      total: 1,
      total_pages: 1,
    });
  } finally {
    restore();
  }
});

test("notification service fetches one notification owned by current user", async () => {
  const { notificationService, restore } = loadNotificationService({
    notificationModel: {
      findNotificationForUser: async (notificationId, userId) => {
        assert.equal(notificationId, 12);
        assert.equal(userId, 7);
        return createNotificationRow({ id: 12, user_id: 7 });
      },
    },
    emailService: {
      sendNotificationEmail: async () => {},
    },
  });

  try {
    const result = await notificationService.getMyNotification(7, 12);

    assert.equal(result.id, 12);
    assert.equal(result.user_id, 7);
  } finally {
    restore();
  }
});

test("notification service rejects marking another user's notification as read", async () => {
  const { notificationService, restore } = loadNotificationService({
    notificationModel: {
      findNotificationForUser: async () => null,
      markNotificationRead: async () => {
        throw new Error("Should not update");
      },
    },
    emailService: {
      sendNotificationEmail: async () => {},
    },
  });

  try {
    await assert.rejects(
      () => notificationService.markOneAsRead(7, 99),
      /Notification not found/
    );
  } finally {
    restore();
  }
});

test("notification service returns unread count", async () => {
  const { notificationService, restore } = loadNotificationService({
    notificationModel: {
      countUnreadByUserId: async (userId) => {
        assert.equal(userId, 7);
        return 3;
      },
    },
    emailService: {
      sendNotificationEmail: async () => {},
    },
  });

  try {
    const result = await notificationService.getUnreadCount(7);

    assert.deepEqual(result, { unread_count: 3 });
  } finally {
    restore();
  }
});

test("notification service archives one notification owned by current user", async () => {
  const calls = {};
  const { notificationService, restore } = loadNotificationService({
    notificationModel: {
      findNotificationForUser: async (notificationId, userId) => {
        calls.findNotificationForUser = { notificationId, userId };
        return createNotificationRow({ id: notificationId, user_id: userId });
      },
      archiveNotification: async (notificationId, userId) => {
        calls.archiveNotification = { notificationId, userId };
      },
    },
    emailService: {
      sendNotificationEmail: async () => {},
    },
  });

  try {
    const result = await notificationService.archiveOne(7, 12);

    assert.deepEqual(calls.findNotificationForUser, {
      notificationId: 12,
      userId: 7,
    });
    assert.deepEqual(calls.archiveNotification, {
      notificationId: 12,
      userId: 7,
    });
    assert.deepEqual(result, { archived: true });
  } finally {
    restore();
  }
});

test("notifyUser creates in-app notification even when critical email fails", async () => {
  const calls = {};
  const originalConsoleError = console.error;
  console.error = () => {};
  const { notificationService, restore } = loadNotificationService({
    notificationModel: {
      createNotification: async (payload) => {
        calls.createNotification = payload;
        return 123;
      },
      findUserEmailById: async (userId) => {
        calls.findUserEmailById = userId;
        return {
          id: userId,
          full_name: "Customer User",
          email: "customer@example.com",
        };
      },
    },
    emailService: {
      sendNotificationEmail: async () => {
        throw new Error("SMTP unavailable");
      },
    },
  });

  try {
    const notificationId = await notificationService.notifyUser({
      userId: 7,
      type: "payment_verified",
      title: "Payment verified",
      message: "Your payment was verified.",
      data: { payment_id: 55 },
      critical: true,
    });

    assert.equal(notificationId, 123);
    assert.equal(calls.findUserEmailById, 7);
    assert.deepEqual(calls.createNotification, {
      userId: 7,
      type: "payment_verified",
      title: "Payment verified",
      message: "Your payment was verified.",
      metadata: { payment_id: 55 },
      deliveryStatus: "delivered",
    });
  } finally {
    console.error = originalConsoleError;
    restore();
  }
});
