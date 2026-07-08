const reviewModel = require("./review.model");
const AppError = require("../../utils/appError");

const ROLES = require("../../constants/roles");

const createReview = async (userId, reservationId, body) => {
  const { rating, comment } = body;

  // 1. Reservation must exist
  const reservation = await reviewModel.getReservationById(reservationId);

  if (!reservation) {
    throw new AppError("Reservation not found", 404);
  }

  // 2. Reservation must belong to this user
  if (Number(reservation.customer_id) !== Number(userId)) {
    throw new AppError("You are not allowed to review this reservation", 403);
  }

  // 3. Reservation must be completed before reviewing
  if (reservation.reservation_status !== "completed") {
    throw new AppError("You can only review completed reservations", 400);
  }

  // 4. No duplicate review for the same reservation
  const existingReview = await reviewModel.getReviewByReservationId(reservationId);

  if (existingReview) {
    throw new AppError("You have already reviewed this reservation", 400);
  }

  // 5. Get the room to find the property_id
  const room = await reviewModel.getRoomById(reservation.room_id);

  if (!room) {
    throw new AppError("Room not found", 404);
  }

  // 6. Insert the review
  const reviewId = await reviewModel.insertReview(
    reservationId,
    room.property_id,
    userId,
    rating,
    comment
  );

  // 7. Return the newly created review
  return await reviewModel.getReviewById(reviewId);
};

const getPropertyReviews = async (propertyId) => {
  return await reviewModel.getPropertyReviews(propertyId);
};

const getMyReviews = async (userId) => {
  return await reviewModel.getMyReviews(userId);
};

const getOwnerReviews = async (ownerId) => {
  return await reviewModel.getOwnerReviews(ownerId);
};

const updateReview = async (userId, reviewId, body) => {
  const review = await reviewModel.getReviewById(reviewId);

  if (!review) {
    throw new AppError("Review not found", 404);
  }

  // ownership check
  if (Number(review.customer_id) !== Number(userId)) {
    throw new AppError("Forbidden", 403);
  }

  await reviewModel.updateReview(reviewId, body);

  return await reviewModel.getReviewById(reviewId);
};

const replyToReview = async (userId, reviewId, body) => {
  const review = await reviewModel.getReviewById(reviewId);

  if (!review) {
    throw new AppError("Review not found", 404);
  }

  if (Number(review.owner_id) !== Number(userId)) {
    throw new AppError("Forbidden: You do not own this property", 403);
  }

  await reviewModel.updateOwnerReply(reviewId, body.owner_reply, userId);

  return await reviewModel.getReviewById(reviewId);
};

const deleteReview = async (reviewId, user) => {
  const review = await reviewModel.getReviewById(reviewId);

  if (!review) {
    throw new AppError("Review not found", 404);
  }

  const isOwner = Number(review.customer_id) === Number(user.id);
  const isAdmin = user.role === ROLES.ADMIN;

  if (!isOwner && !isAdmin) {
    throw new AppError("Forbidden", 403);
  }

  await reviewModel.deleteReview(reviewId);
};

const getAllReviews = async () => {
  return await reviewModel.getAllReviews();
};

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
