const Joi = require("joi");
const paymentService = require("./payment.service");
const { successResponse, errorResponse } = require("../../utils/apiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const notificationService = require("../notifications/notification.service");
const { getIO } = require("../../services/socket.registry");
const {
  validateCreatePayment,
  validateVerifyPayment,
  validateRejectPayment,
  validateRefundPayment,
  validateCreateOwnerPaymentAccount,
  validateUpdateOwnerPaymentAccount,
} = require("./payment.validation");
const { validateId } = require("../reservations/reservation.validation");

const broadcastAdminActivity = (type, data) => {
  try {
    getIO()?.to("admins").emit("admin:activity", { type, data });
  } catch (error) {
    console.error("Admin activity emit failed:", error);
  }
};

// ─── Customer ──────────────────────────────────────────────────────

/**
 * POST /api/payments
 * Customer only — create a payment record for their reservation.
 */
const createPayment = asyncHandler(async (req, res) => {
  const { errors, value } = validateCreatePayment(req.body);
  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  const payment = await paymentService.createPayment(req.user.id, value);
  return successResponse(res, "Payment created successfully", payment, 201);
});

/**
 * GET /api/payments/my
 * Customer only — list own payments.
 */
const getMyPayments = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const payments = await paymentService.getMyPayments(req.user.id, { status });
  return successResponse(res, "Payments retrieved successfully", payments);
});

/**
 * GET /api/payments/reservation/:id/owner-payment-accounts
 * Customer only — list active payment accounts for the reservation owner.
 */
const getReservationOwnerPaymentAccounts = asyncHandler(async (req, res) => {
  const reservationId = parseInt(req.params.id, 10);
  if (isNaN(reservationId) || reservationId <= 0) {
    return errorResponse(res, "Invalid reservation ID", 400);
  }

  const accounts = await paymentService.getReservationOwnerPaymentAccounts(
    req.user.id,
    reservationId
  );
  return successResponse(res, "Owner payment accounts retrieved successfully", accounts);
});

const getOwnerPaymentAccounts = asyncHandler(async (req, res) => {
  const accounts = await paymentService.getOwnerPaymentAccounts(req.user.id);
  return successResponse(res, "Owner payment accounts retrieved successfully", accounts);
});

const createOwnerPaymentAccount = asyncHandler(async (req, res) => {
  const { errors, value } = validateCreateOwnerPaymentAccount(req.body);
  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  const qrImageUrl = req.file
    ? `/uploads/payment-account-qrs/${req.file.filename}`
    : null;
  const account = await paymentService.createOwnerPaymentAccount(req.user.id, {
    ...value,
    qr_image_url: qrImageUrl,
  });
  return successResponse(res, "Payment account created successfully", account, 201);
});

const updateOwnerPaymentAccount = asyncHandler(async (req, res) => {
  const accountId = parseInt(req.params.id, 10);
  if (isNaN(accountId) || accountId <= 0) {
    return errorResponse(res, "Invalid payment account ID", 400);
  }

  const { errors, value } = validateUpdateOwnerPaymentAccount(req.body);
  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  const qrImageUrl = req.file
    ? `/uploads/payment-account-qrs/${req.file.filename}`
    : undefined;
  const payload = {
    ...value,
  };
  if (qrImageUrl !== undefined) payload.qr_image_url = qrImageUrl;

  const account = await paymentService.updateOwnerPaymentAccount(
    req.user.id,
    accountId,
    payload
  );
  return successResponse(res, "Payment account updated successfully", account);
});

const deactivateOwnerPaymentAccount = asyncHandler(async (req, res) => {
  const accountId = parseInt(req.params.id, 10);
  if (isNaN(accountId) || accountId <= 0) {
    return errorResponse(res, "Invalid payment account ID", 400);
  }

  const account = await paymentService.deactivateOwnerPaymentAccount(
    req.user.id,
    accountId
  );
  return successResponse(res, "Payment account deactivated successfully", account);
});

const deleteOwnerPaymentAccount = asyncHandler(async (req, res) => {
  const accountId = parseInt(req.params.id, 10);
  if (isNaN(accountId) || accountId <= 0) {
    return errorResponse(res, "Invalid payment account ID", 400);
  }

  const account = await paymentService.deleteOwnerPaymentAccount(req.user.id, accountId);
  return successResponse(res, "Payment account deleted successfully", account);
});

const activateOwnerPaymentAccount = asyncHandler(async (req, res) => {
  const accountId = parseInt(req.params.id, 10);
  if (isNaN(accountId) || accountId <= 0) {
    return errorResponse(res, "Invalid payment account ID", 400);
  }

  const account = await paymentService.activateOwnerPaymentAccount(
    req.user.id,
    accountId
  );
  return successResponse(res, "Payment account activated successfully", account);
});

const getPropertyPaymentAccounts = asyncHandler(async (req, res) => {
  const propertyId = parseInt(req.params.propertyId, 10);
  if (isNaN(propertyId) || propertyId <= 0) {
    return errorResponse(res, "Invalid property ID", 400);
  }

  const accounts = await paymentService.getPropertyPaymentAccounts(propertyId);
  return successResponse(res, "Payment accounts retrieved successfully", accounts);
});

const getAdminOwnerPaymentAccounts = asyncHandler(async (req, res) => {
  const filters = {};
  if (req.query.owner_id) filters.owner_id = parseInt(req.query.owner_id, 10);
  if (req.query.payment_method_id)
    filters.payment_method_id = parseInt(req.query.payment_method_id, 10);
  if (typeof req.query.is_active !== "undefined") {
    filters.is_active = req.query.is_active === "true";
  }

  const accounts = await paymentService.getAdminOwnerPaymentAccounts(filters);
  return successResponse(res, "Payment accounts retrieved successfully", accounts);
});

const getAdminOwnerPaymentAccountById = asyncHandler(async (req, res) => {
  const accountId = parseInt(req.params.id, 10);
  if (isNaN(accountId) || accountId <= 0) {
    return errorResponse(res, "Invalid payment account ID", 400);
  }

  const account = await paymentService.getAdminOwnerPaymentAccountById(accountId);
  return successResponse(res, "Payment account retrieved successfully", account);
});

/**
 * GET /api/owner/payments
 * Owner only — list payments for own properties.
 */
const getOwnerPayments = asyncHandler(async (req, res) => {
  const { status, customer_id, reservation_id } = req.query;
  const filters = {};
  if (status) filters.status = status;
  if (customer_id) filters.customer_id = parseInt(customer_id);
  if (reservation_id) filters.reservation_id = parseInt(reservation_id);

  const payments = await paymentService.getOwnerPayments(req.user.id, filters);
  return successResponse(res, "Owner payments retrieved successfully", payments);
});

/**
 * GET /api/payments/:id
 * Customer (own), owner (own property), admin.
 */
const getPaymentById = asyncHandler(async (req, res) => {
  const paymentId = parseInt(req.params.id, 10);
  if (isNaN(paymentId) || paymentId <= 0) {
    return errorResponse(res, "Invalid payment ID", 400);
  }

  const payment = await paymentService.getPaymentById(
    paymentId,
    req.user.id,
    req.user.role
  );
  return successResponse(res, "Payment retrieved successfully", payment);
});

/**
 * GET /api/payments/:id/proof
 * Customer/admin — view payment proof details.
 */
const getPaymentProof = asyncHandler(async (req, res) => {
  const paymentId = parseInt(req.params.id, 10);
  if (isNaN(paymentId) || paymentId <= 0) {
    return errorResponse(res, "Invalid payment ID", 400);
  }

  const payment = await paymentService.getPaymentById(
    paymentId,
    req.user.id,
    req.user.role
  );
  return successResponse(res, "Payment proof retrieved successfully", {
    id: payment.id,
    payment_status: payment.payment_status,
    receipt_image_url: payment.receipt_image_url,
    rejection_reason: payment.rejection_reason,
    verified_by: payment.verified_by,
    verified_by_name: payment.verified_by_name,
    verified_at: payment.verified_at,
    paid_at: payment.paid_at,
  });
});

/**
 * POST /api/payments/:id/receipt
 * Customer only — upload proof of payment for own payment.
 * multer is applied in the route layer so `req.file` is available here.
 */
const uploadReceipt = asyncHandler(async (req, res) => {
  const paymentId = parseInt(req.params.id, 10);
  if (isNaN(paymentId) || paymentId <= 0) {
    return errorResponse(res, "Invalid payment ID", 400);
  }

  const payment = await paymentService.uploadReceipt(
    req.user.id,
    paymentId,
    req.file,
    req.body?.transaction_reference
  );

  // Notify owner that a payment has been submitted (non-blocking)
  if (notificationService && notificationService.notifyUserSafely) {
    notificationService
      .notifyUserSafely({
        userId: payment.owner_id,
        type: notificationService.NOTIFICATION_TYPES.PAYMENT_SUBMITTED,
        title: "Payment submitted",
        message: "A payment receipt has been submitted for your property.",
        data: { payment_id: payment.id, reservation_id: payment.reservation_id },
        critical: true,
      })
      .catch(() => {});
  }

  broadcastAdminActivity("payment_submitted", {
    payment_id: payment.id,
    reservation_id: payment.reservation_id,
  });

  return successResponse(res, "Receipt uploaded successfully", payment);
});

// ─── Admin ─────────────────────────────────────────────────────────

/**
 * GET /api/admin/payments
 * Admin only — list all payments with optional filters.
 */
const getAllPayments = asyncHandler(async (req, res) => {
  const { status, customer_id, owner_id } = req.query;
  const filters = {};
  if (status) filters.status = status;
  if (customer_id) filters.customer_id = parseInt(customer_id);
  if (owner_id) filters.owner_id = parseInt(owner_id);

  const payments = await paymentService.getAllPayments(filters);
  return successResponse(res, "All payments retrieved successfully", payments);
});

/**
 * PATCH /api/owner/payments/:id/verify
 * Owner only — verify payment for own property.
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const paymentId = parseInt(req.params.id, 10);
  if (isNaN(paymentId) || paymentId <= 0) {
    return errorResponse(res, "Invalid payment ID", 400);
  }

  const { errors } = validateVerifyPayment(req.body);
  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  const payment = await paymentService.verifyPayment(req.user.id, paymentId);

  // Notify customer that payment was verified (non-blocking)
  if (notificationService && notificationService.notifyUserSafely) {
    notificationService
      .notifyUserSafely({
        userId: payment.customer_id,
        type: notificationService.NOTIFICATION_TYPES.PAYMENT_VERIFIED,
        title: "Payment verified",
        message: "Your payment has been verified.",
        data: { payment_id: payment.id, reservation_id: payment.reservation_id },
        critical: true,
      })
      .catch(() => {});
  }

  broadcastAdminActivity("payment_verified", {
    payment_id: payment.id,
    reservation_id: payment.reservation_id,
  });

  return successResponse(res, "Payment verified successfully", payment);
});

/**
 * PATCH /api/owner/payments/:id/reject
 * Owner only — reject payment for own property.
 */
const rejectPayment = asyncHandler(async (req, res) => {
  const paymentId = parseInt(req.params.id, 10);
  if (isNaN(paymentId) || paymentId <= 0) {
    return errorResponse(res, "Invalid payment ID", 400);
  }

  const { errors, value } = validateRejectPayment(req.body);
  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  const payment = await paymentService.rejectPayment(
    req.user.id,
    paymentId,
    value.rejection_reason
  );

  // Notify customer that payment was rejected (non-blocking)
  if (notificationService && notificationService.notifyUserSafely) {
    notificationService
      .notifyUserSafely({
        userId: payment.customer_id,
        type: notificationService.NOTIFICATION_TYPES.PAYMENT_REJECTED,
        title: "Payment rejected",
        message: `Your payment was rejected${payment.rejection_reason ? ": " + payment.rejection_reason : "."}`,
        data: { payment_id: payment.id, reservation_id: payment.reservation_id },
        critical: true,
      })
      .catch(() => {});
  }

  broadcastAdminActivity("payment_rejected", {
    payment_id: payment.id,
    reservation_id: payment.reservation_id,
  });

  return successResponse(res, "Payment rejected successfully", payment);
});

/**
 * PATCH /api/owner/payments/:id/refund
 * Owner only — refund payment for own property.
 */
const refundPayment = asyncHandler(async (req, res) => {
  const paymentId = parseInt(req.params.id, 10);
  if (isNaN(paymentId) || paymentId <= 0) {
    return errorResponse(res, "Invalid payment ID", 400);
  }

  const { errors } = validateRefundPayment(req.body);
  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  const payment = await paymentService.refundPayment(req.user.id, paymentId);

  // Notify customer that payment was refunded (non-blocking)
  if (notificationService && notificationService.notifyUserSafely) {
    notificationService
      .notifyUserSafely({
        userId: payment.customer_id,
        type: notificationService.NOTIFICATION_TYPES.PAYMENT_REFUNDED,
        title: "Payment refunded",
        message: "Your payment has been refunded.",
        data: { payment_id: payment.id, reservation_id: payment.reservation_id },
        critical: true,
      })
      .catch(() => {});
  }

  broadcastAdminActivity("payment_refunded", {
    payment_id: payment.id,
    reservation_id: payment.reservation_id,
  });

  return successResponse(res, "Payment refunded successfully", payment);
});

/**
 * GET /api/admin/payments/pending-verification
 * Admin only — list payments waiting for verification.
 */
const getPendingVerificationPayments = asyncHandler(async (_req, res) => {
  const payments = await paymentService.getPaymentsPendingVerification();
  return successResponse(
    res,
    "Pending verification payments retrieved successfully",
    payments
  );
});

/**
 * GET /api/owner/payments/pending-verification
 * Owner only — list payments in `submitted` status for the authenticated owner.
 */
const getOwnerPendingVerificationPayments = asyncHandler(async (req, res) => {
  const payments = await paymentService.getOwnerPaymentsPendingVerification(req.user.id);
  return successResponse(
    res,
    "Owner pending verification payments retrieved successfully",
    payments
  );
});

// ─── Refund Request Endpoints ────────────────────────────────────

/**
 * POST /api/payments/:id/refund-request
 * Customer only — create a refund request for a paid payment.
 */
const createRefundRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, reason } = req.body;

  // Validate input
  const schema = Joi.object({
    amount: Joi.number().positive().required(),
    reason: Joi.string().min(10).max(500).required(),
  });

  const { error, value } = schema.validate({ amount, reason });
  if (error) {
    const err = new Error(error.details[0].message);
    err.statusCode = 400;
    throw err;
  }

  const validatedId = validateId(id);
  const refundRequest = await paymentService.createRefundRequest(
    validatedId,
    req.user.id,
    value.amount,
    value.reason
  );

  return successResponse(res, "Refund request created successfully", refundRequest, 201);
});

/**
 * GET /api/payments/refund-requests/my
 * Customer only — list refund requests for authenticated customer.
 */
const getMyRefundRequests = asyncHandler(async (req, res) => {
  const { limit = 50 } = req.query;

  const validatedLimit = Math.min(parseInt(limit) || 50, 100);

  const refundRequests = await paymentService.getMyRefundRequests(
    req.user.id,
    validatedLimit
  );

  return successResponse(res, "Refund requests retrieved successfully", refundRequests);
});

/**
 * GET /api/owner/refund-requests
 * Owner only — list refund requests for own properties.
 */
const getOwnerRefundRequestById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const validatedId = validateId(id);
  const refundRequest = await paymentService.getOwnerRefundRequestById(
    req.user.id,
    validatedId
  );

  return successResponse(res, "Refund request retrieved successfully", refundRequest);
});

const getOwnerRefundRequests = asyncHandler(async (req, res) => {
  const { limit = 50 } = req.query;

  const validatedLimit = Math.min(parseInt(limit) || 50, 100);

  const refundRequests = await paymentService.getOwnerRefundRequests(
    req.user.id,
    validatedLimit
  );

  return successResponse(res, "Refund requests retrieved successfully", refundRequests);
});

/**
 * GET /api/owner/refund-requests/pending
 * Owner only — list pending refund requests for own properties.
 */
const getOwnerPendingRefundRequests = asyncHandler(async (req, res) => {
  const { limit = 50 } = req.query;

  const validatedLimit = Math.min(parseInt(limit) || 50, 100);

  const refundRequests = await paymentService.getOwnerPendingRefundRequests(
    req.user.id,
    validatedLimit
  );

  return successResponse(
    res,
    "Pending refund requests retrieved successfully",
    refundRequests
  );
});

/**
 * PATCH /api/owner/refund-requests/:id/approve
 * Owner only — approve a refund request for own property.
 */
const approveOwnerRefundRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const validatedId = validateId(id);
  const refundRequest = await paymentService.approveOwnerRefundRequest(
    req.user.id,
    validatedId
  );

  return successResponse(res, "Refund request approved successfully", refundRequest);
});

/**
 * PATCH /api/owner/refund-requests/:id/reject
 * Owner only — reject a refund request for own property.
 */
const rejectOwnerRefundRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { decision_note } = req.body;

  const schema = Joi.object({
    decision_note: Joi.string().max(500).optional(),
  });

  const { error, value } = schema.validate({ decision_note });
  if (error) {
    const err = new Error(error.details[0].message);
    err.statusCode = 400;
    throw err;
  }

  const validatedId = validateId(id);
  const refundRequest = await paymentService.rejectOwnerRefundRequest(
    req.user.id,
    validatedId,
    value.decision_note || ""
  );

  return successResponse(res, "Refund request rejected successfully", refundRequest);
});

module.exports = {
  createPayment,
  getMyPayments,
  getReservationOwnerPaymentAccounts,
  getOwnerPaymentAccounts,
  createOwnerPaymentAccount,
  updateOwnerPaymentAccount,
  deactivateOwnerPaymentAccount,
  deleteOwnerPaymentAccount,
  activateOwnerPaymentAccount,
  getPropertyPaymentAccounts,
  getAdminOwnerPaymentAccounts,
  getAdminOwnerPaymentAccountById,
  getOwnerPayments,
  getPaymentById,
  getPaymentProof,
  uploadReceipt,
  getAllPayments,
  verifyPayment,
  rejectPayment,
  refundPayment,
  getPendingVerificationPayments,
  getOwnerPendingVerificationPayments,
  createRefundRequest,
  getMyRefundRequests,
  getOwnerRefundRequestById,
  getOwnerRefundRequests,
  getOwnerPendingRefundRequests,
  approveOwnerRefundRequest,
  rejectOwnerRefundRequest,
};
