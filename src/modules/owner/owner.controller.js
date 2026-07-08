const reservationService = require("../reservations/reservation.service");
const { successResponse } = require("../../utils/apiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const calendarService = require("../calendar/calendar.service");

/**
 * Get owner dashboard data
 * @route GET /api/owner/dashboard
 * @access Owner only
 */
const getDashboard = asyncHandler(async (req, res) => {
  // Get dashboard statistics
  const reservations = await reservationService.getOwnerReservations(req.user.id);

  const stats = {
    total_reservations: reservations.length,
    pending_reservations: reservations.filter((r) => r.reservation_status === "pending")
      .length,
    confirmed_reservations: reservations.filter(
      (r) => r.reservation_status === "confirmed"
    ).length,
    completed_reservations: reservations.filter(
      (r) => r.reservation_status === "completed"
    ).length,
    cancelled_reservations: reservations.filter(
      (r) => r.reservation_status === "cancelled"
    ).length,
  };

  return successResponse(res, "Owner dashboard data retrieved", stats);
});

/**
 * Get owner's properties
 * @route GET /api/owner/properties
 * @access Owner only
 */
const getProperties = asyncHandler(async (req, res) => {
  const propertyService = require("../properties/property.service");
  const result = await propertyService.getMyProperty(req.user.id, req.query);
  return res.status(result.status).json(result);
});

/**
 * Get owner's reservations (USING REAL SERVICE)
 * @route GET /api/owner/reservations
 * @access Owner only
 * @query status - Filter by reservation status
 * @query property_id - Filter by property ID
 */
const getReservations = asyncHandler(async (req, res) => {
  // console.log(req.user.id);

  const { status, property_id } = req.query;
  const filters = {};

  // Apply filters if provided
  if (status) filters.status = status;
  if (property_id) filters.property_id = parseInt(property_id);

  // Get real reservations from service
  const reservations = await reservationService.getOwnerReservations(
    req.user.id,
    filters
  );

  return successResponse(res, "Owner reservations retrieved successfully", reservations);
});

/**
 * Get owner's payments
 * @route GET /api/owner/payments
 * @access Owner only
 */
const getPayments = asyncHandler(async (req, res) => {
  const paymentService = require("../payments/payment.service");
  const payments = await paymentService.getOwnerPayments(req.user.id, req.query);
  return successResponse(res, "Owner payments retrieved successfully", payments);
});

/**
 * Get owner's reviews
 * @route GET /api/owner/reviews
 * @access Owner only
 */
const getReviews = asyncHandler(async (req, res) => {
  const reviewService = require("../reviews/review.service");
  const reviews = await reviewService.getOwnerReviews(req.user.id);
  return successResponse(res, "Owner reviews retrieved successfully", reviews);
});

const getPropertyCalendar = asyncHandler(async (req, res) => {
  const result = await calendarService.getPropertyCalendar(
    req.params.propertyId,
    req.query.start_date,
    req.query.end_date
  );

  return res.status(result.status).json(result);
});

const getRoomCalendar = asyncHandler(async (req, res) => {
  const result = await calendarService.getRoomCalendar(
    req.params.roomId,
    req.query.start_date,
    req.query.end_date
  );

  return res.status(result.status).json(result);
});

const getOwnerPropertyCalendar = asyncHandler(async (req, res) => {
  const result = await calendarService.getOwnerPropertyCalendar(
    req.params.propertyId,
    req.user.id,
    req.query.start_date,
    req.query.end_date
  );

  return res.status(result.status).json(result);
});

const getOwnerRoomCalendar = asyncHandler(async (req, res) => {
  const result = await calendarService.getOwnerRoomCalendar(
    req.params.roomId,
    req.user.id,
    req.query.start_date,
    req.query.end_date
  );

  return res.status(result.status).json(result);
});

/**
 * Block a single calendar day for a room (maintenance / manual hold).
 * @route POST /api/owner/rooms/:roomId/availability-blocks
 * @access Owner only
 */
const createRoomAvailabilityBlock = asyncHandler(async (req, res) => {
  const { date, reason } = req.body;
  const result = await calendarService.createRoomBlock(
    req.params.roomId,
    req.user.id,
    date,
    reason
  );

  return res.status(result.status).json(result);
});

/**
 * Remove a blocked day for a room.
 * @route DELETE /api/owner/rooms/:roomId/availability-blocks/:date
 * @access Owner only
 */
const deleteRoomAvailabilityBlock = asyncHandler(async (req, res) => {
  const result = await calendarService.removeRoomBlock(
    req.params.roomId,
    req.user.id,
    req.params.date
  );

  return res.status(result.status).json(result);
});

/**
 * Deactivate (suspend) a property
 * @route PATCH /api/owner/properties/:id/deactivate
 * @access Owner only
 */
const deactivateProperty = asyncHandler(async (req, res) => {
  const propertyModel = require("../properties/property.model");
  const property = await propertyModel.findPropertyById(req.params.id);

  if (!property) {
    const { errorResponse } = require("../../utils/apiResponse");
    return errorResponse(res, "Property not found", 404);
  }

  // Verify ownership
  if (Number(property.owner_id) !== Number(req.user.id)) {
    const { errorResponse } = require("../../utils/apiResponse");
    return errorResponse(res, "You can only manage your own properties", 403);
  }

  // Only approved (2) properties can be deactivated
  if (Number(property.status_id) !== 2) {
    const { errorResponse } = require("../../utils/apiResponse");
    return errorResponse(res, "Only approved properties can be deactivated", 400);
  }

  // Set to suspended (4)
  await propertyModel.updateStatus(null, property.id, {
    status_id: 4,
    rejection_reason: null,
    approved_at: property.approved_at,
  });

  const updated = await propertyModel.getUpdatePropertyById(property.id);

  return successResponse(res, "Property deactivated successfully", updated[0]);
});

/**
 * Activate (re-enable) a property
 * @route PATCH /api/owner/properties/:id/activate
 * @access Owner only
 */
const activateProperty = asyncHandler(async (req, res) => {
  const propertyModel = require("../properties/property.model");
  const property = await propertyModel.findPropertyById(req.params.id);

  if (!property) {
    const { errorResponse } = require("../../utils/apiResponse");
    return errorResponse(res, "Property not found", 404);
  }

  // Verify ownership
  if (Number(property.owner_id) !== Number(req.user.id)) {
    const { errorResponse } = require("../../utils/apiResponse");
    return errorResponse(res, "You can only manage your own properties", 403);
  }

  // Only suspended (4) properties can be reactivated
  if (Number(property.status_id) !== 4) {
    const { errorResponse } = require("../../utils/apiResponse");
    return errorResponse(res, "Only suspended properties can be reactivated", 400);
  }

  // Set back to approved (2)
  await propertyModel.updateStatus(null, property.id, {
    status_id: 2,
    rejection_reason: null,
    approved_at: property.approved_at,
  });

  const updated = await propertyModel.getUpdatePropertyById(property.id);

  return successResponse(res, "Property activated successfully", updated[0]);
});

module.exports = {
  getDashboard,
  getProperties,
  getReservations,
  getPayments,
  getReviews,

  getOwnerPropertyCalendar,
  getOwnerRoomCalendar,
  createRoomAvailabilityBlock,
  deleteRoomAvailabilityBlock,
  deactivateProperty,
  activateProperty,
};
