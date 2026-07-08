const asyncHandler = require("../../utils/asyncHandler");
const { successResponse, errorResponse } = require("../../utils/apiResponse");
const analyticsService = require("./analytics.service");
const { validateDateRange } = require("./analytics.validation");

/**
 * Owner Analytics Controller - Handles owner analytics requests
 */

/**
 * GET /api/owner/analytics/summary
 * Get owner dashboard summary
 */
const getSummary = asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  const ownerId = req.user.id;

  // Validate query parameters
  const errors = validateDateRange({ start_date, end_date });
  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  const summary = await analyticsService.getDashboardSummary(
    ownerId,
    start_date,
    end_date
  );

  return successResponse(
    res,
    "Owner dashboard summary retrieved successfully",
    summary,
    200
  );
});

/**
 * GET /api/owner/analytics/reservations
 * Get reservation statistics for owner's properties
 */
const getReservations = asyncHandler(async (req, res) => {
  const { start_date, end_date, property_id } = req.query;
  const ownerId = req.user.id;

  // Validate query parameters
  const errors = validateDateRange({ start_date, end_date });
  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  // Validate property_id if provided
  if (property_id && (isNaN(property_id) || parseInt(property_id) < 1)) {
    return errorResponse(res, "Validation failed", 400, [
      "property_id must be a positive integer",
    ]);
  }

  const analytics = await analyticsService.getReservationAnalytics(
    ownerId,
    start_date,
    end_date,
    property_id ? parseInt(property_id) : null
  );

  return successResponse(
    res,
    "Reservation analytics retrieved successfully",
    analytics,
    200
  );
});

/**
 * GET /api/owner/analytics/revenue
 * Get revenue statistics for owner's properties
 */
const getRevenue = asyncHandler(async (req, res) => {
  const { start_date, end_date, property_id } = req.query;
  const ownerId = req.user.id;

  // Validate query parameters
  const errors = validateDateRange({ start_date, end_date });
  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  // Validate property_id if provided
  if (property_id && (isNaN(property_id) || parseInt(property_id) < 1)) {
    return errorResponse(res, "Validation failed", 400, [
      "property_id must be a positive integer",
    ]);
  }

  const analytics = await analyticsService.getRevenueAnalytics(
    ownerId,
    start_date,
    end_date,
    property_id ? parseInt(property_id) : null
  );

  return successResponse(res, "Revenue analytics retrieved successfully", analytics, 200);
});

/**
 * GET /api/owner/analytics/properties
 * Get top performing properties for owner
 */
const getProperties = asyncHandler(async (req, res) => {
  const { start_date, end_date, property_id, limit } = req.query;
  const ownerId = req.user.id;

  // Validate query parameters
  const errors = validateDateRange({ start_date, end_date });
  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  // Validate property_id if provided
  if (property_id && (isNaN(property_id) || parseInt(property_id) < 1)) {
    return errorResponse(res, "Validation failed", 400, [
      "property_id must be a positive integer",
    ]);
  }

  // Validate limit if provided
  if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 50)) {
    return errorResponse(res, "Limit must be a number between 1 and 50", 400, [
      "Invalid limit parameter",
    ]);
  }

  const analytics = await analyticsService.getTopProperties(
    ownerId,
    limit,
    start_date,
    end_date,
    property_id ? parseInt(property_id) : null
  );

  return successResponse(res, "Top properties retrieved successfully", analytics, 200);
});

/**
 * GET /api/owner/analytics/rooms
 * Get top performing rooms for owner
 */
const getRooms = asyncHandler(async (req, res) => {
  const { start_date, end_date, property_id, limit } = req.query;
  const ownerId = req.user.id;

  // Validate query parameters
  const errors = validateDateRange({ start_date, end_date });
  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  // Validate property_id if provided
  if (property_id && (isNaN(property_id) || parseInt(property_id) < 1)) {
    return errorResponse(res, "Validation failed", 400, [
      "property_id must be a positive integer",
    ]);
  }

  // Validate limit if provided
  if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 50)) {
    return errorResponse(res, "Limit must be a number between 1 and 50", 400, [
      "Invalid limit parameter",
    ]);
  }

  const analytics = await analyticsService.getTopRooms(
    ownerId,
    limit,
    start_date,
    end_date,
    property_id ? parseInt(property_id) : null
  );

  return successResponse(res, "Top rooms retrieved successfully", analytics, 200);
});

module.exports = {
  getSummary,
  getReservations,
  getRevenue,
  getProperties,
  getRooms,
};
