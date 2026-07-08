const analyticsModel = require("./analytics.model");

/**
 * Analytics Service - Business logic for admin analytics
 */

/**
 * Get platform summary statistics
 */
const getSummary = async (startDate, endDate) => {
  // Validate date range if provided
  if (startDate || endDate) {
    if (!startDate || !endDate) {
      const error = new Error("Both start_date and end_date must be provided together");
      error.statusCode = 400;
      throw error;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      const error = new Error("Invalid date format. Use YYYY-MM-DD");
      error.statusCode = 400;
      throw error;
    }

    if (start > end) {
      const error = new Error("start_date must be before end_date");
      error.statusCode = 400;
      throw error;
    }
  }

  const summary = await analyticsModel.getPlatformSummary(startDate, endDate);

  return {
    platform_summary: {
      total_customers: summary.total_customers || 0,
      total_owners: summary.total_owners || 0,
      total_properties: summary.total_properties || 0,
      total_reservations: summary.total_reservations || 0,
      paid_payments: summary.paid_payments || 0,
      total_reviews: summary.total_reviews || 0,
      total_revenue: parseFloat(summary.total_revenue || 0),
    },
    period: {
      start_date: startDate,
      end_date: endDate,
    },
  };
};

/**
 * Get user counts by role and status
 */
const getUserAnalytics = async (startDate, endDate) => {
  // Validate date range if provided
  if (startDate || endDate) {
    if (!startDate || !endDate) {
      const error = new Error("Both start_date and end_date must be provided together");
      error.statusCode = 400;
      throw error;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      const error = new Error("Invalid date format. Use YYYY-MM-DD");
      error.statusCode = 400;
      throw error;
    }

    if (start > end) {
      const error = new Error("start_date must be before end_date");
      error.statusCode = 400;
      throw error;
    }
  }

  const userCounts = await analyticsModel.getUserCounts(startDate, endDate);

  // Format the response
  const byRole = {};
  userCounts.forEach((row) => {
    if (!byRole[row.role]) {
      byRole[row.role] = {};
    }
    byRole[row.role][row.status] = row.count;
  });

  return {
    users_by_role_and_status: byRole,
    total_users: userCounts.reduce((sum, row) => sum + row.count, 0),
    period: {
      start_date: startDate,
      end_date: endDate,
    },
  };
};

/**
 * Get property counts by status
 */
const getPropertyAnalytics = async (startDate, endDate) => {
  // Validate date range if provided
  if (startDate || endDate) {
    if (!startDate || !endDate) {
      const error = new Error("Both start_date and end_date must be provided together");
      error.statusCode = 400;
      throw error;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      const error = new Error("Invalid date format. Use YYYY-MM-DD");
      error.statusCode = 400;
      throw error;
    }

    if (start > end) {
      const error = new Error("start_date must be before end_date");
      error.statusCode = 400;
      throw error;
    }
  }

  const propertyCounts = await analyticsModel.getPropertyCounts(startDate, endDate);

  // Format response
  const byStatus = {};
  propertyCounts.forEach((row) => {
    byStatus[row.status] = row.count;
  });

  return {
    properties_by_status: byStatus,
    total_properties: propertyCounts.reduce((sum, row) => sum + row.count, 0),
    period: {
      start_date: startDate,
      end_date: endDate,
    },
  };
};

/**
 * Get reservation counts by status
 */
const getReservationAnalytics = async (startDate, endDate) => {
  // Validate date range if provided
  if (startDate || endDate) {
    if (!startDate || !endDate) {
      const error = new Error("Both start_date and end_date must be provided together");
      error.statusCode = 400;
      throw error;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      const error = new Error("Invalid date format. Use YYYY-MM-DD");
      error.statusCode = 400;
      throw error;
    }

    if (start > end) {
      const error = new Error("start_date must be before end_date");
      error.statusCode = 400;
      throw error;
    }
  }

  const reservationCounts = await analyticsModel.getReservationCounts(startDate, endDate);

  // Format response
  const byStatus = {};
  reservationCounts.forEach((row) => {
    byStatus[row.status] = row.count;
  });

  return {
    reservations_by_status: byStatus,
    total_reservations: reservationCounts.reduce((sum, row) => sum + row.count, 0),
    period: {
      start_date: startDate,
      end_date: endDate,
    },
  };
};

/**
 * Get payment totals and counts by status
 */
const getPaymentAnalytics = async (startDate, endDate) => {
  // Validate date range if provided
  if (startDate || endDate) {
    if (!startDate || !endDate) {
      const error = new Error("Both start_date and end_date must be provided together");
      error.statusCode = 400;
      throw error;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      const error = new Error("Invalid date format. Use YYYY-MM-DD");
      error.statusCode = 400;
      throw error;
    }

    if (start > end) {
      const error = new Error("start_date must be before end_date");
      error.statusCode = 400;
      throw error;
    }
  }

  const paymentCounts = await analyticsModel.getPaymentCounts(startDate, endDate);

  // Format response
  const byStatus = {};
  let totalRevenue = 0;
  paymentCounts.forEach((row) => {
    byStatus[row.status] = {
      count: row.count,
      total_amount: parseFloat(row.total_amount || 0),
    };
    // Only count paid payments towards revenue
    if (row.status === "paid") {
      totalRevenue += parseFloat(row.total_amount || 0);
    }
  });

  return {
    payments_by_status: byStatus,
    total_payments: paymentCounts.reduce((sum, row) => sum + row.count, 0),
    total_revenue: totalRevenue,
    period: {
      start_date: startDate,
      end_date: endDate,
    },
  };
};

/**
 * Get review count summary
 */
const getReviewAnalytics = async (startDate, endDate) => {
  // Validate date range if provided
  if (startDate || endDate) {
    if (!startDate || !endDate) {
      const error = new Error("Both start_date and end_date must be provided together");
      error.statusCode = 400;
      throw error;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      const error = new Error("Invalid date format. Use YYYY-MM-DD");
      error.statusCode = 400;
      throw error;
    }

    if (start > end) {
      const error = new Error("start_date must be before end_date");
      error.statusCode = 400;
      throw error;
    }
  }

  const reviewCounts = await analyticsModel.getReviewCounts(startDate, endDate);

  return {
    review_summary: {
      total_reviews: reviewCounts.total_reviews || 0,
      average_rating: parseFloat(reviewCounts.average_rating || 0).toFixed(2),
      min_rating: reviewCounts.min_rating,
      max_rating: reviewCounts.max_rating,
      owner_replied_count: reviewCounts.owner_replied_count || 0,
      owner_reply_rate:
        reviewCounts.total_reviews > 0
          ? (
              (reviewCounts.owner_replied_count / reviewCounts.total_reviews) *
              100
            ).toFixed(2) + "%"
          : "0%",
    },
    period: {
      start_date: startDate,
      end_date: endDate,
    },
  };
};

/**
 * Get recent platform activity
 */
const getRecentActivity = async (limit, startDate, endDate) => {
  // Validate date range if provided
  if (startDate || endDate) {
    if (!startDate || !endDate) {
      const error = new Error("Both start_date and end_date must be provided together");
      error.statusCode = 400;
      throw error;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      const error = new Error("Invalid date format. Use YYYY-MM-DD");
      error.statusCode = 400;
      throw error;
    }

    if (start > end) {
      const error = new Error("start_date must be before end_date");
      error.statusCode = 400;
      throw error;
    }
  }

  // Validate limit
  const queryLimit = Math.min(parseInt(limit) || 20, 100); // Max 100 records

  const activity = await analyticsModel.getRecentActivity(queryLimit, startDate, endDate);

  return {
    recent_activity: activity,
    count: activity.length,
    period: {
      start_date: startDate,
      end_date: endDate,
    },
  };
};

module.exports = {
  getSummary,
  getUserAnalytics,
  getPropertyAnalytics,
  getReservationAnalytics,
  getPaymentAnalytics,
  getReviewAnalytics,
  getRecentActivity,
};
