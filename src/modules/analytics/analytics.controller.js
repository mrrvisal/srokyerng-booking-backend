const asyncHandler = require("../../utils/asyncHandler");
const { successResponse, errorResponse } = require("../../utils/apiResponse");
const analyticsService = require("./analytics.service");
const { validateDateRange } = require("./analytics.validation");

/**
 * Analytics Controller - Handles admin analytics requests
 */

/**
 * GET /api/admin/analytics/summary
 * Get platform summary statistics
 */
const getSummary = asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;

  // Validate query parameters
  const errors = validateDateRange({ start_date, end_date });
  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  const summary = await analyticsService.getSummary(start_date, end_date);

  return successResponse(res, "Platform summary retrieved successfully", summary, 200);
});

/**
 * GET /api/admin/analytics/users
 * Get user counts by role and status
 */
const getUsers = asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;

  // Validate query parameters
  const errors = validateDateRange({ start_date, end_date });
  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  const analytics = await analyticsService.getUserAnalytics(start_date, end_date);

  return successResponse(res, "User analytics retrieved successfully", analytics, 200);
});

/**
 * GET /api/admin/analytics/properties
 * Get property counts by status
 */
const getProperties = asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;

  // Validate query parameters
  const errors = validateDateRange({ start_date, end_date });
  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  const analytics = await analyticsService.getPropertyAnalytics(start_date, end_date);

  return successResponse(
    res,
    "Property analytics retrieved successfully",
    analytics,
    200
  );
});

/**
 * GET /api/admin/analytics/reservations
 * Get reservation counts by status
 */
const getReservations = asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;

  // Validate query parameters
  const errors = validateDateRange({ start_date, end_date });
  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  const analytics = await analyticsService.getReservationAnalytics(start_date, end_date);

  return successResponse(
    res,
    "Reservation analytics retrieved successfully",
    analytics,
    200
  );
});

/**
 * GET /api/admin/analytics/payments
 * Get payment totals and counts by status
 */
const getPayments = asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;

  // Validate query parameters
  const errors = validateDateRange({ start_date, end_date });
  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  const analytics = await analyticsService.getPaymentAnalytics(start_date, end_date);

  return successResponse(res, "Payment analytics retrieved successfully", analytics, 200);
});

/**
 * GET /api/admin/analytics/reviews
 * Get review count summary
 */
const getReviews = asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;

  // Validate query parameters
  const errors = validateDateRange({ start_date, end_date });
  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  const analytics = await analyticsService.getReviewAnalytics(start_date, end_date);

  return successResponse(res, "Review analytics retrieved successfully", analytics, 200);
});

/**
 * GET /api/admin/analytics/activity
 * Get recent platform activity
 */
const getActivity = asyncHandler(async (req, res) => {
  const { start_date, end_date, limit } = req.query;

  // Validate query parameters
  const errors = validateDateRange({ start_date, end_date });
  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  // Validate limit if provided
  if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
    return errorResponse(res, "Limit must be a number between 1 and 100", 400, [
      "Invalid limit parameter",
    ]);
  }

  const analytics = await analyticsService.getRecentActivity(limit, start_date, end_date);

  return successResponse(res, "Recent activity retrieved successfully", analytics, 200);
});

module.exports = {
  getSummary,
  getUsers,
  getProperties,
  getReservations,
  getPayments,
  getReviews,
  getActivity,
};
