const express = require("express");

const roomController = require("./room.controller");

const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const upload = require("../../middleware/upload.middleware");

const role = require("../../constants/roles");

const router = express.Router();

// PUBLIC

router.get("/room-types", roomController.getRoomTypes);

router.get("/:id", roomController.getRoomDetail);

// OWNER

router.patch(
  "/:id",
  authMiddleware,
  roleMiddleware(role.OWNER),
  roomController.updateRoom
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(role.OWNER),
  roomController.deleteRoom
);

router.post(
  "/:id/images",
  authMiddleware,
  roleMiddleware(role.OWNER),
  upload.array("images", 10),
  roomController.uploadRoomImages
);

router.delete(
  "/:id/images/:imageId",
  authMiddleware,
  roleMiddleware(role.OWNER),
  roomController.deleteRoomImage
);

router.get("/:roomId/images", roomController.getRoomImages);

router.patch(
  "/:roomId/images/:imageId/cover",
  authMiddleware,
  roleMiddleware(role.OWNER),
  roomController.setRoomCoverImage
);

router.patch(
  "/:roomId/images/sort",
  authMiddleware,
  roleMiddleware(role.OWNER),
  roomController.sortRoomImages
);

router.get("/:roomId/availability", roomController.checkRoomAvailability);

router.get("/:roomId/availability-calendar", roomController.getRoomCalendar);

module.exports = router;
