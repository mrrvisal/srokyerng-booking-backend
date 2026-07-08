const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const paymentController = require("./payment.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const ROLES = require("../../constants/roles");

const router = express.Router();

// ─── Multer setup for receipt uploads ─────────────────────────────
const RECEIPTS_DIR = path.join(process.cwd(), "uploads", "receipts");

// Ensure the directory exists at startup
if (!fs.existsSync(RECEIPTS_DIR)) {
  fs.mkdirSync(RECEIPTS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, RECEIPTS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `receipt-${unique}${ext}`);
  },
});

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const MAX_FILE_SIZE_MB = 5;

const receiptUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIME_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid file type or extension. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`
        )
      );
    }
  },
});

// Wrap multer to return a clean JSON error instead of crashing
const handleReceiptUpload = (req, res, next) => {
  receiptUpload.single("receipt")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB`,
          errors: null,
        });
      }
      return res.status(400).json({ success: false, message: err.message, errors: null });
    }
    if (err) {
      return res.status(400).json({ success: false, message: err.message, errors: null });
    }
    next();
  });
};

// ─── Customer routes ───────────────────────────────────────────────
router.post(
  "/",
  authMiddleware,
  roleMiddleware(ROLES.CUSTOMER),
  paymentController.createPayment
);

router.get(
  "/my",
  authMiddleware,
  roleMiddleware(ROLES.CUSTOMER),
  paymentController.getMyPayments
);

router.get(
  "/reservation/:id/owner-payment-accounts",
  authMiddleware,
  roleMiddleware(ROLES.CUSTOMER),
  paymentController.getReservationOwnerPaymentAccounts
);

// GET /:id must come AFTER /my to avoid route conflict
router.post(
  "/:id/proof",
  authMiddleware,
  roleMiddleware(ROLES.CUSTOMER),
  handleReceiptUpload,
  paymentController.uploadReceipt
);

router.patch(
  "/:id/proof",
  authMiddleware,
  roleMiddleware(ROLES.CUSTOMER),
  handleReceiptUpload,
  paymentController.uploadReceipt
);

router.get("/:id/proof", authMiddleware, paymentController.getPaymentProof);

router.get("/:id", authMiddleware, paymentController.getPaymentById);

router.post(
  "/:id/receipt",
  authMiddleware,
  roleMiddleware(ROLES.CUSTOMER),
  handleReceiptUpload,
  paymentController.uploadReceipt
);

module.exports = router;
