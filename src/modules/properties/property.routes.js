const express = require("express");

const propertyController = require("./property.controller");
const paymentController = require("../payments/payment.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const upload = require("../../middleware/upload.middleware");

const role = require("../../constants/roles");
const reviewController = require("../reviews/review.controller");
const amenityController = require("../amenities/amenity.controller");
const chatController = require("../chats/chat.controller");

const router = express.Router();

router.get("/", propertyController.getAll);
router.get("/categories", propertyController.getAllCategories);
router.get("/cities", propertyController.getCities);
router.get("/provinces", propertyController.getProvince);
router.post("/", authMiddleware, roleMiddleware(role.OWNER), propertyController.register);
router.patch(
  "/:id",
  authMiddleware,
  roleMiddleware(role.OWNER),
  propertyController.update
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(role.OWNER),
  propertyController.deleteProperty
);

router.get(
  "/my",
  authMiddleware,
  roleMiddleware(role.OWNER),
  propertyController.getMyProperty
);
router.get("/:propertyId/reviews", reviewController.getPropertyReviews);
router.get("/:propertyId/amenities", amenityController.getPropertyAmenities);

router.put(
  "/:propertyId/amenities",
  authMiddleware,
  roleMiddleware(role.OWNER),
  amenityController.updatePropertyAmenities
);
router.get("/:id", propertyController.getDetail);

router.get(
  "/my/:id",
  authMiddleware,
  roleMiddleware(role.OWNER),
  propertyController.getMyPropertyById
);

router.get("/:propertyId/images", propertyController.getPropertyImages);

router.post(
  "/:id/images",
  authMiddleware,
  roleMiddleware(role.OWNER),
  upload.array("images", 10),
  propertyController.uploadPropertyImage
);

router.delete(
  "/:id/images/:imageId",
  authMiddleware,
  roleMiddleware(role.OWNER),
  propertyController.deletePropertyImage
);

router.patch(
  "/:propertyId/images/:imageId/cover",
  authMiddleware,
  roleMiddleware(role.OWNER),
  propertyController.setCoverImage
);

router.patch(
  "/:propertyId/images/sort",
  authMiddleware,
  roleMiddleware(role.OWNER),
  propertyController.sortPropertyImages
);

router.get("/:propertyId/rooms", propertyController.getPropertyRooms);
router.get(
  "/:propertyId/payment-accounts",
  authMiddleware,
  roleMiddleware(role.CUSTOMER),
  paymentController.getPropertyPaymentAccounts
);
router.post(
  "/:propertyId/rooms",
  authMiddleware,
  roleMiddleware(role.OWNER),
  propertyController.createRoom
);

router.get(
  "/:propertyId/rooms/my",
  authMiddleware,
  roleMiddleware(role.OWNER),
  propertyController.getMyRooms
);

router.get(
  "/:propertyId/rooms/:roomId",
  authMiddleware,
  roleMiddleware(role.OWNER),
  propertyController.getRoomDetailByProperty
);

router.get("/:propertyId/availability", propertyController.checkPropertyAvailability);

router.get("/:propertyId/availability-calendar", propertyController.getPropertyCalendar);

// Chat routes scoped under properties
router.post(
  "/:propertyId/chats",
  authMiddleware,
  roleMiddleware(role.CUSTOMER),
  chatController.startConversationFromProperty
);

module.exports = router;
