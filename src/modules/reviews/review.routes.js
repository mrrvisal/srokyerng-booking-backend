const express = require("express");
const router = express.Router();

const reviewController = require("./review.controller");

const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");

const ROLES = require("../../constants/roles");

router.use(authMiddleware);

router.get(
    "/admin/reviews",
    roleMiddleware(ROLES.ADMIN),
    reviewController.getAllReviews
);

router.get(
    "/my",
    roleMiddleware(ROLES.CUSTOMER),
    reviewController.getMyReviews
);

router.get(
    "/owner",
    roleMiddleware(ROLES.OWNER),
    reviewController.getOwnerReviews
);

router.patch(
    "/:id/reply",
    roleMiddleware(ROLES.OWNER, ROLES.ADMIN),
    reviewController.replyToReview
);

router.patch(
    "/:id",
    roleMiddleware(ROLES.CUSTOMER, ROLES.ADMIN),
    reviewController.updateReview
);

router.delete(
    "/:id",
    roleMiddleware(ROLES.CUSTOMER, ROLES.ADMIN),
    reviewController.deleteReview
);

module.exports = router;
