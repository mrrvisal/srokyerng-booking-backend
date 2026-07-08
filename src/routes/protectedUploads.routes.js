const express = require("express");
const path = require("path");
const fs = require("fs");
const { verify } = require("../utils/signedFileUrl");
const { errorResponse } = require("../utils/apiResponse");

const router = express.Router();
const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

// Payment receipts and chat attachments contain private financial/personal
// data, so unlike property/room photos they're never served by the plain
// express.static("uploads") mount — only via these signed, time-limited
// links minted by toSafePayment()/chatService when the caller already
// proved ownership of the underlying resource.
const servePrivateFile = (subdir) => (req, res) => {
  const filename = path.basename(req.params.filename);
  const relativePath = `/uploads/${subdir}/${filename}`;

  if (!verify(relativePath, req.query.exp, req.query.sig)) {
    return errorResponse(res, "This link has expired or is invalid", 403);
  }

  const absolutePath = path.join(UPLOADS_ROOT, subdir, filename);
  if (!absolutePath.startsWith(UPLOADS_ROOT) || !fs.existsSync(absolutePath)) {
    return errorResponse(res, "File not found", 404);
  }

  return res.sendFile(absolutePath);
};

router.get("/receipts/:filename", servePrivateFile("receipts"));
router.get("/chats/:filename", servePrivateFile("chats"));

module.exports = router;
