const nodemailer = require("nodemailer");
const env = require("../config/env");

let transporter;

const isSmtpConfigured = () => {
  // SMTP_FROM is optional — the From address is derived in buildFromAddress().
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);
};

/**
 * Build the From address.
 *
 * Gmail's SMTP only lets you send FROM your own Gmail address (or an alias you
 * own). A generic "no-reply@example.com" is rejected at send time, which used
 * to surface as a 500 during forgot-password — so for Gmail hosts we force the
 * address to the authenticated SMTP_USER while keeping a friendly display name.
 */
const buildFromAddress = () => {
  const isGmailHost = /(^|\.)gmail\.com$/i.test(env.SMTP_HOST || "");

  if (isGmailHost) {
    const displayName =
      (env.SMTP_FROM || "").match(/^([^<]*)/)?.[1]?.trim() || "SrokYerng Booking";
    return `"${displayName}" <${env.SMTP_USER}>`;
  }

  return env.SMTP_FROM || `SrokYerng Booking <${env.SMTP_USER}>`;
};

const getTransporter = () => {
  if (!isSmtpConfigured()) {
    const error = new Error("SMTP email configuration is missing");
    error.statusCode = 500;
    throw error;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
      },
      // Fail fast when the SMTP host is unreachable instead of hanging the
      // HTTP request for minutes (observed on Render when egress is slow).
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });
  }

  return transporter;
};

const sendEmail = async ({ to, subject, text, html }) => {
  await getTransporter().sendMail({
    from: buildFromAddress(),
    to,
    subject,
    text,
    html,
  });

  return {
    skipped: false,
  };
};

const sendEmailIfConfigured = async ({ to, subject, text, html }) => {
  if (!isSmtpConfigured()) {
    return {
      skipped: true,
      reason: "SMTP email configuration is missing",
    };
  }

  return sendEmail({ to, subject, text, html });
};

module.exports = {
  isSmtpConfigured,
  buildFromAddress,
  sendEmail,
  sendEmailIfConfigured,
};
