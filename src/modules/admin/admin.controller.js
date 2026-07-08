const asyncHandler = require("../../utils/asyncHandler");
const { successResponse, errorResponse } = require("../../utils/apiResponse");
const reservationService = require("../reservations/reservation.service");
const propertyService = require("../properties/property.service");
const reportService = require("../reports/report.service");

const getAllReservations = asyncHandler(async (req, res) => {
  const { status, property_id } = req.query;
  const filters = {};

  if (status) filters.status = status;
  if (property_id) filters.property_id = parseInt(property_id);

  const reservations = await reservationService.getAllReservations(filters);

  return successResponse(res, "All reservations retrieved successfully", reservations);
});

const getAll = asyncHandler(async (req, res) => {
  const result = await propertyService.getAll(req.query);

  if (!result) {
    return errorResponse(res, "Internal server error", 500);
  }

  return successResponse(res, "Get all properties successfully", result, 200);
});

const updateStatusProperty = asyncHandler(async (req, res) => {
  const result = await propertyService.updateStatus(req.user.id, req.params.id, req.body);

  if (!result.result) {
    return errorResponse(res, result.message, result.status);
  }

  return successResponse(res, result.message, result.data, result.status);
});

const getAllReports = asyncHandler(async (req, res) => {
  const result = await reportService.getAllReports();

  return res.status(result.status).json(result);
});

const updateStatus = asyncHandler(async (req, res) => {
  const result = await reportService.updateStatus(req.params.id, req.body.status);

  return res.status(result.status).json(result);
});

const resolveReport = asyncHandler(async (req, res) => {
  const result = await reportService.resolveReport(
    req.params.id,
    req.user.id,
    req.body.resolution_note
  );

  return res.status(result.status).json(result);
});

const getReportByIdAdmin = asyncHandler(async (req, res) => {
  const result = await reportService.getReportByIdAdmin(req.params.id);

  if (!result.result) {
    return errorResponse(res, result.message, result.status);
  }

  return successResponse(res, result.message, result.data, result.status);
});

const getPropertyDetailForAdmin = asyncHandler(async (req, res) => {
  const result = await propertyService.getPropertyDetailForAdmin(req.params.propertyId);

  if (!result.result) {
    return errorResponse(res, result.message, result.status);
  }

  return successResponse(res, result.message, result.data, result.status);
});

const getPropertyUpdateRequests = asyncHandler(async (req, res) => {
  const result = await propertyService.getPropertyUpdateRequests();

  if (!result.result) {
    return errorResponse(res, result.message, result.status);
  }

  return successResponse(res, result.message, result.data, result.status);
});

const getPropertyUpdateRequestDetail = asyncHandler(async (req, res) => {
  const result = await propertyService.getPropertyUpdateRequestDetail(
    req.params.requestId
  );

  if (!result.result) {
    return errorResponse(res, result.message, result.status);
  }

  return successResponse(res, result.message, result.data, result.status);
});

const approvePropertyUpdateRequest = asyncHandler(async (req, res) => {
  const result = await propertyService.approvePropertyUpdateRequest(
    req.params.requestId,
    req.user.id
  );

  if (!result.result) {
    return errorResponse(res, result.message, result.status);
  }

  return successResponse(res, result.message, null, result.status);
});

const rejectPropertyUpdateRequest = asyncHandler(async (req, res) => {
  const result = await propertyService.rejectPropertyUpdateRequest(
    req.params.requestId,
    req.user.id,
    req.body.rejection_reason
  );

  if (!result.result) {
    return errorResponse(res, result.message, result.status);
  }

  return successResponse(res, result.message, null, result.status);
});

module.exports = {
  getAllReservations,
  getAll,
  updateStatusProperty,
  getAllReports,
  updateStatus,
  resolveReport,
  getReportByIdAdmin,
  getPropertyDetailForAdmin,
  getPropertyUpdateRequests,
  getPropertyUpdateRequestDetail,
  approvePropertyUpdateRequest,
  rejectPropertyUpdateRequest,
};
