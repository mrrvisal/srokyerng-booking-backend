const analyticsModel = require("./analytics.model");

/**
 * Owner Analytics Service - Business logic for owner analytics
 * Ensures owners only see their own properties' data
 */

/**
 * Validate date range helper
 */
const validateDateRange = (startDate, endDate) => {
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
};

/**
 * Validate property ownership
 */
const validatePropertyOwnership = async (ownerId, propertyId) => {
  if (!propertyId) return true; // If no propertyId, return all properties

  const isOwner = await analyticsModel.verifyPropertyOwnership(ownerId, propertyId);
  if (!isOwner) {
    const error = new Error("Property does not belong to this owner");
    error.statusCode = 403;
    throw error;
  }
  return true;
};

/**
 * Get owner dashboard summary
 */
const getDashboardSummary = async (ownerId, startDate, endDate) => {
  validateDateRange(startDate, endDate);

  const summary = await analyticsModel.getDashboardSummary(ownerId, startDate, endDate);

  return {
    dashboard_summary: {
      total_reservations: summary.total_reservations || 0,
      confirmed_reservations: summary.confirmed_reservations || 0,
      completed_reservations: summary.completed_reservations || 0,
      upcoming_reservations: summary.upcoming_reservations || 0,
    },
    period: {
      start_date: startDate,
      end_date: endDate,
    },
  };
};

/**
 * Get reservation statistics
 */
const getReservationAnalytics = async (
  ownerId,
  startDate,
  endDate,
  propertyId = null
) => {
  validateDateRange(startDate, endDate);
  if (propertyId) {
    await validatePropertyOwnership(ownerId, propertyId);
  }

  const stats = await analyticsModel.getReservationStats(
    ownerId,
    startDate,
    endDate,
    propertyId
  );

  const byStatus = {};
  let totalReservations = 0;
  let totalRevenue = 0;

  stats.forEach((row) => {
    byStatus[row.status] = {
      count: row.count,
      avg_nights: parseFloat(row.avg_nights || 0).toFixed(2),
      total_amount: parseFloat(row.total_amount || 0),
    };
    totalReservations += row.count;
    totalRevenue += parseFloat(row.total_amount || 0);
  });

  return {
    reservations_by_status: byStatus,
    total_reservations: totalReservations,
    total_reservation_revenue: totalRevenue,
    period: {
      start_date: startDate,
      end_date: endDate,
      property_id: propertyId,
    },
  };
};

/**
 * Get revenue statistics
 */
const getRevenueAnalytics = async (ownerId, startDate, endDate, propertyId = null) => {
  validateDateRange(startDate, endDate);
  if (propertyId) {
    await validatePropertyOwnership(ownerId, propertyId);
  }

  const stats = await analyticsModel.getRevenueStats(
    ownerId,
    startDate,
    endDate,
    propertyId
  );

  const byStatus = {};
  let totalRevenue = 0;
  let paidRevenue = 0;
  let cancelledRevenue = 0;
  let refundedRevenue = 0;

  stats.forEach((row) => {
    byStatus[row.status] = {
      count: row.count,
      total_amount: parseFloat(row.total_amount || 0),
    };

    if (row.status === "paid") {
      paidRevenue += parseFloat(row.total_amount || 0);
    } else if (row.status === "cancelled") {
      cancelledRevenue += parseFloat(row.total_amount || 0);
    } else if (row.status === "refunded") {
      refundedRevenue += parseFloat(row.total_amount || 0);
    }

    totalRevenue += parseFloat(row.total_amount || 0);
  });

  return {
    revenue_by_status: byStatus,
    total_revenue: totalRevenue,
    paid_revenue: paidRevenue,
    cancelled_revenue: cancelledRevenue,
    refunded_revenue: refundedRevenue,
    net_revenue: paidRevenue - refundedRevenue,
    period: {
      start_date: startDate,
      end_date: endDate,
      property_id: propertyId,
    },
  };
};

/**
 * Get top properties
 */
const getTopProperties = async (
  ownerId,
  limit = 10,
  startDate,
  endDate,
  propertyId = null
) => {
  validateDateRange(startDate, endDate);
  if (propertyId) {
    await validatePropertyOwnership(ownerId, propertyId);
  }

  // Validate limit
  const queryLimit = Math.min(parseInt(limit) || 10, 50);

  const properties = await analyticsModel.getTopProperties(
    ownerId,
    queryLimit,
    startDate,
    endDate
  );

  const formatted = properties.map((p) => ({
    property_id: p.id,
    property_name: p.property_name,
    status: p.status,
    reservation_count: p.reservation_count,
    total_revenue: parseFloat(p.total_revenue || 0),
    avg_rating: parseFloat(p.avg_rating || 0).toFixed(2),
    unique_customers: p.unique_customers,
  }));

  return {
    top_properties: formatted,
    count: formatted.length,
    period: {
      start_date: startDate,
      end_date: endDate,
    },
  };
};

/**
 * Get top rooms
 */
const getTopRooms = async (
  ownerId,
  limit = 10,
  startDate,
  endDate,
  propertyId = null
) => {
  validateDateRange(startDate, endDate);
  if (propertyId) {
    await validatePropertyOwnership(ownerId, propertyId);
  }

  // Validate limit
  const queryLimit = Math.min(parseInt(limit) || 10, 50);

  const rooms = await analyticsModel.getTopRooms(ownerId, queryLimit, startDate, endDate);

  const formatted = rooms.map((r) => ({
    room_id: r.id,
    room_name: r.room_name,
    property_name: r.property_name,
    price_per_night: parseFloat(r.price_per_night),
    reservation_count: r.reservation_count,
    total_revenue: parseFloat(r.total_revenue || 0),
    avg_rating: parseFloat(r.avg_rating || 0).toFixed(2),
  }));

  return {
    top_rooms: formatted,
    count: formatted.length,
    period: {
      start_date: startDate,
      end_date: endDate,
      property_id: propertyId,
    },
  };
};

module.exports = {
  getDashboardSummary,
  getReservationAnalytics,
  getRevenueAnalytics,
  getTopProperties,
  getTopRooms,
};
