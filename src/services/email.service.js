const nodemailer = require("nodemailer");
const env = require("../config/env");

let transporter;

const RESEND_API_URL = "https://api.resend.com/emails";
const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const isSmtpConfigured = () => {
  // SMTP_FROM is optional — the From address is derived in buildFromAddress().
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);
};

const isResendConfigured = () => Boolean(env.RESEND_API_KEY);
const isSendGridConfigured = () => Boolean(env.SENDGRID_API_KEY);
const isBrevoConfigured = () => Boolean(env.BREVO_API_KEY);

/**
 * Build the From address (used by SMTP and, if SENDGRID_FROM is unset, by
 * SendGrid too).
 *
 * Gmail's SMTP only lets you send FROM your own Gmail address (or an alias you
 * own). A generic "no-reply@example.com" is rejected at send time, which used
 * to surface as a 500 during forgot-password — so for Gmail hosts we force the
 * address to the authenticated SMTP_USER while keeping a friendly display name.
 */
const buildFromAddress = (fallbackFrom = `SrokYerng Booking <${env.SMTP_USER}>`) => {
  const isGmailHost = /(^|\.)gmail\.com$/i.test(env.SMTP_HOST || "");

  if (isGmailHost) {
    const displayName =
      (env.SMTP_FROM || "").match(/^([^<]*)/)?.[1]?.trim() || "SrokYerng Booking";
    return `"${displayName}" <${env.SMTP_USER}>`;
  }

  return env.SMTP_FROM || fallbackFrom;
};

const getResendFrom = () => env.RESEND_FROM || "SrokYerng Booking <onboarding@resend.dev>";
const getSendGridFrom = () => env.SENDGRID_FROM || buildFromAddress("SrokYerng Booking <no-reply@sendgrid.com>");

/** Parse a "Name <email>" (or bare "email") string into { name, email }. */
const parseFromAddress = (from) => {
  const match = from.match(/^(?:"?([^"<]*)"?\s*<([^>]+)>|([^<>\s]+@[^<>\s]+))$/);
  return {
    name: (match?.[1] || match?.[3] || from).trim(),
    email: (match?.[2] || match?.[3] || from).trim(),
  };
};

const getBrevoFrom = () => {
  const from = env.BREVO_FROM || buildFromAddress("SrokYerng Booking <no-reply@srokyerng.com>");
  return parseFromAddress(from);
};

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

const sendViaSendGrid = async ({ to, subject, text, html }) => {
  // SendGrid wants the From split into name/email or "Name <email>" as one
  // string — it accepts a single string in personalizations. We parse the
  // display name + address from a standard "Name <email>" From value.
  const from = getSendGridFrom();
  const match = from.match(/^(?:"?([^"<]*)"?\s*<([^>]+)>|([^<>\s]+@[^<>\s]+))$/);
  const fromName = (match?.[1] || match?.[3] || from).trim();
  const fromEmail = (match?.[2] || match?.[3] || from).trim();

  const response = await fetch(SENDGRID_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail, name: fromName || undefined },
      subject,
      content: [
        { type: "text/plain", value: text },
        { type: "text/html", value: html },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `SendGrid API responded ${response.status}: ${String(body).slice(0, 300)}`
    );
  }

  return true;
};

const sendViaBrevo = async ({ to, subject, text, html }) => {
  const sender = getBrevoFrom();

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "api-key": env.BREVO_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Brevo API responded ${response.status}: ${String(body).slice(0, 300)}`
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
  // Prefer HTTPS APIs — outbound 443 is never blocked on Render, whereas SMTP
  // egress (port 587) can be black-holed. Chain: Brevo → SendGrid → Resend → SMTP.
  const provider = isBrevoConfigured()
    ? "brevo"
    : isSendGridConfigured()
      ? "sendgrid"
      : isResendConfigured()
        ? "resend"
        : "smtp";

  if (provider === "brevo") {
    await sendViaBrevo(payload);
  } else if (provider === "sendgrid") {
    await sendViaSendGrid(payload);
  } else if (provider === "resend") {
    await sendViaResend(payload);
  } else {
    await sendViaSmtp(payload);
  }

  return {
    skipped: false,
    provider,
  };
};

const sendEmailIfConfigured = async ({ to, subject, text, html }) => {
  if (
    !isBrevoConfigured() &&
    !isSendGridConfigured() &&
    !isResendConfigured() &&
    !isSmtpConfigured()
  ) {
    return {
      skipped: true,
      reason:
        "Email configuration is missing (set BREVO_API_KEY, SENDGRID_API_KEY, RESEND_API_KEY, or SMTP_*)",
    };
  }

  return sendEmail({ to, subject, text, html });
};

module.exports = {
  isSmtpConfigured,
  isResendConfigured,
  isSendGridConfigured,
  isBrevoConfigured,
  buildFromAddress,
  getResendFrom,
  getSendGridFrom,
  getBrevoFrom,
  sendEmail,
  sendEmailIfConfigured,
};
