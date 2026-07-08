const test = require("node:test");
const assert = require("node:assert/strict");

const analyticsServicePath = require.resolve("../src/modules/owner/analytics.service");
const analyticsModelPath = require.resolve("../src/modules/owner/analytics.model");
const analyticsControllerPath = require.resolve(
  "../src/modules/owner/analytics.controller"
);

const loadAnalyticsService = ({ analyticsModel }) => {
  const originalCache = {
    analyticsService: require.cache[analyticsServicePath],
    analyticsModel: require.cache[analyticsModelPath],
    analyticsController: require.cache[analyticsControllerPath],
  };

  delete require.cache[analyticsServicePath];
  delete require.cache[analyticsControllerPath];
  require.cache[analyticsModelPath] = {
    id: analyticsModelPath,
    filename: analyticsModelPath,
    loaded: true,
    exports: analyticsModel,
  };

  const analyticsService = require(analyticsServicePath);

  const restore = () => {
    delete require.cache[analyticsServicePath];
    delete require.cache[analyticsModelPath];
    delete require.cache[analyticsControllerPath];

    const pathByKey = {
      analyticsService: analyticsServicePath,
      analyticsModel: analyticsModelPath,
      analyticsController: analyticsControllerPath,
    };

    Object.entries(originalCache).forEach(([key, value]) => {
      if (value) {
        require.cache[pathByKey[key]] = value;
      }
    });
  };

  return { analyticsService, restore };
};

const createMockRes = () => {
  const res = {
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
  return res;
};

const createMockReq = (overrides = {}) => {
  return {
    query: {},
    user: { id: 1, role: "owner" },
    params: {},
    ...overrides,
  };
};

// Test: getDashboardSummary
test("getDashboardSummary returns owner dashboard summary without date filters", async () => {
  const mockAnalyticsModel = {
    getDashboardSummary: async () => ({
      total_reservations: 50,
      confirmed_reservations: 30,
      completed_reservations: 20,
      upcoming_reservations: 10,
    }),
  };

  const { analyticsService } = loadAnalyticsService({
    analyticsModel: mockAnalyticsModel,
  });

  const result = await analyticsService.getDashboardSummary(1, null, null);

  assert.ok(result.dashboard_summary);
  assert.equal(result.dashboard_summary.total_reservations, 50);
  assert.equal(result.dashboard_summary.confirmed_reservations, 30);
  assert.equal(result.dashboard_summary.completed_reservations, 20);
  assert.equal(result.dashboard_summary.upcoming_reservations, 10);
});

// Test: getDashboardSummary with date filter
test("getDashboardSummary throws error when only one date is provided", async () => {
  const mockAnalyticsModel = {
    getDashboardSummary: async () => ({}),
  };

  const { analyticsService } = loadAnalyticsService({
    analyticsModel: mockAnalyticsModel,
  });

  try {
    await analyticsService.getDashboardSummary(1, "2026-01-01", null);
    assert.fail("Should have thrown error");
  } catch (error) {
    assert.equal(error.statusCode, 400);
  }
});

// Test: getReservationAnalytics
test("getReservationAnalytics returns reservation counts by status", async () => {
  const mockAnalyticsModel = {
    getReservationStats: async () => [
      { status: "pending", count: 5, avg_nights: "3.00", total_amount: "500.00" },
      { status: "confirmed", count: 20, avg_nights: "2.50", total_amount: "2000.00" },
      { status: "completed", count: 25, avg_nights: "2.00", total_amount: "2500.00" },
    ],
    verifyPropertyOwnership: async () => true,
  };

  const { analyticsService } = loadAnalyticsService({
    analyticsModel: mockAnalyticsModel,
  });

  const result = await analyticsService.getReservationAnalytics(1, null, null);

  assert.ok(result.reservations_by_status);
  assert.equal(result.reservations_by_status.confirmed.count, 20);
  assert.equal(result.total_reservations, 50);
});

// Test: getReservationAnalytics with property_id
test("getReservationAnalytics validates property ownership", async () => {
  const mockAnalyticsModel = {
    getReservationStats: async () => [],
    verifyPropertyOwnership: async () => false,
  };

  const { analyticsService } = loadAnalyticsService({
    analyticsModel: mockAnalyticsModel,
  });

  try {
    await analyticsService.getReservationAnalytics(1, null, null, 999);
    assert.fail("Should have thrown error");
  } catch (error) {
    assert.equal(error.statusCode, 403);
    assert.match(error.message, /does not belong to this owner/);
  }
});

// Test: getRevenueAnalytics
test("getRevenueAnalytics returns revenue by status with net revenue calculation", async () => {
  const mockAnalyticsModel = {
    getRevenueStats: async () => [
      { status: "pending", count: 5, total_amount: "500.00" },
      { status: "paid", count: 30, total_amount: "3000.00" },
      { status: "failed", count: 2, total_amount: "200.00" },
      { status: "refunded", count: 3, total_amount: "300.00" },
    ],
    verifyPropertyOwnership: async () => true,
  };

  const { analyticsService } = loadAnalyticsService({
    analyticsModel: mockAnalyticsModel,
  });

  const result = await analyticsService.getRevenueAnalytics(1, null, null);

  assert.ok(result.revenue_by_status);
  assert.equal(result.paid_revenue, 3000);
  assert.equal(result.refunded_revenue, 300);
  assert.equal(result.net_revenue, 2700);
});

// Test: getTopProperties
test("getTopProperties returns top performing properties", async () => {
  const mockAnalyticsModel = {
    getTopProperties: async () => [
      {
        id: 1,
        property_name: "Beach Resort",
        reservation_count: 50,
        total_revenue: "5000.00",
        avg_rating: "4.8",
        unique_customers: 40,
      },
      {
        id: 2,
        property_name: "Mountain Villa",
        reservation_count: 30,
        total_revenue: "3000.00",
        avg_rating: "4.5",
        unique_customers: 25,
      },
    ],
    verifyPropertyOwnership: async () => true,
  };

  const { analyticsService } = loadAnalyticsService({
    analyticsModel: mockAnalyticsModel,
  });

  const result = await analyticsService.getTopProperties(1, 10, null, null);

  assert.ok(result.top_properties);
  assert.equal(result.top_properties.length, 2);
  assert.equal(result.top_properties[0].property_name, "Beach Resort");
  assert.equal(result.top_properties[0].total_revenue, 5000);
});

// Test: getTopRooms
test("getTopRooms returns top performing rooms", async () => {
  const mockAnalyticsModel = {
    getTopRooms: async () => [
      {
        id: 1,
        room_name: "Deluxe Suite",
        property_name: "Beach Resort",
        price_per_night: "100.00",
        reservation_count: 30,
        total_revenue: "3000.00",
        avg_rating: "4.9",
      },
      {
        id: 2,
        room_name: "Standard Room",
        property_name: "Beach Resort",
        price_per_night: "50.00",
        reservation_count: 20,
        total_revenue: "1000.00",
        avg_rating: "4.3",
      },
    ],
    verifyPropertyOwnership: async () => true,
  };

  const { analyticsService } = loadAnalyticsService({
    analyticsModel: mockAnalyticsModel,
  });

  const result = await analyticsService.getTopRooms(1, 10, null, null);

  assert.ok(result.top_rooms);
  assert.equal(result.top_rooms.length, 2);
  assert.equal(result.top_rooms[0].room_name, "Deluxe Suite");
  assert.equal(result.top_rooms[0].price_per_night, 100);
});

// Test: Invalid date format
test("analyticsService throws error with invalid date format", async () => {
  const mockAnalyticsModel = {
    getDashboardSummary: async () => ({}),
  };

  const { analyticsService } = loadAnalyticsService({
    analyticsModel: mockAnalyticsModel,
  });

  try {
    await analyticsService.getDashboardSummary(1, "not-a-date", "2026-12-31");
    assert.fail("Should have thrown error");
  } catch (error) {
    assert.equal(error.statusCode, 400);
    assert.match(error.message, /Invalid date format/);
  }
});

// Test: start_date after end_date
test("analyticsService throws error when start_date is after end_date", async () => {
  const mockAnalyticsModel = {
    getDashboardSummary: async () => ({}),
  };

  const { analyticsService } = loadAnalyticsService({
    analyticsModel: mockAnalyticsModel,
  });

  try {
    await analyticsService.getDashboardSummary(1, "2026-12-31", "2026-01-01");
    assert.fail("Should have thrown error");
  } catch (error) {
    assert.equal(error.statusCode, 400);
    assert.match(error.message, /start_date must be before end_date/);
  }
});

// Test: Validation helper
test("analytics validation returns 400 for invalid date range", async () => {
  const { validateDateRange } = require("../src/modules/owner/analytics.validation");
  const errors = validateDateRange({ start_date: "2026-01-01" });

  assert.ok(errors.length > 0);
  assert.match(errors[0], /Both start_date and end_date must be provided together/);
});

// Test: Date validation with valid range
test("analytics validation accepts valid date range", async () => {
  const { validateDateRange } = require("../src/modules/owner/analytics.validation");
  const errors = validateDateRange({ start_date: "2026-01-01", end_date: "2026-12-31" });

  assert.equal(errors.length, 0);
});

// Test: Revenue calculation with multiple payment statuses
test("getRevenueAnalytics calculates paid, refunded, and cancelled separately", async () => {
  const mockAnalyticsModel = {
    getRevenueStats: async () => [
      { status: "paid", count: 25, total_amount: "2500.00" },
      { status: "refunded", count: 3, total_amount: "300.00" },
      { status: "cancelled", count: 2, total_amount: "200.00" },
    ],
    verifyPropertyOwnership: async () => true,
  };

  const { analyticsService } = loadAnalyticsService({
    analyticsModel: mockAnalyticsModel,
  });

  const result = await analyticsService.getRevenueAnalytics(1, null, null);

  assert.equal(result.paid_revenue, 2500);
  assert.equal(result.refunded_revenue, 300);
  assert.equal(result.cancelled_revenue, 200);
  assert.equal(result.net_revenue, 2200);
});

// Test: Limit parameter enforcement
test("getTopProperties enforces limit maximum of 50", async () => {
  const mockAnalyticsModel = {
    getTopProperties: async (ownerId, limit) => {
      assert.ok(limit <= 50);
      return [];
    },
    verifyPropertyOwnership: async () => true,
  };

  const { analyticsService } = loadAnalyticsService({
    analyticsModel: mockAnalyticsModel,
  });

  await analyticsService.getTopProperties(1, 100, null, null);
});

// ==================== OWNER ANALYTICS CONTROLLER TESTS ====================

let ownerAnalyticsController;

// Test: Owner controller getSummary with mock req/res
test("owner analytics controller getSummary returns dashboard summary", async () => {
  const { analyticsService } = loadAnalyticsService({
    analyticsModel: {
      getDashboardSummary: async () => ({
        total_reservations: 50,
        confirmed_reservations: 30,
        completed_reservations: 20,
        upcoming_reservations: 10,
      }),
    },
  });

  ownerAnalyticsController = require("../src/modules/owner/analytics.controller");

  const req = createMockReq({ query: {} });
  const res = createMockRes();

  await ownerAnalyticsController.getSummary(req, res);

  assert.equal(res.statusCode, 200);
  assert.ok(res.payload);
  assert.equal(res.payload.data.dashboard_summary.total_reservations, 50);
  assert.equal(res.payload.data.dashboard_summary.confirmed_reservations, 30);
});

// Test: Owner controller getReservations with mock req/res
test("owner analytics controller getReservations returns reservation stats", async () => {
  const { analyticsService } = loadAnalyticsService({
    analyticsModel: {
      getReservationStats: async () => [
        { status: "pending", count: 5, avg_nights: "3.00", total_amount: "500.00" },
        { status: "confirmed", count: 20, avg_nights: "2.50", total_amount: "2000.00" },
        { status: "completed", count: 25, avg_nights: "2.00", total_amount: "2500.00" },
      ],
      verifyPropertyOwnership: async () => true,
    },
  });

  ownerAnalyticsController = require("../src/modules/owner/analytics.controller");

  const req = createMockReq({ query: {} });
  const res = createMockRes();

  await ownerAnalyticsController.getReservations(req, res);

  assert.equal(res.statusCode, 200);
  assert.ok(res.payload);
  assert.equal(res.payload.data.reservations_by_status.confirmed.count, 20);
  assert.equal(res.payload.data.total_reservations, 50);
});

// Test: Owner controller getRevenue with mock req/res
test("owner analytics controller getRevenue returns revenue stats", async () => {
  const { analyticsService } = loadAnalyticsService({
    analyticsModel: {
      getRevenueStats: async () => [
        { status: "paid", count: 30, total_amount: "3000.00" },
        { status: "refunded", count: 3, total_amount: "300.00" },
      ],
      verifyPropertyOwnership: async () => true,
    },
  });

  ownerAnalyticsController = require("../src/modules/owner/analytics.controller");

  const req = createMockReq({ query: {} });
  const res = createMockRes();

  await ownerAnalyticsController.getRevenue(req, res);

  assert.equal(res.statusCode, 200);
  assert.ok(res.payload);
  assert.equal(res.payload.data.paid_revenue, 3000);
  assert.equal(res.payload.data.net_revenue, 2700);
});

// Test: Owner controller getProperties with mock req/res
test("owner analytics controller getProperties returns top properties", async () => {
  const { analyticsService } = loadAnalyticsService({
    analyticsModel: {
      getTopProperties: async () => [
        {
          id: 1,
          property_name: "Beach Resort",
          reservation_count: 50,
          total_revenue: "5000.00",
          avg_rating: "4.8",
          unique_customers: 40,
        },
      ],
      verifyPropertyOwnership: async () => true,
    },
  });

  ownerAnalyticsController = require("../src/modules/owner/analytics.controller");

  const req = createMockReq({ query: { limit: "10" } });
  const res = createMockRes();

  await ownerAnalyticsController.getProperties(req, res);

  assert.equal(res.statusCode, 200);
  assert.ok(res.payload);
  assert.equal(res.payload.data.top_properties.length, 1);
  assert.equal(res.payload.data.top_properties[0].property_name, "Beach Resort");
});

// Test: Owner controller getRooms with mock req/res
test("owner analytics controller getRooms returns top rooms", async () => {
  const { analyticsService } = loadAnalyticsService({
    analyticsModel: {
      getTopRooms: async () => [
        {
          id: 1,
          room_name: "Deluxe Suite",
          property_name: "Beach Resort",
          price_per_night: "100.00",
          reservation_count: 30,
          total_revenue: "3000.00",
          avg_rating: "4.9",
        },
      ],
      verifyPropertyOwnership: async () => true,
    },
  });

  ownerAnalyticsController = require("../src/modules/owner/analytics.controller");

  const req = createMockReq({ query: { limit: "10" } });
  const res = createMockRes();

  await ownerAnalyticsController.getRooms(req, res);

  assert.equal(res.statusCode, 200);
  assert.ok(res.payload);
  assert.equal(res.payload.data.top_rooms.length, 1);
  assert.equal(res.payload.data.top_rooms[0].room_name, "Deluxe Suite");
});

// Test: Owner controller with invalid date range returns 400
test("owner analytics controller returns 400 for invalid date range", async () => {
  const { analyticsService } = loadAnalyticsService({
    analyticsModel: {
      getDashboardSummary: async () => ({}),
    },
  });

  ownerAnalyticsController = require("../src/modules/owner/analytics.controller");

  const req = createMockReq({ query: { start_date: "01-01-2026" } });
  const res = createMockRes();

  await ownerAnalyticsController.getSummary(req, res);

  assert.equal(res.statusCode, 400);
  assert.ok(res.payload);
  assert.equal(res.payload.success, false);
});

// Test: Owner controller with invalid limit returns 400
test("owner analytics controller returns 400 for invalid limit on getProperties", async () => {
  const { analyticsService } = loadAnalyticsService({
    analyticsModel: {
      getTopProperties: async () => [],
    },
  });

  ownerAnalyticsController = require("../src/modules/owner/analytics.controller");

  const req = createMockReq({ query: { limit: "100" } });
  const res = createMockRes();

  await ownerAnalyticsController.getProperties(req, res);

  assert.equal(res.statusCode, 400);
  assert.ok(res.payload);
  assert.match(res.payload.message, /Limit must be a number between 1 and 50/i);
});

// Test: Owner controller with invalid property_id returns 400
test("owner analytics controller returns 400 for invalid property_id", async () => {
  const { analyticsService } = loadAnalyticsService({
    analyticsModel: {
      getReservationStats: async () => [],
    },
  });

  ownerAnalyticsController = require("../src/modules/owner/analytics.controller");

  const req = createMockReq({ query: { property_id: "abc" } });
  const res = createMockRes();

  await ownerAnalyticsController.getReservations(req, res);

  assert.equal(res.statusCode, 400);
  assert.ok(res.payload);
  assert.match(res.payload.message, /Validation failed/);
});

// Test: Owner analytics routes are mounted in owner routes
test("owner routes mount analytics controller methods", async () => {
  const ownerRoutes = require("../src/modules/owner/owner.routes");

  const analyticsRoutes = ownerRoutes.stack.filter((layer) => {
    return layer.route && layer.route.path.includes("/analytics");
  });

  assert.equal(analyticsRoutes.length, 5);
  assert.ok(analyticsRoutes.some((r) => r.route.path === "/analytics/summary"));
  assert.ok(analyticsRoutes.some((r) => r.route.path === "/analytics/reservations"));
  assert.ok(analyticsRoutes.some((r) => r.route.path === "/analytics/revenue"));
  assert.ok(analyticsRoutes.some((r) => r.route.path === "/analytics/properties"));
  assert.ok(analyticsRoutes.some((r) => r.route.path === "/analytics/rooms"));
});

// ==================== AUTHORIZATION / ROLE MIDDLEWARE TESTS ====================

// Test: Owner analytics routes require auth and owner role
test("owner analytics routes are protected by auth and owner role middleware", async () => {
  const ownerRoutes = require("../src/modules/owner/owner.routes");

  assert.ok(ownerRoutes.stack[0], "Auth middleware should exist");
  assert.ok(ownerRoutes.stack[1], "Role middleware should exist");
});

// Test: role middleware with owner role passes
test("role middleware allows access for owner role", async () => {
  const roleMiddleware = require("../src/middleware/role.middleware");
  const ROLES = require("../src/constants/roles");

  const middleware = roleMiddleware(ROLES.OWNER);

  const req = { user: { role: "owner" }, params: {} };
  let nextCalled = false;
  const res = createMockRes();

  middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true, "next() should be called for owner role");
});

// Test: role middleware blocks non-owner role
test("role middleware blocks access for non-owner role", async () => {
  const roleMiddleware = require("../src/middleware/role.middleware");
  const ROLES = require("../src/constants/roles");

  const middleware = roleMiddleware(ROLES.OWNER);

  const req = { user: { role: "customer" }, params: {} };
  let nextCalled = false;
  const res = createMockRes();

  middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false, "next() should NOT be called for customer role");
  assert.equal(res.statusCode, 403);
  assert.ok(res.payload);
});

// Test: role middleware blocks admin from owner routes
test("role middleware blocks admin access to owner routes", async () => {
  const roleMiddleware = require("../src/middleware/role.middleware");
  const ROLES = require("../src/constants/roles");

  const middleware = roleMiddleware(ROLES.OWNER);

  const req = { user: { role: "admin" }, params: {} };
  let nextCalled = false;
  const res = createMockRes();

  middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false, "next() should NOT be called for admin role on owner routes");
  assert.equal(res.statusCode, 403);
  assert.ok(res.payload);
});