const express = require("express");
const reservationController = require("../reservations/reservation.controller");
const adminController = require("./admin.controller");
const reviewController = require("../reviews/review.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const ROLES = require("../../constants/roles");
const paymentController = require("../payments/payment.controller");
const analyticsController = require("../analytics/analytics.controller");

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(ROLES.ADMIN));

// Admin is view-only for reservations — status changes are an owner-only
// action (see owner.routes.js's PATCH /reservations/:id/status).
router.get("/reservations", reservationController.getAdminReservations);

router.get("/properties", adminController.getAll);
router.patch("/properties/:id/status", adminController.updateStatusProperty);
router.get("/reviews", reviewController.getAllReviews);
router.get("/properties/:propertyId", adminController.getPropertyDetailForAdmin);
router.get("/property-update-requests", adminController.getPropertyUpdateRequests);
router.get(
  "/property-update-requests/:requestId",
  adminController.getPropertyUpdateRequestDetail
);
router.patch(
  "/property-update-requests/:requestId/approve",
  adminController.approvePropertyUpdateRequest
);
router.patch(
  "/property-update-requests/:requestId/reject",
  adminController.rejectPropertyUpdateRequest
);

router.get(
  "/payments/pending-verification",
  paymentController.getPendingVerificationPayments
);
router.get("/payments/:id", paymentController.getPaymentById);
router.get("/payments/:id/proof", paymentController.getPaymentProof);
router.get("/payments", paymentController.getAllPayments);
router.get("/payment-accounts", paymentController.getAdminOwnerPaymentAccounts);
router.get("/payment-accounts/:id", paymentController.getAdminOwnerPaymentAccountById);

// Analytics endpoints
router.get("/analytics/summary", analyticsController.getSummary);
router.get("/analytics/users", analyticsController.getUsers);
router.get("/analytics/properties", analyticsController.getProperties);
router.get("/analytics/reservations", analyticsController.getReservations);
router.get("/analytics/payments", analyticsController.getPayments);
router.get("/analytics/reviews", analyticsController.getReviews);
router.get("/analytics/activity", analyticsController.getActivity);
router.get("/reports", adminController.getAllReports);
router.get("/reports/:id", adminController.getReportByIdAdmin);
router.patch("/reports/:id/status", adminController.updateStatus);
router.patch("/reports/:id/resolve", adminController.resolveReport);

module.exports = router;
