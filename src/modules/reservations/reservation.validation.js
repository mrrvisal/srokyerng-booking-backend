// src/modules/reservations/reservation.validation.js
const Joi = require("joi");
const { RESERVATION_STATUS } = require("../../constants/reservation");

const createReservationSchema = Joi.object({
  room_id: Joi.number().integer().positive().required(),
  check_in_date: Joi.date().iso().min(new Date().toISOString().split("T")[0]).required(),
  check_out_date: Joi.date().iso().greater(Joi.ref("check_in_date")).required(),
  total_guests: Joi.number().integer().min(1).max(20).required(),
  special_request: Joi.string().max(1000).optional().allow("", null),
});

const validateCreateReservation = (data) => {
  const { error, value } = createReservationSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((detail) => detail.message);
    return { errors, value: null };
  }

  return { errors: null, value };
};

const validateStatusUpdate = (status) => {
  const allowedStatuses = Object.values(RESERVATION_STATUS);
  if (!allowedStatuses.includes(status)) {
    return { error: `Invalid status. Allowed values: ${allowedStatuses.join(", ")}` };
  }
  return { error: null };
};

const validateCancelReservation = (reservation, currentUserRole) => {
  const errors = [];

  // Check if reservation is already cancelled or completed
  if (reservation.reservation_status === RESERVATION_STATUS.CANCELLED) {
    errors.push("Reservation is already cancelled");
  }

  if (reservation.reservation_status === RESERVATION_STATUS.COMPLETED) {
    errors.push("Completed reservations cannot be cancelled");
  }

  // Check if check-in date is in the past
  const checkInDate = new Date(reservation.check_in_date);
  const now = new Date();

  if (currentUserRole === "customer" && checkInDate <= now) {
    errors.push("Cannot cancel reservation after check-in date has passed");
  }

  // Check if status allows cancellation
  const cancellableStatuses = ["pending", "confirmed"];
  if (!cancellableStatuses.includes(reservation.reservation_status)) {
    errors.push(
      `Cannot cancel reservation with status: ${reservation.reservation_status}`
    );
  }

  return errors;
};

const normalizeReservationData = (data) => {
  return {
    ...data,
    check_in_date: data.check_in_date
      ? new Date(data.check_in_date).toISOString().split("T")[0]
      : null,
    check_out_date: data.check_out_date
      ? new Date(data.check_out_date).toISOString().split("T")[0]
      : null,
    special_request: data.special_request || null,
  };
};

const validateId = (id) => {
  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId) || parsedId <= 0) {
    throw new Error("Invalid ID parameter");
  }
  return parsedId;
};

const validateStatusFilter = (status) => {
  const allowedStatuses = Object.values(RESERVATION_STATUS);
  if (status && !allowedStatuses.includes(status)) {
    return `Invalid status filter. Allowed: ${allowedStatuses.join(", ")}`;
  }
  return null;
};

const validateCancellationReason = (reason) => {
  if (reason === undefined || reason === null || reason === "") {
    return { error: null };
  }
  if (typeof reason !== "string") {
    return { error: "Cancellation reason must be a string" };
  }
  if (reason.trim().length > 500) {
    return { error: "Cancellation reason cannot exceed 500 characters" };
  }
  return { error: null };
};

const validateAvailabilityQuery = (query) => {
  const { room_id, check_in_date, check_out_date } = query;

  if (!room_id || !check_in_date || !check_out_date) {
    return { error: "room_id, check_in_date, check_out_date are required" };
  }

  const roomId = parseInt(room_id, 10);
  if (isNaN(roomId) || roomId <= 0) {
    return { error: "Invalid ID parameter" };
  }

  const checkIn = new Date(check_in_date);
  const checkOut = new Date(check_out_date);

  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
    return { error: "Invalid date format" };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (checkIn < now) {
    return { error: "Check-in date cannot be in the past" };
  }

  if (checkOut <= checkIn) {
    return { error: "Check-out date must be after check-in date" };
  }

  return { error: null, value: { roomId, check_in_date, check_out_date } };
};

module.exports = {
  validateCreateReservation,
  validateStatusUpdate,
  validateCancelReservation,
  validateCancellationReason,
  normalizeReservationData,
  validateId,
  validateStatusFilter,
  validateAvailabilityQuery,
};
