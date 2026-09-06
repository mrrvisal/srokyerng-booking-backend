const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const env = require("./config/env");
const { corsOptions } = require("./config/cors");

const routes = require("./routes");
const errorMiddleware = require("./middleware/error.middleware");
const securityHeaders = require("./middleware/security.middleware");
const sanitizeMiddleware = require("./middleware/sanitize.middleware");


const app = express();

app.use(cors(corsOptions));
app.use(
  helmet({
    // This is a JSON API plus a static/image host, not an HTML app — a
    // default CSP has nothing useful to restrict here and only risks
    // breaking cross-origin <img> loading of receipts/property photos
    // from the frontend's own origin.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(securityHeaders);
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeMiddleware);
app.use(cookieParser());

// Receipts/chat attachments are private — served only via signed links
// (see protectedUploads.routes.js), so this must be mounted before the
// blanket static handler below, which covers the public asset folders
// (property/room photos, profile photos, payment QR codes).
app.use("/uploads", require("./routes/protectedUploads.routes"));
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SrokYerng Booking API is running",
  });
});

app.use("/api", routes);
app.use(errorMiddleware);
module.exports = app;
