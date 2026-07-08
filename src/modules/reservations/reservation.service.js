// src/modules/reservations/reservation.service.js
const reservationModel = require("./reservation.model");
const {
  RESERVATION_STATUS,
  CUSTOMER_CANCELLABLE_STATUSES,
} = require("../../constants/reservation");
const { validateCreateReservation } = require("./reservation.validation");

const calculateTotalNights = (checkInDate, checkOutDate) => {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  if (checkOut <= checkIn) {
    throw new Error("Check-out date must be after check-in date");
  }

  const diffTime = checkOut - checkIn;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const calculateTotalAmount = (pricePerNight, totalNights) => {
  return pricePerNight * totalNights;
};

const createReservation = async (customerId, reservationData) => {
  const { errors, value } = validateCreateReservation(reservationData);
  if (errors && errors.length > 0) {
    const error = new Error(errors.join(", "));
    error.statusCode = 400;
    throw error;
  }

  const { room_id, check_in_date, check_out_date, total_guests, special_request } = value;

  // Find room with property details
  const room = await reservationModel.findRoomById(room_id);

  if (!room) {
    const error = new Error("Room not found");
    error.statusCode = 404;
    throw error;
  }

  // Check if property is approved
  const approvedStatus = await reservationModel.findPropertyStatusByName("approved");
  if (room.property_status_id !== approvedStatus?.id) {
    const error = new Error("Room is not available for booking (property not approved)");
    error.statusCode = 400;
    throw error;
  }

  // Check guest capacity
  if (total_guests > room.max_guests) {
    const error = new Error(`Room can accommodate maximum ${room.max_guests} guests`);
    error.statusCode = 400;
    throw error;
  }

  // Calculate nights and amount
  const totalNights = calculateTotalNights(check_in_date, check_out_date);
  const totalAmount = calculateTotalAmount(room.price_per_night, totalNights);

  // Check availability
  const availability = await reservationModel.checkAvailability(
    room_id,
    check_in_date,
    check_out_date
  );

  if (!availability.isAvailable) {
    const error = new Error(
      availability.isBlocked
        ? "This room is unavailable for the selected dates."
        : `Room is not available. Only ${availability.availableRooms} of ${availability.totalRooms} rooms available`
    );
    error.statusCode = 409;
    throw error;
  }

  // Create reservation with transaction and row lock to prevent race conditions
  const lockResult = await reservationModel.createReservationWithLock({
    customer_id: customerId,
    room_id,
    check_in_date,
    check_out_date,
    total_guests,
    total_nights: totalNights,
    total_amount: totalAmount,
    reservation_status: RESERVATION_STATUS.PENDING,
    special_request,
  });

  if (!lockResult.success) {
    const error = new Error(
      lockResult.error || "Room became unavailable during booking process. Please try again."
    );
    error.statusCode = 409;
    throw error;
  }

  const reservation = await reservationModel.findReservationById(lockResult.id);

  return reservation;
};

const getCustomerReservations = async (customerId, filters = {}) => {
  const reservations = await reservationModel.findReservationsByCustomer(
    customerId,
    filters
  );
  return reservations;
};

const getReservationById = async (
  reservationId,
  requestingUserId,
  requestingUserRole
) => {
  const reservation = await reservationModel.findReservationById(reservationId);

  if (!reservation) {
    const error = new Error("Reservation not found");
    error.statusCode = 404;
    throw error;
  }

  // Check access permissions
  const hasAccess =
    requestingUserRole === "admin" ||
    reservation.customer_id === requestingUserId ||
    (requestingUserRole === "owner" && reservation.owner_id === requestingUserId);

  if (!hasAccess) {
    const error = new Error("You don't have permission to view this reservation");
    error.statusCode = 403;
    throw error;
  }

  return reservation;
};

const getOwnerReservations = async (ownerId, filters = {}) => {
  const reservations = await reservationModel.findReservationsByOwner(ownerId, filters);
  return reservations;
};

const getAllReservations = async (filters = {}) => {
  const reservations = await reservationModel.findAllReservations(filters);
  return reservations;
};

const cancelReservation = async (
  reservationId,
  customerId,
  cancellationReason = null
) => {
  const reservation = await reservationModel.findReservationById(reservationId);

  if (!reservation) {
    const error = new Error("Reservation not found");
    error.statusCode = 404;
    throw error;
  }

  // Verify customer owns this reservation
  if (reservation.customer_id !== customerId) {
    const error = new Error("You can only cancel your own reservations");
    error.statusCode = 403;
    throw error;
  }

  // Use the cancellation policy to check eligibility
  const { checkCancellationEligibility, checkRefundEligibility } = require("./cancellation-policy");
  const eligibility = checkCancellationEligibility(reservation);

  if (!eligibility.can_cancel) {
    const error = new Error(eligibility.reasons.join(". "));
    error.statusCode = 400;
    throw error;
  }

  // Update reservation status
  await reservationModel.updateReservationStatus(
    reservationId,
    RESERVATION_STATUS.CANCELLED,
    cancellationReason || "Cancelled by customer"
  );

  const updatedReservation = await reservationModel.findReservationById(reservationId);

  // Auto-create refund request if there is a paid payment
  let refund_info = null;
  try {
    const paymentModel = require("../payments/payment.model");
    const refundRequestModel = require("../payments/refund-request.model");
    const payment = await paymentModel.findPaymentByReservationId(reservationId);

    if (payment && payment.status_name === "paid") {
      // Calculate refund amount based on policy
      const refundEligibility = checkRefundEligibility(payment, updatedReservation);

      if (refundEligibility.eligible && refundEligibility.refund_amount > 0) {
        // Check no existing pending refund request
        const existingRefunds = await refundRequestModel.findRefundRequestsByPaymentId(payment.id);
        const hasPending = existingRefunds.some((r) => r.refund_status === "requested");

        if (!hasPending) {
          const refundReason = eligibility.is_late_cancellation
            ? `Late cancellation (50% refund) — ${cancellationReason || "Cancelled by customer"}`
            : `Cancellation (full refund) — ${cancellationReason || "Cancelled by customer"}`;

          const insertId = await refundRequestModel.createRefundRequest(
            payment.id,
            customerId,
            refundEligibility.refund_amount,
            refundReason
          );

          const refundRequest = await refundRequestModel.findRefundRequestById(insertId);
          refund_info = {
            refund_request_id: refundRequest.id,
            payment_id: payment.id,
            refund_amount: refundEligibility.refund_amount,
            refund_percentage: refundEligibility.refund_percentage,
            refund_reason: refundEligibility.reason,
            refund_status: refundRequest.refund_status,
          };
        }
      }
    }
  } catch (refundError) {
    // Don't fail the cancellation if refund creation fails
    console.error("Auto-refund creation error:", refundError.message);
  }

  // Attach refund info to the response
  updatedReservation.refund_info = refund_info;

  return updatedReservation;
};

const ownerUpdateReservationStatus = async (reservationId, status, ownerId, reason = null) => {
  const reservation = await reservationModel.findReservationById(reservationId);

  if (!reservation) {
    const error = new Error("Reservation not found");
    error.statusCode = 404;
    throw error;
  }

  // Verify ownership
  if (Number(reservation.owner_id) !== Number(ownerId)) {
    const error = new Error("Forbidden: You do not own this property");
    error.statusCode = 403;
    throw error;
  }

  // Validate status transition
  const currentStatus = reservation.reservation_status;

  if (
    currentStatus === RESERVATION_STATUS.CANCELLED &&
    status !== RESERVATION_STATUS.CANCELLED
  ) {
    const error = new Error("Cannot change status of cancelled reservation");
    error.statusCode = 400;
    throw error;
  }

  if (
    currentStatus === RESERVATION_STATUS.COMPLETED &&
    status !== RESERVATION_STATUS.COMPLETED
  ) {
    const error = new Error("Cannot change status of completed reservation");
    error.statusCode = 400;
    throw error;
  }

  // Update status
  await reservationModel.updateReservationStatus(reservationId, status, reason);

  const updatedReservation = await reservationModel.findReservationById(reservationId);

  // Auto-create a full refund request if the owner cancelled a paid reservation.
  // Unlike a customer-initiated cancellation, the owner caused this — so no
  // late-cancellation penalty applies; the customer is always owed 100%.
  let refund_info = null;
  if (status === RESERVATION_STATUS.CANCELLED) {
    try {
      const paymentModel = require("../payments/payment.model");
      const refundRequestModel = require("../payments/refund-request.model");
      const payment = await paymentModel.findPaymentByReservationId(reservationId);

      if (payment && payment.status_name === "paid") {
        const existingRefunds = await refundRequestModel.findRefundRequestsByPaymentId(payment.id);
        const hasPending = existingRefunds.some((r) => r.refund_status === "requested");

        if (!hasPending) {
          const refundAmount = parseFloat(payment.amount);
          const refundReason = `Cancelled by property owner (full refund)${reason ? ` — ${reason}` : ""}`;

          const insertId = await refundRequestModel.createRefundRequest(
            payment.id,
            updatedReservation.customer_id,
            refundAmount,
            refundReason
          );

          const refundRequest = await refundRequestModel.findRefundRequestById(insertId);
          refund_info = {
            refund_request_id: refundRequest.id,
            payment_id: payment.id,
            refund_amount: refundAmount,
            refund_percentage: 100,
            refund_reason: refundReason,
            refund_status: refundRequest.refund_status,
          };
        }
      }
    } catch (refundError) {
      // Don't fail the status update if refund creation fails
      console.error("Owner-cancel auto-refund creation error:", refundError.message);
    }
  }

  updatedReservation.refund_info = refund_info;

  return updatedReservation;
};

const checkAvailability = async (roomId, checkInDate, checkOutDate) => {
  const room = await reservationModel.findRoomById(roomId);

  if (!room) {
    const error = new Error("Room not found");
    error.statusCode = 404;
    throw error;
  }

  const availability = await reservationModel.checkAvailability(
    roomId,
    checkInDate,
    checkOutDate
  );

  return availability;
};

const getCancellationPolicy = async (
  reservationId,
  requestingUserId,
  requestingUserRole
) => {
  const reservation = await reservationModel.findReservationById(reservationId);

  if (!reservation) {
    const error = new Error("Reservation not found");
    error.statusCode = 404;
    throw error;
  }

  const hasAccess =
    requestingUserRole === "admin" ||
    reservation.customer_id === requestingUserId ||
    (requestingUserRole === "owner" && reservation.owner_id === requestingUserId);

  if (!hasAccess) {
    const error = new Error("You don't have permission to view this reservation");
    error.statusCode = 403;
    throw error;
  }

  const cancellationPolicyModule = require("./cancellation-policy");
  return cancellationPolicyModule.getCancellationPolicy(reservation);
};

module.exports = {
  calculateTotalNights,
  calculateTotalAmount,
  createReservation,
  getCustomerReservations,
  getReservationById,
  getOwnerReservations,
  getAllReservations,
  cancelReservation,
  getCancellationPolicy,
  ownerUpdateReservationStatus,
  checkAvailability,
};
