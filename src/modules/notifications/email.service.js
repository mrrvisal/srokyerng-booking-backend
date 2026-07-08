const emailService = require("../../services/email.service");
const { getHtmlTemplate } = require("../../utils/email");

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));

const SUCCESS_TYPES = new Set([
  "reservation_confirmed",
  "payment_verified",
  "property_approved",
]);

const DANGER_TYPES = new Set([
  "reservation_cancelled",
  "payment_rejected",
  "property_rejected",
]);

const BRAND_COLOR = "#1268b4";

const getIcon = (type) => {
  if (SUCCESS_TYPES.has(type)) {
    return "&#10003;"; // check mark
  }

  if (DANGER_TYPES.has(type)) {
    return "&#10005;"; // cross mark
  }

  return "&#8226;"; // brand dot
};

const sendNotificationEmail = async ({ to, subject, title, message, actionUrl, type }) => {
  const text = [
    title,
    "",
    message,
    actionUrl ? "" : null,
    actionUrl ? `Open: ${actionUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const icon = getIcon(type);

  const content = `
    <div style="width: 56px; height: 56px; border-radius: 50%; background-color: ${BRAND_COLOR}; color: #ffffff; font-size: 26px; font-weight: 700; line-height: 56px; text-align: center; margin: 0 auto 24px;">${icon}</div>
    <h1 style="text-align: center;">${escapeHtml(title)}</h1>
    <p style="text-align: center;">${escapeHtml(message)}</p>
    ${actionUrl ? `<div class="btn-container"><a href="${actionUrl}" class="btn">View Details</a></div>` : ""}
  `;

  const html = getHtmlTemplate(subject, content);

  return emailService.sendEmailIfConfigured({
    to,
    subject,
    text,
    html,
  });
};

module.exports = {
  isSmtpConfigured: emailService.isSmtpConfigured,
  sendEmail: emailService.sendEmailIfConfigured,
  sendNotificationEmail,
};
