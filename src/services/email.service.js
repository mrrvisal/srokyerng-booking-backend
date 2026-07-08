const nodemailer = require("nodemailer");
const env = require("../config/env");

let transporter;

const isSmtpConfigured = () => {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD && env.SMTP_FROM);
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
    });
  }

  return transporter;
};

const sendEmail = async ({ to, subject, text, html }) => {
  await getTransporter().sendMail({
    from: env.SMTP_FROM,
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
  sendEmail,
  sendEmailIfConfigured,
};
