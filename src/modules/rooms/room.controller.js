const asyncHandler = require("../../utils/asyncHandler");

const { successResponse, errorResponse } = require("../../utils/apiResponse");

const room = require("./room.service");

const calendar = require("../calendar/calendar.service");

const getRoomDetail = asyncHandler(async (req, res) => {
  let result = await room.getRoomDetail(req.params.id);

  if (!result.result) {
    return errorResponse(res, result.message, result.status, null);
  }

  return successResponse(res, result.message, result.data, result.status);
});

const updateRoom = asyncHandler(async (req, res) => {
  let result = await room.updateRoom(req.params.id, req.user.id, req.body);

  if (!result.result) {
    return errorResponse(res, result.message, result.status, null);
  }

  return successResponse(res, result.message, result.data, result.status);
});

const deleteRoom = asyncHandler(async (req, res) => {
  let result = await room.deleteRoom(req.params.id, req.user.id);

  if (!result.result) {
    return errorResponse(res, result.message, result.status, null);
  }

  return successResponse(res, result.message, result.data, result.status);
});

const uploadRoomImages = asyncHandler(async (req, res) => {
  let result = await room.uploadRoomImages(req.params.id, req.user.id, req.files);

  if (!result.result) {
    return errorResponse(res, result.message, result.status, null);
  }

  return successResponse(res, result.message, result.data, result.status);
});

const deleteRoomImage = asyncHandler(async (req, res) => {
  let result = await room.deleteRoomImage(req.params.id, req.params.imageId, req.user.id);

  if (!result.result) {
    return errorResponse(res, result.message, result.status, null);
  }

  return successResponse(res, result.message, result.data, result.status);
});

const getRoomTypes = asyncHandler(async (req, res) => {
  let result = await room.getRoomTypes();

  return successResponse(res, "Room types fetched successfully", result, 200);
});

const getRoomImages = asyncHandler(async (req, res) => {
  let result = await room.getRoomImages(req.params.roomId);

  if (!result.result) {
    return errorResponse(res, result.message, result.status, null);
  }

  return successResponse(res, result.message, result.data, result.status);
});

const setRoomCoverImage = asyncHandler(async (req, res) => {
  let result = await room.setRoomCoverImage(
    req.params.roomId,
    req.params.imageId,
    req.user.id
  );

  if (!result.result) {
    return errorResponse(res, result.message, result.status, null);
  }

  return successResponse(res, result.message, result.data, result.status);
});

const sortRoomImages = asyncHandler(async (req, res) => {
  let result = await room.sortRoomImages(req.params.roomId, req.body, req.user.id);

  if (!result.result) {
    return errorResponse(res, result.message, result.status, null);
  }

  return successResponse(res, result.message, result.data, result.status);
});

const checkRoomAvailability = asyncHandler(async (req, res) => {
  let result = await room.checkRoomAvailability(req.params.roomId, req.query);

  if (!result.result) {
    return errorResponse(res, result.message, result.status, null);
  }

  return successResponse(res, result.message, result.data, result.status);
});

const getRoomCalendar = asyncHandler(async (req, res) => {
  const result = await calendar.getRoomCalendar(
    req.params.roomId,
    req.query.start_date,
    req.query.end_date
  );

  return res.status(result.status).json(result);
});

module.exports = {
  getRoomDetail,
  updateRoom,
  deleteRoom,
  uploadRoomImages,
  deleteRoomImage,
  getRoomTypes,
  getRoomImages,
  setRoomCoverImage,
  sortRoomImages,
  checkRoomAvailability,
  getRoomCalendar,
};
