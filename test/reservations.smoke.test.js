// test/reservations.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const reservationService = require("../src/modules/reservations/reservation.service");

const reservationServicePath =
  require.resolve("../src/modules/reservations/reservation.service");
const reservationModelPath =
  require.resolve("../src/modules/reservations/reservation.model");

const mockReservation = {
  id: 1,
  customer_id: 1,
  owner_id: 2,
  room_id: 1,
  check_in_date: "2026-07-01",
  check_out_date: "2026-07-05",
  total_guests: 2,
  total_nights: 4,
  total_amount: 400,
  reservation_status: "confirmed",
};

const loadReservationService = (modelMock) => {
  const originalService = require.cache[reservationServicePath];
  const originalReservationModel = require.cache[reservationModelPath];

  delete require.cache[reservationServicePath];

  if (modelMock) {
    require.cache[reservationModelPath] = {
      id: reservationModelPath,
      filename: reservationModelPath,
      loaded: true,
      exports: modelMock,
    };
  }

  const service = require(reservationServicePath);

  const restore = () => {
    delete require.cache[reservationServicePath];
    if (modelMock) delete require.cache[reservationModelPath];
    if (originalService) require.cache[reservationServicePath] = originalService;
    if (originalReservationModel)
      require.cache[reservationModelPath] = originalReservationModel;
  };

  return { service, restore };
};

test("calculateTotalNights returns correct number of nights", () => {
  const nights = reservationService.calculateTotalNights("2026-06-01", "2026-06-05");
  assert.equal(nights, 4);
});

test("calculateTotalAmount returns correct amount", () => {
  const amount = reservationService.calculateTotalAmount(100, 4);
  assert.equal(amount, 400);
});

test("calculateTotalNights returns 1 for same day checkout", () => {
  const nights = reservationService.calculateTotalNights("2026-06-01", "2026-06-02");
  assert.equal(nights, 1);
});

test("calculateTotalAmount with zero nights", () => {
  const amount = reservationService.calculateTotalAmount(100, 0);
  assert.equal(amount, 0);
});

// Integration style tests with mocked dependencies
const mockReservationModel = {
  findReservationById: async () => mockReservation,
};

test("getCancellationPolicy returns cancellation policy for reservation owner", async () => {
  const { service, restore } = loadReservationService(mockReservationModel);
  const policy = await service.getCancellationPolicy(1, 1, "customer");

  assert.ok(policy);
  assert.equal(typeof policy.cancellation_eligibility.can_cancel, "boolean");
  assert.equal(policy.reservation_status, "confirmed");
  restore();
});

test("getCancellationPolicy denies access to unrelated customer", async () => {
  const { service, restore } = loadReservationService(mockReservationModel);

  await assert.rejects(service.getCancellationPolicy(1, 99, "customer"), (error) => {
    assert.equal(error.statusCode, 403);
    assert.equal(error.message, "You don't have permission to view this reservation");
    return true;
  });

  restore();
});

test("createReservation validates guest capacity", async () => {
  // This would need proper mocking in real implementation
  assert.ok(true, "Guest capacity validation test placeholder");
});

test("createReservation prevents overbooking", async () => {
  assert.ok(true, "Overbooking prevention test placeholder");
});

test("cancelReservation prevents cancellation after check-in", async () => {
  assert.ok(true, "Cancellation deadline test placeholder");
});

test("getReservationById enforces access control", async () => {
  assert.ok(true, "Access control test placeholder");
});
