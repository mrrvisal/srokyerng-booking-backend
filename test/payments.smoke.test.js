// test/payments.smoke.test.js
const test = require("node:test");
const assert = require("node:assert/strict");

// ─── Path resolution for mock injection ───────────────────────────
const paymentServicePath = require.resolve("../src/modules/payments/payment.service");
const paymentModelPath = require.resolve("../src/modules/payments/payment.model");
const propertyModelPath = require.resolve("../src/modules/properties/property.model");
const paymentValidationPath =
  require.resolve("../src/modules/payments/payment.validation");

// ─── Helpers ───────────────────────────────────────────────────────
const createRes = () => ({
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
});

const mockReservation = (overrides = {}) => ({
  id: 1,
  customer_id: 10,
  owner_id: 20,
  room_id: 5,
  property_id: 3,
  total_amount: "250.00",
  reservation_status: "confirmed",
  check_in_date: "2026-07-01",
  check_out_date: "2026-07-06",
  total_nights: 5,
  ...overrides,
});

const mockPaymentRow = (overrides = {}) => ({
  id: 1,
  reservation_id: 1,
  customer_id: 10,
  owner_id: 20,
  amount: 250,
  currency: "USD",
  transaction_reference: null,
  receipt_image_url: null,
  verified_at: null,
  paid_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  payment_method_id: 1,
  method_name: "ABA",
  payment_status_id: 1,
  status_name: "pending",
  customer_name: "Jane Customer",
  customer_email: "jane@example.com",
  customer_phone: "012000000",
  check_in_date: "2026-07-01",
  check_out_date: "2026-07-06",
  total_nights: 5,
  reservation_status: "confirmed",
  room_name: "Deluxe Room",
  property_name: "Ocean View Hotel",
  property_id: 3,
  verified_by: null,
  verified_by_name: null,
  ...overrides,
});

// ─── Load service with injected model mock ─────────────────────────
const loadPaymentService = (modelMocks = {}) => {
  const originalService = require.cache[paymentServicePath];
  const originalPaymentModel = require.cache[paymentModelPath];
  const originalPropertyModel = require.cache[propertyModelPath];

  delete require.cache[paymentServicePath];

  const shouldMockPaymentModel =
    modelMocks.paymentModel ||
    Object.keys(modelMocks).some(
      (key) => key !== "propertyModel" && key !== "paymentModel"
    );

  if (shouldMockPaymentModel) {
    require.cache[paymentModelPath] = {
      id: paymentModelPath,
      filename: paymentModelPath,
      loaded: true,
      exports: modelMocks.paymentModel || modelMocks,
    };
  }

  if (modelMocks.propertyModel) {
    require.cache[propertyModelPath] = {
      id: propertyModelPath,
      filename: propertyModelPath,
      loaded: true,
      exports: modelMocks.propertyModel,
    };
  }

  const service = require(paymentServicePath);

  const restore = () => {
    delete require.cache[paymentServicePath];
    if (shouldMockPaymentModel) delete require.cache[paymentModelPath];
    if (modelMocks.propertyModel) delete require.cache[propertyModelPath];
    if (originalService) require.cache[paymentServicePath] = originalService;
    if (originalPaymentModel) require.cache[paymentModelPath] = originalPaymentModel;
    if (originalPropertyModel) require.cache[propertyModelPath] = originalPropertyModel;
  };

  return { service, restore };
};

// ─── Validation tests ──────────────────────────────────────────────

test("validateCreatePayment rejects missing reservation_id", () => {
  const { validateCreatePayment } = require(paymentValidationPath);
  const { errors } = validateCreatePayment({ payment_method_id: 1 });
  assert.ok(errors.length > 0);
  assert.ok(errors.some((e) => e.includes("Reservation ID")));
});

test("validateCreatePayment rejects missing payment_method_id", () => {
  const { validateCreatePayment } = require(paymentValidationPath);
  const { errors } = validateCreatePayment({ reservation_id: 1 });
  assert.ok(errors.length > 0);
  assert.ok(errors.some((e) => e.includes("Payment method ID")));
});

test("validateCreatePayment accepts valid payload", () => {
  const { validateCreatePayment } = require(paymentValidationPath);
  const { errors, value } = validateCreatePayment({
    reservation_id: 1,
    payment_method_id: 2,
  });
  assert.equal(errors.length, 0);
  assert.equal(value.reservation_id, 1);
});

test("validateRejectPayment requires rejection_reason", () => {
  const { validateRejectPayment } = require(paymentValidationPath);
  const { errors } = validateRejectPayment({});
  assert.ok(errors.length > 0);
  assert.ok(errors.some((e) => e.includes("Rejection reason")));
});

test("validateRejectPayment accepts valid reason", () => {
  const { validateRejectPayment } = require(paymentValidationPath);
  const { errors } = validateRejectPayment({ rejection_reason: "Fake receipt" });
  assert.equal(errors.length, 0);
});

// ─── Status transition tests ───────────────────────────────────────

test("isValidTransition: pending → submitted is allowed", () => {
  const { isValidTransition } = require(paymentValidationPath);
  assert.equal(isValidTransition("pending", "submitted"), true);
});

test("isValidTransition: submitted → paid is allowed", () => {
  const { isValidTransition } = require(paymentValidationPath);
  assert.equal(isValidTransition("submitted", "paid"), true);
});

test("isValidTransition: submitted → failed is allowed", () => {
  const { isValidTransition } = require(paymentValidationPath);
  assert.equal(isValidTransition("submitted", "failed"), true);
});

test("isValidTransition: paid → refunded is allowed", () => {
  const { isValidTransition } = require(paymentValidationPath);
  assert.equal(isValidTransition("paid", "refunded"), true);
});

test("isValidTransition: pending → paid is NOT allowed", () => {
  const { isValidTransition } = require(paymentValidationPath);
  assert.equal(isValidTransition("pending", "paid"), false);
});

test("isValidTransition: failed → paid is NOT allowed", () => {
  const { isValidTransition } = require(paymentValidationPath);
  assert.equal(isValidTransition("failed", "paid"), false);
});

test("isValidTransition: refunded → any is NOT allowed", () => {
  const { isValidTransition } = require(paymentValidationPath);
  assert.equal(isValidTransition("refunded", "paid"), false);
  assert.equal(isValidTransition("refunded", "pending"), false);
});

// ─── Service: createPayment ────────────────────────────────────────

test("createPayment returns 404 when reservation not found", async () => {
  const { service, restore } = loadPaymentService({
    findReservationById: async () => null,
  });

  try {
    await assert.rejects(
      service.createPayment(10, { reservation_id: 99, payment_method_id: 1 }),
      (err) => {
        assert.equal(err.statusCode, 404);
        assert.match(err.message, /not found/i);
        return true;
      }
    );
  } finally {
    restore();
  }
});

test("createPayment returns 403 when reservation belongs to another customer", async () => {
  const { service, restore } = loadPaymentService({
    findReservationById: async () => mockReservation({ customer_id: 99 }),
  });

  try {
    await assert.rejects(
      service.createPayment(10, { reservation_id: 1, payment_method_id: 1 }),
      (err) => {
        assert.equal(err.statusCode, 403);
        return true;
      }
    );
  } finally {
    restore();
  }
});

test("createPayment returns 400 for non-payable reservation status", async () => {
  const { service, restore } = loadPaymentService({
    findReservationById: async () => mockReservation({ reservation_status: "cancelled" }),
  });

  try {
    await assert.rejects(
      service.createPayment(10, { reservation_id: 1, payment_method_id: 1 }),
      (err) => {
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  } finally {
    restore();
  }
});

test("createPayment returns 409 when payment already exists", async () => {
  const { service, restore } = loadPaymentService({
    findReservationById: async () => mockReservation(),
    findExistingPaymentForReservation: async () => ({ id: 5 }),
  });

  try {
    await assert.rejects(
      service.createPayment(10, { reservation_id: 1, payment_method_id: 1 }),
      (err) => {
        assert.equal(err.statusCode, 409);
        return true;
      }
    );
  } finally {
    restore();
  }
});

test("createPayment returns 400 when payment method inactive", async () => {
  const { service, restore } = loadPaymentService({
    findReservationById: async () => mockReservation(),
    findExistingPaymentForReservation: async () => null,
    findPaymentMethodById: async () => null,
  });

  try {
    await assert.rejects(
      service.createPayment(10, { reservation_id: 1, payment_method_id: 99 }),
      (err) => {
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  } finally {
    restore();
  }
});

test("createPayment creates payment with correct amount from reservation", async () => {
  const calls = {};
  const row = mockPaymentRow({ status_name: "pending" });

  const { service, restore } = loadPaymentService({
    findReservationById: async () => mockReservation({ total_amount: "350.00" }),
    findExistingPaymentForReservation: async () => null,
    findPaymentMethodById: async () => ({ id: 1, method_name: "ABA" }),
    findPaymentStatusByName: async () => ({ id: 1, status_name: "pending" }),
    createPayment: async (data) => {
      calls.createPayment = data;
      return 42;
    },
    findPaymentById: async () => row,
  });

  try {
    const result = await service.createPayment(10, {
      reservation_id: 1,
      payment_method_id: 1,
    });

    assert.equal(calls.createPayment.amount, 350);
    assert.equal(calls.createPayment.customerId, 10);
    assert.equal(calls.createPayment.ownerId, 20);
    assert.equal(result.payment_status, "pending");
    assert.equal(result.payment_method, "ABA");
  } finally {
    restore();
  }
});

test("validateCreateOwnerPaymentAccount rejects missing payment_method_id", () => {
  const { validateCreateOwnerPaymentAccount } = require(paymentValidationPath);
  const { errors } = validateCreateOwnerPaymentAccount({ account_name: "Owner ABA" });
  assert.ok(errors.length > 0);
  assert.ok(errors.some((e) => e.includes("Payment method ID")));
});

test("validateCreateOwnerPaymentAccount rejects missing account_name", () => {
  const { validateCreateOwnerPaymentAccount } = require(paymentValidationPath);
  const { errors } = validateCreateOwnerPaymentAccount({ payment_method_id: 1 });
  assert.ok(errors.length > 0);
  assert.ok(errors.some((e) => e.includes("Account name")));
});

test("validateCreateOwnerPaymentAccount accepts valid payload", () => {
  const { validateCreateOwnerPaymentAccount } = require(paymentValidationPath);
  const { errors, value } = validateCreateOwnerPaymentAccount({
    payment_method_id: 1,
    account_name: "Owner ABA",
  });
  assert.equal(errors.length, 0);
  assert.equal(value.account_name, "Owner ABA");
});

test("createOwnerPaymentAccount returns 400 when payment method inactive", async () => {
  const { service, restore } = loadPaymentService({
    findPaymentMethodById: async () => null,
  });

  try {
    await assert.rejects(
      service.createOwnerPaymentAccount(20, {
        payment_method_id: 99,
        account_name: "Owner ABA",
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

test("createOwnerPaymentAccount returns 409 when duplicate active payment method exists", async () => {
  const { service, restore } = loadPaymentService({
    findPaymentMethodById: async () => ({ id: 1, method_name: "ABA" }),
    findOwnerActivePaymentAccountByOwnerAndMethod: async () => ({ id: 5 }),
  });

  try {
    await assert.rejects(
      service.createOwnerPaymentAccount(20, {
        payment_method_id: 1,
        account_name: "Owner ABA",
        account_number: "123456",
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

test("createOwnerPaymentAccount returns account details when valid", async () => {
  const account = {
    id: 10,
    owner_id: 20,
    payment_method_id: 1,
    method_name: "ABA",
    account_name: "Owner ABA",
    account_number: "123456",
    qr_image_url: null,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const { service, restore } = loadPaymentService({
    findPaymentMethodById: async () => ({ id: 1, method_name: "ABA" }),
    findOwnerActivePaymentAccountByOwnerAndMethod: async () => null,
    createOwnerPaymentAccount: async () => 10,
    findOwnerPaymentAccountById: async () => account,
  });

  try {
    const result = await service.createOwnerPaymentAccount(20, {
      payment_method_id: 1,
      account_name: "Owner ABA",
      account_number: "123456",
    });

    assert.equal(result.owner_id, 20);
    assert.equal(result.payment_method_name, "ABA");
    assert.equal(result.account_name, "Owner ABA");
  } finally {
    restore();
  }
});

test("getPropertyPaymentAccounts returns 404 when property missing", async () => {
  const { service, restore } = loadPaymentService({
    propertyModel: {
      findPropertyById: async () => null,
    },
  });

  try {
    await assert.rejects(
      service.getPropertyPaymentAccounts(999),
      (err) => {
        assert.equal(err.statusCode, 404);
        return true;
      }
    );
  } finally {
    restore();
  }
});

test("getPropertyPaymentAccounts returns active owner payment accounts", async () => {
  const accounts = [
    {
      id: 12,
      owner_id: 20,
      payment_method_id: 1,
      method_name: "ABA",
      account_name: "Owner ABA",
      account_number: "123456",
      qr_image_url: null,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  const { service, restore } = loadPaymentService({
    propertyModel: {
      findPropertyById: async () => ({ owner_id: 20 }),
    },
    findActiveOwnerPaymentAccountsByOwnerId: async () => accounts,
  });

  try {
    const result = await service.getPropertyPaymentAccounts(3);
    assert.equal(result.length, 1);
    assert.equal(result[0].owner_id, 20);
  } finally {
    restore();
  }
});

test("updateOwnerPaymentAccount returns 403 when account belongs to another owner", async () => {
  const { service, restore } = loadPaymentService({
    findOwnerPaymentAccountById: async () => ({
      id: 20,
      owner_id: 99,
      payment_method_id: 1,
      account_name: "Other Owner",
      account_number: "123",
      qr_image_url: null,
    }),
  });

  try {
    await assert.rejects(
      service.updateOwnerPaymentAccount(20, 20, { account_name: "New Name" }),
      (err) => {
        assert.equal(err.statusCode, 403);
        return true;
      }
    );
  } finally {
    restore();
  }
});

test("activateOwnerPaymentAccount returns 403 when activating another owner's account", async () => {
  const { service, restore } = loadPaymentService({
    findOwnerPaymentAccountById: async () => ({
      id: 21,
      owner_id: 99,
      payment_method_id: 1,
      is_active: false,
    }),
  });

  try {
    await assert.rejects(
      service.activateOwnerPaymentAccount(20, 21),
      (err) => {
        assert.equal(err.statusCode, 403);
        return true;
      }
    );
  } finally {
    restore();
  }
});

test("deactivateOwnerPaymentAccount returns 403 when deactivating another owner's account", async () => {
  const { service, restore } = loadPaymentService({
    findOwnerPaymentAccountById: async () => ({
      id: 22,
      owner_id: 99,
      payment_method_id: 1,
      is_active: true,
    }),
  });

  try {
    await assert.rejects(
      service.deactivateOwnerPaymentAccount(20, 22),
      (err) => {
        assert.equal(err.statusCode, 403);
        return true;
      }
    );
  } finally {
    restore();
  }
});

test("deleteOwnerPaymentAccount deactivates the authenticated owner's account", async () => {
  let callCount = 0;
  const activeAccount = {
    id: 23,
    owner_id: 20,
    payment_method_id: 1,
    is_active: true,
  };
  const inactiveAccount = {
    ...activeAccount,
    is_active: false,
  };

  const { service, restore } = loadPaymentService({
    findOwnerPaymentAccountById: async () => {
      callCount += 1;
      return callCount === 1 ? activeAccount : inactiveAccount;
    },
    setOwnerPaymentAccountActive: async () => {},
  });

  try {
    const result = await service.deleteOwnerPaymentAccount(20, 23);
    assert.equal(result.id, 23);
    assert.equal(result.is_active, false);
  } finally {
    restore();
  }
});

// ─── Service: uploadReceipt ────────────────────────────────────────

test("uploadReceipt returns 400 when no file provided", async () => {
  const { service, restore } = loadPaymentService({});

  try {
    await assert.rejects(service.uploadReceipt(10, 1, null), (err) => {
      assert.equal(err.statusCode, 400);
      return true;
    });
  } finally {
    restore();
  }
});

test("uploadReceipt returns 404 when payment not found", async () => {
  const { service, restore } = loadPaymentService({
    findPaymentById: async () => null,
  });

  try {
    await assert.rejects(
      service.uploadReceipt(10, 1, { filename: "test.jpg" }),
      (err) => {
        assert.equal(err.statusCode, 404);
        return true;
      }
    );
  } finally {
    restore();
  }
});

test("uploadReceipt returns 403 when payment belongs to another customer", async () => {
  const { service, restore } = loadPaymentService({
    findPaymentById: async () => mockPaymentRow({ customer_id: 99 }),
  });

  try {
    await assert.rejects(
      service.uploadReceipt(10, 1, { filename: "test.jpg" }),
      (err) => {
        assert.equal(err.statusCode, 403);
        return true;
      }
    );
  } finally {
    restore();
  }
});

test("uploadReceipt returns 400 for non-uploadable payment status", async () => {
  const { service, restore } = loadPaymentService({
    findPaymentById: async () => mockPaymentRow({ status_name: "paid" }),
  });

  try {
    await assert.rejects(
      service.uploadReceipt(10, 1, { filename: "test.jpg" }),
      (err) => {
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  } finally {
    restore();
  }
});

test("uploadReceipt updates receipt URL and transitions status to submitted", async () => {
  const calls = {};
  const updated = mockPaymentRow({
    status_name: "submitted",
    receipt_image_url: "/uploads/receipts/test.jpg",
  });

  const { service, restore } = loadPaymentService({
    findPaymentById: async (id) => {
      if (calls.findPaymentById) return updated;
      calls.findPaymentById = id;
      return mockPaymentRow({ status_name: "pending" });
    },
    findPaymentStatusByName: async () => ({ id: 2, status_name: "submitted" }),
    updateReceiptUrl: async (pid, url, sid) => {
      calls.updateReceiptUrl = { pid, url, sid };
    },
  });

  try {
    const result = await service.uploadReceipt(10, 1, { filename: "test.jpg" });
    assert.ok(calls.updateReceiptUrl.url.includes("test.jpg"));
    assert.equal(result.payment_status, "submitted");
  } finally {
    restore();
  }
});

// ─── Service: admin actions ────────────────────────────────────────

test("verifyPayment transitions submitted → paid", async () => {
  const calls = {};
  const paidRow = mockPaymentRow({ status_name: "paid" });

  const { service, restore } = loadPaymentService({
    findPaymentById: async () => {
      if (calls.updated) return paidRow;
      calls.updated = true;
      return mockPaymentRow({ status_name: "submitted" });
    },
    findPaymentStatusByName: async (name) => {
      calls.targetStatus = name;
      return { id: 3, status_name: name };
    },
    updatePaymentStatus: async (pid, sid, extra) => {
      calls.updatePaymentStatus = { pid, sid, extra };
    },
  });

  try {
    const result = await service.verifyPayment(20, 1);
    assert.equal(calls.targetStatus, "paid");
    assert.equal(calls.updatePaymentStatus.extra.verified_by, 20);
    assert.ok(calls.updatePaymentStatus.extra.paid_at instanceof Date);
    assert.equal(result.payment_status, "paid");
  } finally {
    restore();
  }
});

test("verifyPayment returns 400 for invalid transition (pending → paid)", async () => {
  const { service, restore } = loadPaymentService({
    findPaymentById: async () => mockPaymentRow({ status_name: "pending" }),
  });

  try {
    await assert.rejects(service.verifyPayment(20, 1), (err) => {
      assert.equal(err.statusCode, 400);
      return true;
    });
  } finally {
    restore();
  }
});

test("rejectPayment transitions submitted → failed", async () => {
  const calls = {};
  const failedRow = mockPaymentRow({
    status_name: "failed",
    rejection_reason: "Blurry receipt image",
  });

  const { service, restore } = loadPaymentService({
    findPaymentById: async () => {
      if (calls.updated) return failedRow;
      calls.updated = true;
      return mockPaymentRow({ status_name: "submitted" });
    },
    findPaymentStatusByName: async (name) => {
      calls.targetStatus = name;
      return { id: 4, status_name: name };
    },
    updatePaymentStatus: async (pid, sid, extra) => {
      calls.updatePaymentStatus = { pid, sid, extra };
    },
  });

  try {
    const result = await service.rejectPayment(20, 1, "Blurry receipt image");
    assert.equal(calls.targetStatus, "failed");
    assert.equal(
      calls.updatePaymentStatus.extra.rejection_reason,
      "Blurry receipt image"
    );
    assert.equal(result.payment_status, "failed");
  } finally {
    restore();
  }
});

test("refundPayment transitions paid → refunded", async () => {
  const calls = {};
  const refundedRow = mockPaymentRow({ status_name: "refunded" });

  const { service, restore } = loadPaymentService({
    findPaymentById: async () => {
      if (calls.updated) return refundedRow;
      calls.updated = true;
      return mockPaymentRow({ status_name: "paid" });
    },
    findPaymentStatusByName: async (name) => ({ id: 5, status_name: name }),
    updatePaymentStatus: async (pid, sid, extra) => {
      calls.updatePaymentStatus = { pid, sid, extra };
    },
  });

  try {
    const result = await service.refundPayment(20, 1);
    assert.equal(result.payment_status, "refunded");
    assert.equal(calls.updatePaymentStatus.extra.verified_by, 20);
  } finally {
    restore();
  }
});

test("refundPayment returns 400 when payment is not paid", async () => {
  const { service, restore } = loadPaymentService({
    findPaymentById: async () => mockPaymentRow({ status_name: "submitted" }),
  });

  try {
    await assert.rejects(service.refundPayment(20, 1), (err) => {
      assert.equal(err.statusCode, 400);
      return true;
    });
  } finally {
    restore();
  }
});

// ─── Service: getPaymentById access control ────────────────────────

test("getPaymentById allows customer to view own payment", async () => {
  const { service, restore } = loadPaymentService({
    findPaymentById: async () => mockPaymentRow({ customer_id: 10 }),
  });

  try {
    const result = await service.getPaymentById(1, 10, "customer");
    assert.equal(result.customer_id, 10);
  } finally {
    restore();
  }
});

test("getPaymentById returns 403 for wrong customer", async () => {
  const { service, restore } = loadPaymentService({
    findPaymentById: async () => mockPaymentRow({ customer_id: 99, owner_id: 20 }),
  });

  try {
    await assert.rejects(service.getPaymentById(1, 10, "customer"), (err) => {
      assert.equal(err.statusCode, 403);
      return true;
    });
  } finally {
    restore();
  }
});

test("getPaymentById allows admin to view any payment", async () => {
  const { service, restore } = loadPaymentService({
    findPaymentById: async () => mockPaymentRow({ customer_id: 99 }),
  });

  try {
    const result = await service.getPaymentById(1, 1, "admin");
    assert.ok(result.id);
  } finally {
    restore();
  }
});

test("getPaymentById allows owner to view payment for their property", async () => {
  const { service, restore } = loadPaymentService({
    findPaymentById: async () => mockPaymentRow({ owner_id: 20 }),
  });

  try {
    const result = await service.getPaymentById(1, 20, "owner");
    assert.equal(result.owner_id, 20);
  } finally {
    restore();
  }
});

test("getPaymentById allows admin to retrieve payment proof data", async () => {
  const { service, restore } = loadPaymentService({
    findPaymentById: async () =>
      mockPaymentRow({
        id: 1,
        status_name: "submitted",
        receipt_image_url: "/uploads/receipts/test.jpg",
        rejection_reason: null,
        verified_at: null,
        paid_at: null,
        verified_by: null,
        verified_by_name: null,
      }),
  });

  try {
    const result = await service.getPaymentById(1, 1, "admin");
    assert.equal(result.receipt_image_url, "/uploads/receipts/test.jpg");
    assert.equal(result.payment_status, "submitted");
  } finally {
    restore();
  }
});

// ─── Service: getMyPayments ────────────────────────────────────────

test("getMyPayments returns list of customer payments", async () => {
  const rows = [
    mockPaymentRow({ id: 1, status_name: "pending" }),
    mockPaymentRow({ id: 2, status_name: "submitted" }),
  ];
  const { service, restore } = loadPaymentService({
    findPaymentsByCustomer: async (cid, _filters) => {
      assert.equal(cid, 10);
      return rows;
    },
  });

  try {
    const result = await service.getMyPayments(10);
    assert.equal(result.length, 2);
    assert.equal(result[0].id, 1);
    assert.equal(result[1].payment_status, "submitted");
  } finally {
    restore();
  }
});

test("getPaymentsPendingVerification returns submitted payments", async () => {
  const rows = [
    mockPaymentRow({ id: 11, status_name: "submitted" }),
    mockPaymentRow({ id: 12, status_name: "submitted" }),
  ];

  const { service, restore } = loadPaymentService({
    findAllPayments: async (filters) => {
      assert.equal(filters.status, "submitted");
      return rows;
    },
  });

  try {
    const result = await service.getPaymentsPendingVerification();
    assert.equal(result.length, 2);
    assert.equal(result[0].payment_status, "submitted");
    assert.equal(result[1].id, 12);
  } finally {
    restore();
  }
});

test("getPendingVerificationPayments controller returns payment list", async () => {
  const req = { user: { id: 1, role: "admin" } };
  const res = createRes();
  const servicePath = require.resolve("../src/modules/payments/payment.service");
  const controllerPath = require.resolve("../src/modules/payments/payment.controller");
  const originalService = require.cache[servicePath];
  const originalController = require.cache[controllerPath];
  const stubService = {
    getPaymentsPendingVerification: async () => [
      {
        ...mockPaymentRow({ id: 11, status_name: "submitted" }),
        payment_status: "submitted",
      },
    ],
  };

  delete require.cache[servicePath];
  delete require.cache[controllerPath];
  require.cache[servicePath] = {
    id: servicePath,
    filename: servicePath,
    loaded: true,
    exports: stubService,
  };

  const controller = require("../src/modules/payments/payment.controller");

  try {
    await controller.getPendingVerificationPayments(req, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.success, true);
    assert.equal(res.payload.data.length, 1);
    assert.equal(res.payload.data[0].payment_status, "submitted");
  } finally {
    delete require.cache[servicePath];
    delete require.cache[controllerPath];
    if (originalService) require.cache[servicePath] = originalService;
    if (originalController) require.cache[controllerPath] = originalController;
  }
});

// ─── Controller: validation rejections via HTTP layer ─────────────

test("createPayment controller returns 400 for missing fields", async () => {
  const paymentController = require("../src/modules/payments/payment.controller");
  const req = { user: { id: 10, role: "customer" }, body: {} };
  const res = createRes();

  await paymentController.createPayment(req, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.message, "Validation failed");
});

test("rejectPayment controller returns 400 for missing rejection_reason", async () => {
  const paymentController = require("../src/modules/payments/payment.controller");
  const req = { user: { id: 1, role: "admin" }, params: { id: "1" }, body: {} };
  const res = createRes();

  await paymentController.rejectPayment(req, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
});

test("getPaymentById controller returns 400 for invalid id", async () => {
  const paymentController = require("../src/modules/payments/payment.controller");
  const req = { user: { id: 1, role: "admin" }, params: { id: "abc" } };
  const res = createRes();

  await paymentController.getPaymentById(req, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
});
