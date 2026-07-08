const express = require("express");

const authRoutes = require("../modules/auth/auth.routes");
const userRoutes = require("../modules/users/user.routes");
const ownerRoutes = require("../modules/owner/owner.routes");
const propertyRoutes = require("../modules/properties/property.routes");
const reservationRoutes = require("../modules/reservations/reservation.routes");
const reviewRoutes = require("../modules/reviews/review.routes");
const adminRoutes = require("../modules/admin/admin.routes");
const amenityRoutes = require("../modules/amenities/amenity.routes");
const paymentRoutes = require("../modules/payments/payment.routes");
const roomRoutes = require("../modules/rooms/room.routes");
const wishlistRoutes = require("../modules/wishlists/wishlist.routes");
const notificationRoutes = require("../modules/notifications/notification.routes");
const chatRoutes = require("../modules/chats/chat.routes");
const reportRoutes = require("../modules/reports/report.routes");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "API health check OK",
  });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/owner", ownerRoutes);
router.use("/properties", propertyRoutes);
router.use("/reservations", reservationRoutes);
router.use("/reviews", reviewRoutes);
router.use("/admin", adminRoutes);
router.use("/amenities", amenityRoutes);
router.use("/payments", paymentRoutes);
router.use("/rooms", roomRoutes);
router.use("/wishlists", wishlistRoutes);
router.use("/notifications", notificationRoutes);
router.use("/chats", chatRoutes);
router.use("/reports", reportRoutes);

module.exports = router;
