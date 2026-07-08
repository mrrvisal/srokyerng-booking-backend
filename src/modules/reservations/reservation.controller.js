// src/modules/reservations/reservation.controller.js
const reservationService = require("./reservation.service");
const { successResponse, errorResponse } = require("../../utils/apiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const notificationService = require("../notifications/notification.service");
const { getIO } = require("../../services/socket.registry");
const { validateAvailabilityQuery } = require("./reservation.validation");
const {
  validateCreateReservation,
  normalizeReservationData,
  validateStatusUpdate,
  validateCancellationReason,
  validateId,
  validateStatusFilter,
} = require("./reservation.validation");

const broadcastAdminActivity = (type, data) => {
  try {
    getIO()?.to("admins").emit("admin:activity", { type, data });
  } catch (error) {
    console.error("Admin activity emit failed:", error);
  }
};

const createReservation = asyncHandler(async (req, res) => {
  const normalizedData = normalizeReservationData(req.body);
  const { errors, value } = validateCreateReservation(normalizedData);

  if (errors) {
    console.error("VALIDATION FAILED IN CONTROLLER:", errors, "BODY:", req.body, "NORMALIZED:", normalizedData);
    return errorResponse(res, "Validation failed", 400, errors);
  }

  try {
    const reservation = await reservationService.createReservation(req.user.id, value);

    // Notify customer and owner (non-blocking)
    if (notificationService && notificationService.notifyUserSafely) {
      notificationService
        .notifyUserSafely({
          userId: reservation.customer_id,
          type: notificationService.NOTIFICATION_TYPES.RESERVATION_CREATED,
          title: "Reservation created",
          message: "Your reservation has been created.",
          data: { reservation_id: reservation.id },
          critical: true,
        })
        .catch(() => {});

      notificationService
        .notifyUserSafely({
          userId: reservation.owner_id,
          type: notificationService.NOTIFICATION_TYPES.RESERVATION_CREATED,
          title: "New Reservation Received",
          message: `You have received a new reservation for ${reservation.room_name}.`,
          data: { reservation_id: reservation.id },
          critical: true,
        })
        .catch(() => {});
    }

    broadcastAdminActivity("reservation_created", { reservation_id: reservation.id });

    return successResponse(res, "Reservation created successfully", reservation, 201);
  } catch (err) {
    console.error("CREATE RESERVATION SERVICE THREW:", err.message, err.statusCode);
    throw err;
  }
});

const getMyReservations = asyncHandler(async (req, res) => {
  const { status } = req.query;

  // Validate status filter
  if (status) {
    const statusError = validateStatusFilter(status);
    if (statusError) {
      return errorResponse(res, statusError, 400);
    }
  }

  const filters = {};

  if (status) filters.status = status;

  const reservations = await reservationService.getCustomerReservations(
    req.user.id,
    filters
  );

  return successResponse(res, "Your reservations retrieved successfully", reservations);
});

const getReservationById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get user role for permission checking
  const userRole = req.user.role;
  const validatedId = validateId(id);

  const reservation = await reservationService.getReservationById(
    validatedId,
    req.user.id,
    userRole
  );

  return successResponse(res, "Reservation retrieved successfully", reservation);
});

const cancelReservation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { cancellation_reason } = req.body;

  const reasonValidation = validateCancellationReason(cancellation_reason);
  if (reasonValidation.error) {
    return errorResponse(res, reasonValidation.error, 400);
  }

  const validatedId = validateId(id);

  const reservation = await reservationService.cancelReservation(
    validatedId,
    req.user.id,
    cancellation_reason
  );

  // Notify customer and owner (non-blocking)
  if (notificationService && notificationService.notifyUserSafely) {
    notificationService
      .notifyUserSafely({
        userId: reservation.customer_id,
        type: notificationService.NOTIFICATION_TYPES.RESERVATION_CANCELLED,
        title: "Reservation cancelled",
        message: "Your reservation has been cancelled.",
        data: { reservation_id: reservation.id },
        critical: false,
      })
      .catch(() => {});

    notificationService
      .notifyUserSafely({
        userId: reservation.owner_id,
        type: notificationService.NOTIFICATION_TYPES.RESERVATION_CANCELLED,
        title: "Reservation Cancelled",
        message: `A reservation for ${reservation.room_name} was cancelled by the customer.`,
        data: { reservation_id: reservation.id },
        critical: true,
      })
      .catch(() => {});
  }

  broadcastAdminActivity("reservation_cancelled", { reservation_id: reservation.id });

  return successResponse(res, "Reservation cancelled successfully", reservation);
});

// Owner endpoints
const getOwnerReservations = asyncHandler(async (req, res) => {
  const { status, property_id } = req.query;

  if (status) {
    const statusError = validateStatusFilter(status);
    if (statusError) {
      return errorResponse(res, statusError, 400);
    }
  }

  const filters = {};

  if (status) filters.status = status;
  if (property_id) filters.property_id = parseInt(property_id);

  const reservations = await reservationService.getOwnerReservations(
    req.user.id,
    filters
  );

  return successResponse(res, "Owner reservations retrieved successfully", reservations);
});

// Admin endpoints
const getAdminReservations = asyncHandler(async (req, res) => {
  const { status, property_id, owner_id } = req.query;

  if (status) {
    const statusError = validateStatusFilter(status);
    if (statusError) {
      return errorResponse(res, statusError, 400);
    }
  }

  const filters = {};

  if (status) filters.status = status;
  if (property_id) filters.property_id = parseInt(property_id);
  if (owner_id) filters.owner_id = parseInt(owner_id);

  const reservations = await reservationService.getAllReservations(filters);

  return successResponse(res, "All reservations retrieved successfully", reservations);
});

const ownerUpdateReservationStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  const validation = validateStatusUpdate(status);
  if (validation.error) {
    return errorResponse(res, validation.error, 400);
  }

  const reservation = await reservationService.ownerUpdateReservationStatus(
    parseInt(id),
    status,
    req.user.id,
    reason
  );

  // Notify customer on important status changes (non-blocking)
  if (notificationService && notificationService.notifyUserSafely) {
    if (status === "confirmed") {
      notificationService
        .notifyUserSafely({
          userId: reservation.customer_id,
          type: notificationService.NOTIFICATION_TYPES.RESERVATION_CONFIRMED,
          title: "Reservation confirmed",
          message: "Your reservation has been confirmed by the property owner.",
          data: { reservation_id: reservation.id },
          critical: true,
        })
        .catch(() => {});
    } else if (status === "cancelled") {
      notificationService
        .notifyUserSafely({
          userId: reservation.customer_id,
          type: notificationService.NOTIFICATION_TYPES.RESERVATION_CANCELLED,
          title: "Reservation cancelled",
          message: "Your reservation has been cancelled by the property owner.",
          data: { reservation_id: reservation.id },
          critical: true,
        })
        .catch(() => {});
    }
  }

  if (status === "confirmed" || status === "cancelled") {
    broadcastAdminActivity(
      status === "confirmed" ? "reservation_confirmed" : "reservation_cancelled",
      { reservation_id: reservation.id },
    );
  }

  return successResponse(res, "Reservation status updated successfully", reservation);
});

const checkAvailability = asyncHandler(async (req, res) => {
  const { error, value } = validateAvailabilityQuery(req.query);

  if (error) {
    return errorResponse(res, error, 400);
  }

  const availability = await reservationService.checkAvailability(
    value.roomId,
    value.check_in_date,
    value.check_out_date
  );

  return successResponse(res, "Availability checked", availability);
});

const requestRefundByReservation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const Joi = require("joi");
  const schema = Joi.object({
    reason: Joi.string().min(10).max(500).required(),
  });

  const { error, value } = schema.validate({ reason });
  if (error) {
    const err = new Error(error.details[0].message);
    err.statusCode = 400;
    throw err;
  }

  const validatedId = validateId(id);

  // Look up reservation and payment to auto-calculate refund amount
  const reservation = await reservationService.getReservationById(validatedId, req.user.id, req.user.role);
  const paymentModel = require("../payments/payment.model");
  const payment = await paymentModel.findPaymentByReservationId(validatedId);

  if (!payment) {
    const err = new Error("No payment found for this reservation");
    err.statusCode = 404;
    throw err;
  }

  // Auto-calculate refund amount from cancellation policy
  const { checkRefundEligibility } = require("./cancellation-policy");
  const refundEligibility = checkRefundEligibility(payment, reservation);

  if (!refundEligibility.eligible) {
    const err = new Error(refundEligibility.reason);
    err.statusCode = 400;
    throw err;
  }

  const paymentService = require("../payments/payment.service");
  const refundRequest = await paymentService.createRefundRequestByReservation(
    validatedId,
    req.user.id,
    refundEligibility.refund_amount,
    value.reason
  );

  // Include the calculated refund info in the response
  refundRequest.refund_percentage = refundEligibility.refund_percentage;
  refundRequest.refund_reason = refundEligibility.reason;

  return successResponse(res, "Refund request created successfully", refundRequest, 201);
});

const getCancellationPolicy = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const validatedId = validateId(id);

  const policy = await reservationService.getCancellationPolicy(
    validatedId,
    req.user.id,
    req.user.role
  );

  return successResponse(res, "Cancellation policy retrieved successfully", policy);
});

module.exports = {
  checkAvailability,
  createReservation,
  getMyReservations,
  getReservationById,
  cancelReservation,
  getCancellationPolicy,
  getOwnerReservations,
  getAdminReservations,
  ownerUpdateReservationStatus,
  requestRefundByReservation,
};
