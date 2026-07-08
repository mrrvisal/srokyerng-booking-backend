const jwt = require("jsonwebtoken");
const { errorResponse } = require("../utils/apiResponse");
const { AUTH } = require("../constants/messages");
const env = require("../config/env");


const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return errorResponse(res, AUTH.UNAUTHORIZED, 401);
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return errorResponse(res, AUTH.UNAUTHORIZED, 401);
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    return next();
  } catch (_error) {
    return errorResponse(res, AUTH.UNAUTHORIZED, 401);
  }
};

module.exports = authMiddleware;
