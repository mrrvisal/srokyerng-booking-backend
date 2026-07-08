const crypto = require("crypto");
const env = require("../config/env");

// Private-file URLs (payment receipts, chat attachments) are signed at the
// moment they're included in an API response — by then the caller has
// already passed whatever ownership check gates that response (e.g.
// paymentService.getPaymentById, chatService.getMessages), so the signature
// itself is the authorization: anyone holding a valid, unexpired link was
// legitimately handed it.
const TTL_MS = 15 * 60 * 1000;

const computeSignature = (relativePath, expires) =>
  crypto
    .createHmac("sha256", env.JWT_SECRET)
    .update(`${relativePath}:${expires}`)
    .digest("hex");

const sign = (relativePath) => {
  if (!relativePath) return relativePath;

  const expires = Date.now() + TTL_MS;
  const signature = computeSignature(relativePath, expires);
  const separator = relativePath.includes("?") ? "&" : "?";
  return `${relativePath}${separator}exp=${expires}&sig=${signature}`;
};

const verify = (relativePath, expires, signature) => {
  if (!expires || !signature) return false;

  const expiresNum = Number(expires);
  if (!Number.isFinite(expiresNum) || Date.now() > expiresNum) return false;

  const expected = computeSignature(relativePath, expiresNum);
  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(String(signature), "hex");

  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
};

module.exports = { sign, verify };
