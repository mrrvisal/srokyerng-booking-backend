const express = require("express");
const ownerController = require("./owner.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const ROLES = require("../../constants/roles");
const paymentController = require("../payments/payment.controller");
const upload = require("../../middleware/upload.middleware");
const analyticsController = require("./analytics.controller");

const paymentAccountQrUpload = upload.createImageUpload({
  folder: "payment-account-qrs",
  prefix: "payment-account-qr",
});

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(ROLES.OWNER));

const reservationController = require("../reservations/reservation.controller");

router.get("/dashboard", ownerController.getDashboard);
router.get("/properties", ownerController.getProperties);
router.patch("/properties/:id/deactivate", ownerController.deactivateProperty);
router.patch("/properties/:id/activate", ownerController.activateProperty);
router.get("/reservations", ownerController.getReservations);
router.patch("/reservations/:id/status", reservationController.ownerUpdateReservationStatus);

router.get("/payments", paymentController.getOwnerPayments);
router.get(
  "/payments/pending-verification",
  paymentController.getOwnerPendingVerificationPayments
);
router.get("/payments/:id", paymentController.getPaymentById);
router.get("/payments/:id/proof", paymentController.getPaymentProof);
router.patch("/payments/:id/verify", paymentController.verifyPayment);
router.patch("/payments/:id/reject", paymentController.rejectPayment);
router.patch("/payments/:id/refund", paymentController.refundPayment);

router.get("/payment-accounts", paymentController.getOwnerPaymentAccounts);
router.post(
  "/payment-accounts",
  upload.handleUpload(paymentAccountQrUpload.single("qr_image")),
  paymentController.createOwnerPaymentAccount
);
router.patch(
  "/payment-accounts/:id",
  upload.handleUpload(paymentAccountQrUpload.single("qr_image")),
  paymentController.updateOwnerPaymentAccount
);
router.patch(
  "/payment-accounts/:id/deactivate",
  paymentController.deactivateOwnerPaymentAccount
);
router.delete("/payment-accounts/:id", paymentController.deleteOwnerPaymentAccount);
router.patch(
  "/payment-accounts/:id/activate",
  paymentController.activateOwnerPaymentAccount
);

// Refund request endpoints
router.get("/refund-requests", paymentController.getOwnerRefundRequests);
router.get(
  "/refund-requests/pending",
  paymentController.getOwnerPendingRefundRequests
);
router.get(
  "/refund-requests/:id",
  paymentController.getOwnerRefundRequestById
);
router.patch(
  "/refund-requests/:id/approve",
  paymentController.approveOwnerRefundRequest
);
router.patch(
  "/refund-requests/:id/reject",
  paymentController.rejectOwnerRefundRequest
);

router.get("/reviews", ownerController.getReviews);

// Analytics endpoints
router.get("/analytics/summary", analyticsController.getSummary);
router.get("/analytics/reservations", analyticsController.getReservations);
router.get("/analytics/revenue", analyticsController.getRevenue);
router.get("/analytics/properties", analyticsController.getProperties);
router.get("/analytics/rooms", analyticsController.getRooms);
router.get(
  "/properties/:propertyId/availability-calendar",
  ownerController.getOwnerPropertyCalendar
);

router.get("/rooms/:roomId/availability-calendar", ownerController.getOwnerRoomCalendar);

router.post(
  "/rooms/:roomId/availability-blocks",
  ownerController.createRoomAvailabilityBlock
);
router.delete(
  "/rooms/:roomId/availability-blocks/:date",
  ownerController.deleteRoomAvailabilityBlock
);

module.exports = router;
