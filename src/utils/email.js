const emailService = require("../services/email.service");

const getHtmlTemplate = (title, contentHtml) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #f9fafb; padding: 40px 0; }
    .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden; }
    .header { padding: 32px 40px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #f3f4f6; }
    .logo { margin: 0; font-size: 24px; font-weight: 900; color: #1268b4; letter-spacing: -0.5px; }
    .body-content { padding: 40px; color: #374151; font-size: 16px; line-height: 1.6; }
    h1 { color: #111827; font-size: 24px; font-weight: 800; margin-top: 0; margin-bottom: 24px; }
    p { margin-top: 0; margin-bottom: 16px; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background-color: #1268b4; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 16px; text-align: center; }
    .muted { color: #6b7280; font-size: 14px; }
    .footer { text-align: center; padding: 32px 20px; color: #9ca3af; font-size: 14px; }
    .link { color: #1268b4; word-break: break-all; }
  </style>
</head>
<body>
  <div class="wrapper">
    <table class="main" width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td class="header">
          <h2 class="logo">SrokYerng</h2>
        </td>
      </tr>
      <tr>
        <td class="body-content">
          ${contentHtml}
        </td>
      </tr>
    </table>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} SrokYerng Booking. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

const sendPasswordResetEmail = async ({ to, fullName, resetUrl }) => {
  const content = `
    <h1>Reset Your Password</h1>
    <p>Hello ${fullName},</p>
    <p>We received a request to reset your password for your SrokYerng Booking account. Click the button below to choose a new password.</p>
    <div class="btn-container">
      <a href="${resetUrl}" class="btn">Reset Password</a>
    </div>
    <p class="muted">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email and your password will remain unchanged.</p>
    <p class="muted" style="margin-top: 24px; font-size: 13px;">If the button doesn't work, copy and paste this URL into your browser:<br>
    <a href="${resetUrl}" class="link">${resetUrl}</a></p>
  `;

  await emailService.sendEmail({
    to,
    subject: "Reset your SrokYerng Booking password",
    text: [
      `Hello ${fullName},`,
      "",
      "Use this link to reset your password:",
      resetUrl,
      "",
      "This link expires in 1 hour. If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: getHtmlTemplate("Reset your password", content),
  });
};

const sendEmailVerificationEmail = async ({ to, fullName, verificationUrl }) => {
  const content = `
    <h1>Verify Your Email</h1>
    <p>Hello ${fullName},</p>
    <p>Welcome to SrokYerng Booking! Please verify your email address to get full access to all features and complete your registration.</p>
    <div class="btn-container">
      <a href="${verificationUrl}" class="btn">Verify Email Address</a>
    </div>
    <p class="muted">This link expires in 24 hours. If you didn't create an account with us, please ignore this email.</p>
    <p class="muted" style="margin-top: 24px; font-size: 13px;">If the button doesn't work, copy and paste this URL into your browser:<br>
    <a href="${verificationUrl}" class="link">${verificationUrl}</a></p>
  `;

  await emailService.sendEmail({
    to,
    subject: "Verify your SrokYerng Booking email",
    text: [
      `Hello ${fullName},`,
      "",
      "Use this link to verify your email address:",
      verificationUrl,
      "",
      "This link expires in 24 hours. If you did not create this account, you can ignore this email.",
    ].join("\n"),
    html: getHtmlTemplate("Verify your email", content),
  });
};

module.exports = {
  getHtmlTemplate,
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
};
