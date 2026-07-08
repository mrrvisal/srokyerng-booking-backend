const asyncHandler = require("../../utils/asyncHandler");

const { successResponse, errorResponse } = require("../../utils/apiResponse");

const property = require("./property.service");
const room = require("../rooms/room.service");
const calendar = require("../calendar/calendar.service");

const getAllCategories = asyncHandler(async (req, res) => {
  let result = await property.getAllCategories();
  if (!result) {
    return errorResponse(res, "Internal server error", 500);
  }
  return successResponse(res, "Get All Categories successfully", result, 200);
});

const getAll = asyncHandler(async (req, res) => {
  let result = await property.getAllApproved(req.query);

  if (!result) {
    return errorResponse(res, "Internal server error", 500);
  }
  return successResponse(res, "Get All properties successfully", result, 200);
});

const register = asyncHandler(async (req, res) => {
  let result = await property.register(req.user.id, req.body);
  if (!result.result) {
    return errorResponse(res, result.message, result.status, result.error);
  }
  return successResponse(res, result.message, result.data, result.status);
});

const getDetail = asyncHandler(async (req, res) => {
  let result = await property.getDetail(req.params.id);
  if (!result.result) {
    return errorResponse(res, result.message, result.status, null);
  }
  return successResponse(res, result.message, result.data, result.status);
});

const getMyProperty = asyncHandler(async (req, res) => {
  let result = await property.getMyProperty(req.user.id, req.query);
  if (!result.result) {
    return errorResponse(res, result.message, result.status, null);
  }
  return successResponse(res, result.message, result.data, result.status);
});

const getMyPropertyById = asyncHandler(async (req, res) => {
  let result = await property.getMyPropertyById(req.params.id, req.user.id);
  if (!result.result) {
    return errorResponse(res, result.message, result.status, null);
  }
  return successResponse(res, result.message, result.data, result.status);
});

const update = asyncHandler(async (req, res) => {
  let result = await property.update(req.params.id, req.user.id, req.body);
  if (!result.result) {
    return errorResponse(res, result.message, result.status, null);
  }
  return successResponse(res, result.message, result.data, result.status);
});

const deleteProperty = asyncHandler(async (req, res) => {
  let result = await property.deleteProperty(req.params.id, req.user.id);
  if (!result.result) {
    return errorResponse(res, result.message, result.status, null);
  }
  return successResponse(res, result.message, result.data, result.status);
});

const getPropertyImages = asyncHandler(async (req, res) => {
  let result = await property.getPropertyImages(req.params.propertyId);

  if (!result.result) {
    return errorResponse(res, result.message, result.status, null);
  }

  return successResponse(res, result.message, result.data, result.status);
});

const uploadPropertyImage = asyncHandler(async (req, res) => {
  let result = await property.uploadPropertyImages(req.params.id, req.user.id, req.files);
  if (!result.result) {
    return errorResponse(res, result.message, result.status, null);
  }
  return successResponse(res, result.message, result.data, result.status);
});

const deletePropertyImage = asyncHandler(async (req, res) => {
  let result = await property.deletePropertyImage(
    req.params.id,
    req.params.imageId,
    req.user.id
  );
  if (!result.result) {
    return errorResponse(res, result.message, result.status, null);
  }
  return successResponse(res, result.message, result.data, result.status);
});

const setCoverImage = asyncHandler(async (req, res) => {
  let result = await property.setCoverImage(
    req.params.propertyId,
    req.params.imageId,
    req.user.id
  );

  if (!result.result) {
    return errorResponse(res, result.message, result.status, null);
  }

  return successResponse(res, result.message, result.data, result.status);
});

const sortPropertyImages = asyncHandler(async (req, res) => {
  let result = await property.sortPropertyImages(
    req.params.propertyId,
    req.body,
    req.user.id
  );

  if (!result.result) {
    return errorResponse(res, result.message, result.status, null);
  }

  return successResponse(res, result.message, result.data, result.status);
});

const getPropertyRooms = asyncHandler(async (req, res) => {
  let result = await room.getPropertyRooms(req.params.propertyId);

  if (!result.result) {
    return errorResponse(res, result.message, result.status, null);
  }

  return successResponse(res, result.message, result.data, result.status);
});

const createRoom = asyncHandler(async (req, res) => {
  let result = await room.createRoom(req.params.propertyId, req.user.id, req.body);

  if (!result.result) {
    return errorResponse(res, result.message, result.status, null);
  }

  return successResponse(res, result.message, result.data, result.status);
});

const getMyRooms = asyncHandler(async (req, res) => {
  let result = await room.getMyRooms(req.params.propertyId, req.user.id, req.query);

  if (!result.result) {
    return errorResponse(res, result.message, result.status, null);
  }

  return successResponse(res, result.message, result.data, result.status);
});

const getRoomDetailByProperty = asyncHandler(async (req, res) => {
  const result = await room.getRoomDetailByProperty(
    req.params.propertyId,
    req.params.roomId
  );

  if (!result.result) {
    return errorResponse(res, result.message, result.status);
  }

  return successResponse(res, result.message, result.data, result.status);
});

const checkPropertyAvailability = asyncHandler(async (req, res) => {
  let result = await room.checkPropertyAvailability(req.params.propertyId, req.query);

  if (!result.result) {
    return errorResponse(res, result.message, result.status, null);
  }

  return successResponse(res, result.message, result.data, result.status);
});

const getPropertyCalendar = asyncHandler(async (req, res) => {
  const result = await calendar.getPropertyCalendar(
    req.params.propertyId,
    req.query.start_date,
    req.query.end_date
  );

  return res.status(result.status).json(result);
});

// get Cities

const getCities = asyncHandler(async (req, res) => {
  const result = await property.getCities();
  return res.status(result.status).json(result);
});

// get provinces
const getProvince = asyncHandler(async (req, res) => {
  const result = await property.getProvince();
  return res.status(result.status).json(result);
});

module.exports = {
  getAllCategories,

  getAll,
  getDetail,
  register,
  getMyProperty,
  getMyPropertyById,
  update,
  deleteProperty,
  getPropertyImages,
  uploadPropertyImage,
  deletePropertyImage,
  setCoverImage,
  sortPropertyImages,
  getPropertyRooms,
  createRoom,
  getMyRooms,
  checkPropertyAvailability,
  getPropertyCalendar,
  getRoomDetailByProperty,

  getCities,
  getProvince,
};
