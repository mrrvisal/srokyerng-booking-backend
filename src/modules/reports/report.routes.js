const express = require("express");

const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");

const role = require("../../constants/roles");

const reportController = require("./report.controller");

const router = express.Router();

// Report endpoints will be added by the reports module owner.

router.post(
  "/",
  authMiddleware,
  roleMiddleware(role.CUSTOMER),
  reportController.createReport
);

router.get(
  "/my",
  authMiddleware,
  roleMiddleware(role.CUSTOMER),
  reportController.getMyReports
);

router.get(
  "/:id",
  authMiddleware,
  roleMiddleware(role.CUSTOMER),
  reportController.getMyReportDetail
);

module.exports = router;
