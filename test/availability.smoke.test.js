const test = require("node:test");
const assert = require("node:assert/strict");

const servicePath = require.resolve("../src/modules/reservations/reservation.service");
const modelPath = require.resolve("../src/modules/reservations/reservation.model");

const mockRoom = (overrides = {}) => ({
  id: 1,
  price_per_night: 100,
  max_guests: 2,
  total_rooms: 2,
  property_status_id: 2,
  ...overrides,
});

const loadService = (modelMock) => {
  const originalService = require.cache[servicePath];
  const originalModel = require.cache[modelPath];

  delete require.cache[servicePath];
  require.cache[modelPath] = {
    id: modelPath,
    filename: modelPath,
    loaded: true,
    exports: modelMock,
  };

  const svc = require(servicePath);

  const restore = () => {
    delete require.cache[servicePath];
    delete require.cache[modelPath];
    if (originalService) require.cache[servicePath] = originalService;
    if (originalModel) require.cache[modelPath] = originalModel;
  };

  return { svc, restore };
};

test("checkAvailability throws 404 when room not found", async () => {
  const { svc, restore } = loadService({ findRoomById: async () => null });
  try {
    await assert.rejects(svc.checkAvailability(1, "2030-06-01", "2030-06-05"), (err) => {
      assert.equal(err.statusCode, 404);
      return true;
    });
  } finally {
    restore();
  }
});

test("checkAvailability returns availability when room exists", async () => {
  const { svc, restore } = loadService({
    findRoomById: async () => mockRoom(),
    checkAvailability: async () => ({ isAvailable: true, availableRooms: 2, bookedCount: 0, totalRooms: 2 }),
  });

  try {
    const result = await svc.checkAvailability(1, "2030-06-01", "2030-06-05");
    assert.equal(result.isAvailable, true);
    assert.equal(result.availableRooms, 2);
  } finally {
    restore();
  }
});

test("createReservation rejects past check-in date", async () => {
  const { svc, restore } = loadService({
    findRoomById: async () => mockRoom(),
    findPropertyStatusByName: async () => ({ id: 2 }),
  });

  try {
    await assert.rejects(
      svc.createReservation(1, {
        room_id: 1,
        check_in_date: "2000-01-01",
        check_out_date: "2000-01-05",
        total_guests: 1,
      }),
      (err) => {
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  } finally {
    restore();
  }
});

test("createReservation rejects when guests exceed capacity", async () => {
  const { svc, restore } = loadService({
    findRoomById: async () => mockRoom({ max_guests: 2 }),
    findPropertyStatusByName: async () => ({ id: 2 }),
  });

  try {
    await assert.rejects(
      svc.createReservation(1, {
        room_id: 1,
        check_in_date: "2030-06-01",
        check_out_date: "2030-06-05",
        total_guests: 5,
      }),
      (err) => {
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  } finally {
    restore();
  }
});

test("createReservation rejects when not available", async () => {
  const { svc, restore } = loadService({
    findRoomById: async () => mockRoom(),
    findPropertyStatusByName: async () => ({ id: 2 }),
    checkAvailability: async () => ({ isAvailable: false, availableRooms: 0, bookedCount: 2, totalRooms: 2 }),
  });

  try {
    await assert.rejects(
      svc.createReservation(1, {
        room_id: 1,
        check_in_date: "2030-06-01",
        check_out_date: "2030-06-05",
        total_guests: 1,
      }),
      (err) => {
        assert.equal(err.statusCode, 409);
        return true;
      }
    );
  } finally {
    restore();
  }
});
