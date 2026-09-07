/**
 * Quick email-send test — sends a real email through whatever provider is
 * configured (SendGrid → Resend → SMTP).
 *
 * Usage:  node scripts/test-email.js you@example.com
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const emailService = require("../src/services/email.service");

const to = process.argv[2];
if (!to) {
  console.error("Usage: node scripts/test-email.js you@example.com");
  process.exit(1);
}

(async () => {
  console.log("[test-email] provider detection:");
  console.log("  sendgrid:", emailService.isSendGridConfigured());
  console.log("  resend:  ", emailService.isResendConfigured());
  console.log("  smtp:    ", emailService.isSmtpConfigured());
  console.log("  from:    ", emailService.getSendGridFrom());
  console.log(`\nSending test email to ${to} ...`);

  try {
    const result = await emailService.sendEmailIfConfigured({
      to,
      subject: "SrokYerng Booking — test email",
      text: "This is a test email from SrokYerng Booking. If you received it, email sending works!",
      html: "<p>This is a test email from <b>SrokYerng Booking</b>. If you received it, email sending works!</p>",
    });
    console.log("\nResult:", JSON.stringify(result, null, 2));
    if (result.skipped) {
      console.warn("\n⚠ Email was NOT sent because no provider is configured.");
    } else {
      console.log(`\n✅ Sent via ${result.provider} — check the inbox (and Spam).`);
    }
  } catch (err) {
    console.error("\n❌ Send failed:", err.message);
    process.exitCode = 1;
  }
})();