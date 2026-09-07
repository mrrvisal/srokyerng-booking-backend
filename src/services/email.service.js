const nodemailer = require("nodemailer");
const env = require("../config/env");

let transporter;

const RESEND_API_URL = "https://api.resend.com/emails";

const isSmtpConfigured = () => {
  // SMTP_FROM is optional — the From address is derived in buildFromAddress().
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);
};

const isResendConfigured = () => Boolean(env.RESEND_API_KEY);

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

const getResendFrom = () => env.RESEND_FROM || "SrokYerng Booking <onboarding@resend.dev>";

const getTransporter = () => {
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

const sendViaResend = async ({ to, subject, text, html }) => {
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getResendFrom(),
      to,
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Resend API responded ${response.status}: ${String(body).slice(0, 300)}`
    );
  }

  return true;
};

const sendViaSmtp = async ({ to, subject, text, html }) => {
  await getTransporter().sendMail({
    from: buildFromAddress(),
    to,
    subject,
    text,
    html,
  });

  return true;
};

const sendEmail = async (payload) => {
  // Prefer the Resend HTTPS API — outbound 443 is never blocked on Render,
  // whereas SMTP egress (port 587) can be black-holed. SMTP remains the
  // fallback for local dev and self-hosted setups.
  if (isResendConfigured()) {
    await sendViaResend(payload);
  } else {
    await sendViaSmtp(payload);
  }

  return {
    skipped: false,
    provider: isResendConfigured() ? "resend" : "smtp",
  };
};

const sendEmailIfConfigured = async ({ to, subject, text, html }) => {
  if (!isResendConfigured() && !isSmtpConfigured()) {
    return {
      skipped: true,
      reason: "Email configuration is missing (set RESEND_API_KEY or SMTP_*)",
    };
  }

  return sendEmail({ to, subject, text, html });
};

module.exports = {
  isSmtpConfigured,
  isResendConfigured,
  buildFromAddress,
  getResendFrom,
  sendEmail,
  sendEmailIfConfigured,
};
