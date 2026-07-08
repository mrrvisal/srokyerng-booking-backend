// src/modules/reservations/reservation.routes.js
const express = require("express");
const reservationController = require("./reservation.controller");
const reviewController = require("../reviews/review.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const ROLES = require("../../constants/roles");
const paymentController = require("../payments/payment.controller");
const chatController = require("../chats/chat.controller");

const router = express.Router();

// All reservation routes require authentication
router.use(authMiddleware);

// Customer routes
router.post("/", roleMiddleware(ROLES.CUSTOMER), reservationController.createReservation);
router.post(
  "/:reservationId/reviews",roleMiddleware(ROLES.CUSTOMER),
  reviewController.createReview
);
router.get(
  "/my",
  roleMiddleware(ROLES.CUSTOMER),
  reservationController.getMyReservations
);
router.get("/:id", reservationController.getReservationById);
router.get("/:id/cancellation-policy", reservationController.getCancellationPolicy);
router.patch(
  "/:id/cancel",
  roleMiddleware(ROLES.CUSTOMER),
  reservationController.cancelReservation
);
router.post(
  "/:id/refund-request",
  roleMiddleware(ROLES.CUSTOMER),
  reservationController.requestRefundByReservation
);

router.get(
  "/refund-requests/my",
  authMiddleware,
  roleMiddleware(ROLES.CUSTOMER),
  paymentController.getMyRefundRequests
);

// Chat routes scoped under reservations
router.post(
  "/:reservationId/chats",
  authMiddleware,
  roleMiddleware(ROLES.CUSTOMER, ROLES.OWNER),
  chatController.startConversationFromReservation
);

module.exports = router;
