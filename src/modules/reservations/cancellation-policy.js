const RESERVATION_STATUS = require("../../constants/reservation").RESERVATION_STATUS;
const { CANCELLATION_DEADLINE_HOURS } = require("../../constants/reservation");

/**
 * Cancellation Policy Service
 * Handles calculation and validation of cancellation and refund eligibility
 */

/**
 * Check if a reservation can be cancelled
 * @param {Object} reservation - The reservation record
 * @returns {Object} - { canCancel: boolean, reason: string, deadline: Date }
 */
const checkCancellationEligibility = (reservation) => {
  const result = {
    can_cancel: true,
    reasons: [],
    deadline: null,
    status: reservation.reservation_status,
    refund_percentage: 100,
    is_late_cancellation: false,
  };

  // Already cancelled
  if (reservation.reservation_status === RESERVATION_STATUS.CANCELLED) {
    result.can_cancel = false;
    result.refund_percentage = 0;
    result.reasons.push("Reservation is already cancelled");
    return result;
  }

  // Completed reservations cannot be cancelled
  if (reservation.reservation_status === RESERVATION_STATUS.COMPLETED) {
    result.can_cancel = false;
    result.refund_percentage = 0;
    result.reasons.push("Completed reservations cannot be cancelled");
    return result;
  }

  // Check if check-in date is in the past
  const checkInDate = new Date(reservation.check_in_date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (checkInDate <= now) {
    result.can_cancel = false;
    result.refund_percentage = 0;
    result.reasons.push("Cannot cancel reservation after check-in date has passed");
    result.check_in_date = reservation.check_in_date;
    return result;
  }

  // Check cancellation deadline
  const deadlineTime = new Date(reservation.check_in_date);
  deadlineTime.setHours(0, 0, 0, 0);
  deadlineTime.setHours(deadlineTime.getHours() - CANCELLATION_DEADLINE_HOURS);

  const currentTime = new Date();

  result.deadline = deadlineTime;
  result.hours_until_deadline = Math.round(
    (deadlineTime - currentTime) / (1000 * 60 * 60)
  );

  // After deadline: still allow cancellation but with 50% refund
  if (currentTime > deadlineTime) {
    result.is_late_cancellation = true;
    result.refund_percentage = 50;
    result.reasons.push(
      `Late cancellation — only 50% refund eligible. Deadline was ${deadlineTime.toISOString()}`
    );
  }

  // Check reservation status allows cancellation
  const CUSTOMER_CANCELLABLE_STATUSES =
    require("../../constants/reservation").CUSTOMER_CANCELLABLE_STATUSES;

  if (!CUSTOMER_CANCELLABLE_STATUSES.includes(reservation.reservation_status)) {
    result.can_cancel = false;
    result.refund_percentage = 0;
    result.reasons.push(
      `Cannot cancel reservation with status: ${reservation.reservation_status}`
    );
    return result;
  }

  return result;
};

/**
 * Calculate refund eligibility and amount
 * @param {Object} payment - Payment record
 * @param {Object} reservation - Reservation record
 * @returns {Object} - { eligible: boolean, reason: string, refund_amount: number }
 */
const checkRefundEligibility = (payment, reservation) => {
  const result = {
    eligible: false,
    reason: "",
    refund_amount: 0,
    payment_status: payment.payment_status_id
      ? payment.payment_status_id
      : payment.status_name,
  };

  // Only paid payments can be refunded
  if (payment.status_name !== "paid") {
    result.reason = `Cannot refund payment with status: ${payment.status_name}`;
    return result;
  }

  // Already refunded
  if (payment.status_name === "refunded") {
    result.reason = "Payment has already been refunded";
    return result;
  }

  // Check if reservation is cancelled
  if (reservation.reservation_status !== RESERVATION_STATUS.CANCELLED) {
    result.reason = "Can only refund cancelled reservations";
    return result;
  }

  // Check if cancellation was within deadline (full refund)
  const deadlineTime = new Date(reservation.check_in_date);
  deadlineTime.setHours(0, 0, 0, 0);
  deadlineTime.setHours(deadlineTime.getHours() - CANCELLATION_DEADLINE_HOURS);

  const cancellationDate = new Date(reservation.updated_at);

  if (cancellationDate <= deadlineTime) {
    result.eligible = true;
    result.reason = "Full refund eligible - cancelled before deadline";
    result.refund_amount = parseFloat(payment.amount);
    result.refund_percentage = 100;
  } else {
    // Late cancellation - partial refund (e.g., 50%)
    result.eligible = true;
    result.reason = "Partial refund eligible - cancelled after deadline";
    result.refund_amount = Math.round(parseFloat(payment.amount) * 0.5 * 100) / 100;
    result.refund_percentage = 50;
  }

  return result;
};

/**
 * Get cancellation policy details
 * Returns policy information and eligibility status for a reservation
 */
const getCancellationPolicy = (reservation) => {
  const cancellationEligibility = checkCancellationEligibility(reservation);
  const policy = {
    reservation_id: reservation.id,
    reservation_status: reservation.reservation_status,
    check_in_date: reservation.check_in_date,
    cancellation_deadline_hours: CANCELLATION_DEADLINE_HOURS,
    cancellation_eligibility: cancellationEligibility,
    policy_summary: {
      description:
        "Free cancellation up to 24 hours before check-in for a full refund. " +
        "After that, cancel before check-in for a 50% refund. " +
        "No cancellation after check-in.",
      full_refund_deadline: calculateDeadline(reservation.check_in_date),
      late_cancellation_refund_percentage: 50,
      non_refundable_after: "check-in date",
    },
  };

  return policy;
};

/**
 * Helper to calculate deadline
 */
const calculateDeadline = (checkInDate) => {
  const deadline = new Date(checkInDate);
  deadline.setHours(0, 0, 0, 0);
  deadline.setHours(deadline.getHours() - CANCELLATION_DEADLINE_HOURS);
  return deadline.toISOString();
};

module.exports = {
  checkCancellationEligibility,
  checkRefundEligibility,
  getCancellationPolicy,
};
