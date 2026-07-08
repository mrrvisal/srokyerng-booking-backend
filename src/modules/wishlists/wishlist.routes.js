const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");

const role = require("../../constants/roles");

const wishlistController = require("./wishlist.controller");

const router = express.Router();

// Wishlist endpoints will be added by the wishlist module owner.

router.get(
  "/my",
  authMiddleware,
  roleMiddleware(role.CUSTOMER),
  wishlistController.getMyWishlist
);

router.post(
  "/properties/:propertyId",
  authMiddleware,
  roleMiddleware(role.CUSTOMER),
  wishlistController.addWishlist
);

router.delete(
  "/properties/:propertyId",
  authMiddleware,
  roleMiddleware(role.CUSTOMER),
  wishlistController.removeWishlist
);

router.get(
  "/properties/:propertyId/status",
  authMiddleware,
  roleMiddleware(role.CUSTOMER),
  wishlistController.checkWishlistStatus
);

module.exports = router;
