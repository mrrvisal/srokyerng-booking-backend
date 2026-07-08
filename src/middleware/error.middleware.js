const { errorResponse } = require("../utils/apiResponse");

const errorMiddleware = (err, req, res, _next) => {
  console.error(err);

  const statusCode = err.statusCode || 500;
  const isDev = process.env.NODE_ENV !== "production";
  const message =
    statusCode >= 500
      ? isDev
        ? err.message || "Internal server error"
        : "Internal server error"
      : err.message || "Request failed";


  const errors = isDev ? err.errors || null : null;

  return errorResponse(res, message, statusCode, errors);
};

module.exports = errorMiddleware;
