module.exports = {
  RESERVATION_STATUS: {
    PENDING: "pending",
    CONFIRMED: "confirmed",
    CANCELLED: "cancelled",
    COMPLETED: "completed",
  },

  ALLOWED_CANCELLATION_STATUSES: ["pending", "confirmed"],

  // Customer can only cancel if status is in these
  CUSTOMER_CANCELLABLE_STATUSES: ["pending", "confirmed"],

  // Admin can update to any status except cancelled/completed maybe
  ADMIN_UPDATABLE_STATUSES: ["pending", "confirmed", "cancelled", "completed"],

  // After check-in date passed, cannot cancel
  CANCELLATION_DEADLINE_HOURS: 24, // hours before check-in

  // Auto-expire pending reservations after this many hours
  PENDING_EXPIRY_HOURS: 48,
};
