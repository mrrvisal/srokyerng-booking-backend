const express = require("express");
const userController = require("./user.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const upload = require("../../middleware/upload.middleware");
const ROLES = require("../../constants/roles");

const router = express.Router();

router.get("/", authMiddleware, roleMiddleware(ROLES.ADMIN), userController.getAll);
router.get("/me", authMiddleware, userController.getMe);
router.patch("/me", authMiddleware, userController.updateMe);
router.patch("/me/password", authMiddleware, userController.changePassword);
router.patch(
  "/me/profile-image",
  authMiddleware,
  upload.profileImage,
  userController.updateProfileImage
);
router.delete("/me/profile-image", authMiddleware, userController.deleteProfileImage);
router.get("/:id", authMiddleware, roleMiddleware(ROLES.ADMIN), userController.getById);
router.patch(
  "/:id/status",
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  userController.updateStatus
);

module.exports = router;
