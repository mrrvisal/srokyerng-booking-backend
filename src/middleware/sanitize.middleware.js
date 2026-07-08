const sanitize = (text) => {
  if (typeof text !== "string") return text;

  return text
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
    .replace(/<iframe[^>]*>([\s\S]*?)<\/iframe>/gi, "")
    .replace(/<object[^>]*>([\s\S]*?)<\/object>/gi, "")
    .replace(/<embed[^>]*>([\s\S]*?)<\/embed>/gi, "")
    .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "")
    .replace(/on\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/on\w+\s*=\s*'[^']*'/gi, "")
    .replace(/on\w+\s*=\s*[^>\s]+/gi, "")
    .replace(/javascript:\s*[^"'\s>]+/gi, "")
    .replace(/<[^>]+>/g, "");
};

const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    return sanitize(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === "object") {
    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
};

const sanitizeMiddleware = (req, _res, next) => {
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  next();
};

module.exports = sanitizeMiddleware;
