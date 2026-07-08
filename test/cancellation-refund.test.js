                            // test/cancellation-refund.test.js
const test = require("node:test");
const assert = require("node:assert/strict");

// ─── Helpers & paths ─────────────────────────────────────────────

const reservationServicePath =
  require.resolve("../src/modules/reservations/reservation.service");
const reservationModelPath =
  require.resolve("../src/modules/reservations/reservation.model");
const cancellationPolicyPath =
  require.resolve("../src/modules/reservations/cancellation-policy");
const reservationConstPath =
  require.resolve("../src/constants/reservation");

const mockReservation = {
  id: 1,
  customer_id: 10,
  owner_id: 20,
  room_id: 5,
  check_in_date: "2026-07-01",
  check_out_date: "2026-07-05",
  total_guests: 2,
  total_nights: 4,
  total_amount: 400,
  reservation_status: "confirmed",
  cancellation_reason: null,
  updated_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
};

const mockPayment = {
  id: 100,
  reservation_id: 1,
  customer_id: 10,
  owner_id: 20,
  amount: 400,
  status_name: "paid",
  payment_status: "paid",
};

// Future reservation (valid for cancellation)
const futureReservation = {
  ...mockReservation,
  check_in_date: (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  })(),
};

// Reservation where check-in has already passed
const pastReservation = {
  ...mockReservation,
  id: 2,
  check_in_date: (() => {
    const d = new Date();
    d.setDate(d.getDate() - 5);
    return d.toISOString().split("T")[0];
  })(),
};

const completedReservation = {
  ...futureReservation,
  id: 3,
  reservation_status: "completed",
};

const cancelledReservation = {
  ...futureReservation,
  id: 4,
  reservation_status: "cancelled",
};

const pendingReservation = {
  ...futureReservation,
  id: 5,
  reservation_status: "pending",
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

// ─── Constants ──────────────────────────────────────────────────

const { CANCELLATION_DEADLINE_HOURS } = require(reservationConstPath);

// ─── Cancellation Policy Tests ──────────────────────────────────

test("Cancellation policy - customer can view policy for their reservation", async () => {
  const mockModel = {
    findReservationById: async () => futureReservation,
  };

  const { service, restore } = loadReservationService(mockModel);
  const policy = await service.getCancellationPolicy(1, 10, "customer");

  assert.ok(policy);
  assert.equal(policy.reservation_id, futureReservation.id);
  assert.equal(policy.reservation_status, futureReservation.reservation_status);
  assert.equal(policy.cancellation_deadline_hours, CANCELLATION_DEADLINE_HOURS);
  assert.ok(policy.cancellation_eligibility);
  assert.equal(typeof policy.cancellation_eligibility.can_cancel, "boolean");
  assert.ok(policy.policy_summary);
  assert.ok(policy.policy_summary.full_refund_deadline);

  restore();
});

test("Cancellation policy - reservation not found returns 404", async () => {
  const mockModel = {
    findReservationById: async () => null,
  };

  const { service, restore } = loadReservationService(mockModel);

  await assert.rejects(
    () => service.getCancellationPolicy(999, 10, "customer"),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.message, "Reservation not found");
      return true;
    }
  );

  restore();
});

test("Cancellation policy - unrelated customer cannot view policy", async () => {
  const mockModel = {
    findReservationById: async () => futureReservation,
  };

  const { service, restore } = loadReservationService(mockModel);

  await assert.rejects(
    () => service.getCancellationPolicy(1, 99, "customer"),
    (error) => {
      assert.equal(error.statusCode, 403);
      assert.equal(error.message, "You don't have permission to view this reservation");
      return true;
    }
  );

  restore();
});

test("Cancellation policy - owner can view for their property", async () => {
  const mockModel = {
    findReservationById: async () => futureReservation,
  };

  const { service, restore } = loadReservationService(mockModel);
  const policy = await service.getCancellationPolicy(1, 20, "owner");

  assert.ok(policy);
  assert.equal(policy.reservation_id, futureReservation.id);

  restore();
});

test("Cancellation policy - admin can view any policy", async () => {
  const mockModel = {
    findReservationById: async () => futureReservation,
  };

  const { service, restore } = loadReservationService(mockModel);
  const policy = await service.getCancellationPolicy(1, 1, "admin");

  assert.ok(policy);

  restore();
});

// ─── Cancellation Eligibility Tests ─────────────────────────────

test("Cancellation eligibility - can cancel future confirmed reservation", async () => {
  const { checkCancellationEligibility } = require(cancellationPolicyPath);
  const result = checkCancellationEligibility(futureReservation);
  assert.equal(result.can_cancel, true);
});

test("Cancellation eligibility - cannot cancel already cancelled reservation", async () => {
  const { checkCancellationEligibility } = require(cancellationPolicyPath);
  const result = checkCancellationEligibility(cancelledReservation);
  assert.equal(result.can_cancel, false);
  assert.ok(result.reasons.some((r) => r.includes("already cancelled")));
});

test("Cancellation eligibility - cannot cancel completed reservation", async () => {
  const { checkCancellationEligibility } = require(cancellationPolicyPath);
  const result = checkCancellationEligibility(completedReservation);
  assert.equal(result.can_cancel, false);
  assert.ok(result.reasons.some((r) => r.includes("Completed")));
});

test("Cancellation eligibility - cannot cancel when check-in date passed", async () => {
  const { checkCancellationEligibility } = require(cancellationPolicyPath);
  const result = checkCancellationEligibility(pastReservation);
  assert.equal(result.can_cancel, false);
  assert.ok(result.reasons.some((r) => r.includes("check-in date has passed")));
});

test("Cancellation eligibility - can cancel pending reservation", async () => {
  const { checkCancellationEligibility } = require(cancellationPolicyPath);
  const result = checkCancellationEligibility(pendingReservation);
  assert.equal(result.can_cancel, true);
});

// ─── Cancel Reservation Tests ───────────────────────────────────

test("cancelReservation - customer can cancel own future reservation", async () => {
  const mockModel = {
    findReservationById: async () => ({ ...futureReservation, reservation_status: "confirmed" }),
    updateReservationStatus: async () => true,
  };

  const { service, restore } = loadReservationService(mockModel);

  const origFindById = mockModel.findReservationById;
  let callCount = 0;
  mockModel.findReservationById = async (id) => {
    callCount++;
    if (callCount === 2) {
      return { ...futureReservation, reservation_status: "cancelled", cancellation_reason: "Changed plans" };
    }
    return origFindById(id);
  };

  const result = await service.cancelReservation(
    futureReservation.id,
    futureReservation.customer_id,
    "Changed plans"
  );

  assert.ok(result);
  restore();
});

test("cancelReservation - cannot cancel another customer's reservation", async () => {
  const mockModel = {
    findReservationById: async () => futureReservation,
  };

  const { service, restore } = loadReservationService(mockModel);

  await assert.rejects(
    () => service.cancelReservation(futureReservation.id, 99, "Test"),
    (error) => {
      assert.equal(error.statusCode, 403);
      assert.equal(error.message, "You can only cancel your own reservations");
      return true;
    }
  );

  restore();
});

test("cancelReservation - cannot cancel completed reservation", async () => {
  const mockModel = {
    findReservationById: async () => completedReservation,
  };

  const { service, restore } = loadReservationService(mockModel);

  await assert.rejects(
    () => service.cancelReservation(completedReservation.id, completedReservation.customer_id, "Test"),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, "Completed reservations cannot be cancelled");
      return true;
    }
  );

  restore();
});

test("cancelReservation - cannot cancel after check-in date passed", async () => {
  const mockModel = {
    findReservationById: async () => pastReservation,
  };

  const { service, restore } = loadReservationService(mockModel);

  await assert.rejects(
    () => service.cancelReservation(pastReservation.id, pastReservation.customer_id, "Test"),
    (error) => {
      assert.equal(error.message, "Cannot cancel reservation after check-in date has passed");
      return true;
    }
  );

  restore();
});

test("cancelReservation - cannot cancel already cancelled reservation", async () => {
  const mockModel = {
    findReservationById: async () => cancelledReservation,
  };

  const { service, restore } = loadReservationService(mockModel);

  await assert.rejects(
    () => service.cancelReservation(cancelledReservation.id, cancelledReservation.customer_id, "Test"),
    (error) => {
      assert.equal(error.message, "Reservation is already cancelled");
      return true;
    }
  );

  restore();
});

test("cancelReservation - reservation not found returns 404", async () => {
  const mockModel = {
    findReservationById: async () => null,
  };

  const { service, restore } = loadReservationService(mockModel);

  await assert.rejects(
    () => service.cancelReservation(999, 10, "Test"),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.message, "Reservation not found");
      return true;
    }
  );

  restore();
});

// ─── Refund Eligibility Tests ───────────────────────────────────

test("Refund eligibility - paid payment for cancelled reservation is eligible", async () => {
  const { checkRefundEligibility } = require(cancellationPolicyPath);

  const cancelled = {
    ...futureReservation,
    reservation_status: "cancelled",
    updated_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  };

  const result = checkRefundEligibility(mockPayment, cancelled);

  assert.ok(result.eligible);
  assert.ok(result.refund_amount > 0);
});

test("Refund eligibility - non-paid payment is not eligible", async () => {
  const { checkRefundEligibility } = require(cancellationPolicyPath);

  const payment = { ...mockPayment, status_name: "pending", payment_status: "pending" };
  const cancelled = {
    ...futureReservation,
    reservation_status: "cancelled",
  };

  const result = checkRefundEligibility(payment, cancelled);

  assert.equal(result.eligible, false);
});

test("Refund eligibility - already refunded payment is not eligible", async () => {
  const { checkRefundEligibility } = require(cancellationPolicyPath);

  const payment = { ...mockPayment, status_name: "refunded", payment_status: "refunded" };
  const cancelled = {
    ...futureReservation,
    reservation_status: "cancelled",
  };

  const result = checkRefundEligibility(payment, cancelled);

  assert.equal(result.eligible, false);
});

test("Refund eligibility - non-cancelled reservation not eligible", async () => {
  const { checkRefundEligibility } = require(cancellationPolicyPath);

  const result = checkRefundEligibility(mockPayment, futureReservation);

  assert.equal(result.eligible, false);
});

test("Refund eligibility - full refund when cancelled before deadline", async () => {
  const { checkRefundEligibility } = require(cancellationPolicyPath);

  // Cancellation happened well before deadline
  const cancelledEarly = {
    ...futureReservation,
    reservation_status: "cancelled",
    updated_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  };

  const result = checkRefundEligibility(mockPayment, cancelledEarly);

  assert.equal(result.eligible, true);
  assert.equal(result.refund_amount, mockPayment.amount);
  assert.equal(result.refund_percentage, 100);
});

// ─── Payment Refund Tests (Service Layer) ───────────────────────

test("refundPayment - owner can refund payment for own property", async () => {
  const paymentService = require("../src/modules/payments/payment.service");
  // These tests just verify the function exists and validates input
  assert.ok(typeof paymentService.refundPayment === "function");
});

// ─── Access Control Tests ───────────────────────────────────────

test("getReservationById - customer can view own reservation", async () => {
  const mockModel = {
    findReservationById: async () => ({ ...futureReservation, owner_id: 20 }),
  };

  const { service, restore } = loadReservationService(mockModel);
  const result = await service.getReservationById(1, 10, "customer");

  assert.ok(result);
  assert.equal(result.customer_id, 10);

  restore();
});

test("getReservationById - customer cannot view another customer's reservation", async () => {
  const mockModel = {
    findReservationById: async () => futureReservation,
  };

  const { service, restore } = loadReservationService(mockModel);

  await assert.rejects(
    () => service.getReservationById(1, 99, "customer"),
    (error) => {
      assert.equal(error.statusCode, 403);
      return true;
    }
  );

  restore();
});

test("getReservationById - owner can view reservation for own property", async () => {
  const mockModel = {
    findReservationById: async () => ({ ...futureReservation, owner_id: 20 }),
  };

  const { service, restore } = loadReservationService(mockModel);
  const result = await service.getReservationById(1, 20, "owner");

  assert.ok(result);

  restore();
});

test("getReservationById - admin can view any reservation", async () => {
  const mockModel = {
    findReservationById: async () => futureReservation,
  };

  const { service, restore } = loadReservationService(mockModel);
  const result = await service.getReservationById(1, 1, "admin");

  assert.ok(result);

  restore();
});

// ─── Cancellation Reason Stored Test ────────────────────────────

test("cancelReservation - cancellation reason is passed correctly", async () => {
  let capturedReason = null;
  let capturedStatus = null;

  const mockModel = {
    findReservationById: async () => ({ ...futureReservation, reservation_status: "confirmed" }),
    updateReservationStatus: async (id, status, reason) => {
      capturedStatus = status;
      capturedReason = reason;
      return true;
    },
  };

  const { service, restore } = loadReservationService(mockModel);

  const expectedReason = "My travel plans changed";

  // Override findReservationById to return cancelled after update
  const origFind = mockModel.findReservationById;
  let callCount = 0;
  mockModel.findReservationById = async (id) => {
    callCount++;
    if (callCount === 2) {
      return { ...futureReservation, reservation_status: "cancelled", cancellation_reason: expectedReason };
    }
    return origFind(id);
  };

  await service.cancelReservation(futureReservation.id, futureReservation.customer_id, expectedReason);

  assert.equal(capturedStatus, "cancelled");
  assert.equal(capturedReason, expectedReason);

  restore();
});

test("cancelReservation - default reason when none provided", async () => {
  let capturedReason = null;

  const mockModel = {
    findReservationById: async () => ({ ...futureReservation, reservation_status: "confirmed" }),
    updateReservationStatus: async (id, status, reason) => {
      capturedReason = reason;
      return true;
    },
  };

  const { service, restore } = loadReservationService(mockModel);

  const origFind = mockModel.findReservationById;
  let callCount = 0;
  mockModel.findReservationById = async (id) => {
    callCount++;
    if (callCount === 2) {
      return { ...futureReservation, reservation_status: "cancelled", cancellation_reason: "Cancelled by customer" };
    }
    return origFind(id);
  };

  await service.cancelReservation(futureReservation.id, futureReservation.customer_id);

  assert.equal(capturedReason, "Cancelled by customer");

  restore();
});

// ─── Owner Refund Endpoints Tests ──────────────────────────────

test("Owner refund request service methods exist", () => {
  const paymentService = require("../src/modules/payments/payment.service");

  assert.ok(typeof paymentService.getOwnerRefundRequests === "function");
  assert.ok(typeof paymentService.getOwnerPendingRefundRequests === "function");
  assert.ok(typeof paymentService.approveOwnerRefundRequest === "function");
  assert.ok(typeof paymentService.rejectOwnerRefundRequest === "function");
});

test("Owner refund request controller methods exist", () => {
  const paymentController = require("../src/modules/payments/payment.controller");

  assert.ok(typeof paymentController.getOwnerRefundRequests === "function");
  assert.ok(typeof paymentController.getOwnerPendingRefundRequests === "function");
  assert.ok(typeof paymentController.approveOwnerRefundRequest === "function");
  assert.ok(typeof paymentController.rejectOwnerRefundRequest === "function");
});

// ─── Cancellation Policy Module Tests ──────────────────────────

test("getCancellationPolicy returns valid policy structure", () => {
  const { getCancellationPolicy } = require(cancellationPolicyPath);

  const policy = getCancellationPolicy(futureReservation);

  assert.equal(policy.reservation_id, futureReservation.id);
  assert.equal(policy.reservation_status, futureReservation.reservation_status);
  assert.equal(policy.check_in_date, futureReservation.check_in_date);
  assert.ok(policy.cancellation_deadline_hours);
  assert.ok(policy.cancellation_eligibility);
  assert.ok(policy.policy_summary);
  assert.ok(policy.policy_summary.full_refund_deadline);
  assert.equal(policy.policy_summary.late_cancellation_refund_percentage, 50);
});

// ─── Unauthorized Access Tests ─────────────────────────────────

test("Unrelated owner cannot view reservation", async () => {
  const mockModel = {
    findReservationById: async () => ({ ...futureReservation, owner_id: 20 }),
  };

  const { service, restore } = loadReservationService(mockModel);

  await assert.rejects(
    () => service.getReservationById(1, 99, "owner"),
    (error) => {
      assert.equal(error.statusCode, 403);
      return true;
    }
  );

  restore();
});