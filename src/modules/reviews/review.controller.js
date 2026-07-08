const reviewService = require("./review.service");

const { createReviewSchema, updateReviewSchema } = require("./review.validation");

const asyncHandler = require("../../utils/asyncHandler");

const { successResponse, errorResponse } = require("../../utils/apiResponse");

const toPositiveInt = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
};

const createReview = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const reservationId = toPositiveInt(req.params.reservationId);

  if (!reservationId) {
    return errorResponse(res, "Reservation ID must be a positive integer", 400);
  }

  // validation
  const { error, value } = createReviewSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return errorResponse(res, error.details[0].message, 400);
  }

  const result = await reviewService.createReview(userId, reservationId, value);

  return successResponse(res, "Review created successfully", result, 201);
});

const getPropertyReviews = asyncHandler(async (req, res) => {
  const propertyId = req.params.propertyId;

  res.set("Cache-Control", "no-store");

  const reviews = await reviewService.getPropertyReviews(propertyId);

  return successResponse(res, "Property reviews fetched successfully", reviews);
});

const getMyReviews = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  res.set("Cache-Control", "no-store");

  const reviews = await reviewService.getMyReviews(userId);

  return successResponse(res, "My reviews fetched successfully", reviews);
});

const getOwnerReviews = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  res.set("Cache-Control", "no-store");

  const reviews = await reviewService.getOwnerReviews(userId);

  return successResponse(res, "Owner reviews fetched successfully", reviews);
});

const updateReview = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const reviewId = toPositiveInt(req.params.id);

  if (!reviewId) {
    return errorResponse(res, "Review ID must be a positive integer", 400);
  }

  const { error, value } = updateReviewSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return errorResponse(res, error.details[0].message, 400);
  }

  const review = await reviewService.updateReview(userId, reviewId, value);

  return successResponse(res, "Review updated successfully", review);
});

const replyToReview = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const reviewId = toPositiveInt(req.params.id);

  if (!reviewId) {
    return errorResponse(res, "Review ID must be a positive integer", 400);
  }

  const { replyReviewSchema } = require("./review.validation");
  const { error, value } = replyReviewSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return errorResponse(res, error.details[0].message, 400);
  }

  const review = await reviewService.replyToReview(userId, reviewId, value);

  return successResponse(res, "Review replied successfully", review);
});

const deleteReview = asyncHandler(async (req, res) => {
  const reviewId = toPositiveInt(req.params.id);

  if (!reviewId) {
    return errorResponse(res, "Review ID must be a positive integer", 400);
  }

  await reviewService.deleteReview(reviewId, req.user);

  return successResponse(res, "Review deleted successfully");
});

const getAllReviews = asyncHandler(async (req, res) => {
  res.set("Cache-Control", "no-store");

  const reviews = await reviewService.getAllReviews();

  return successResponse(res, "All reviews fetched successfully", reviews);
});

module.exports = {
  createReview,
  getPropertyReviews,
  getMyReviews,
  getOwnerReviews,
  updateReview,
  replyToReview,
  deleteReview,
  getAllReviews,
};