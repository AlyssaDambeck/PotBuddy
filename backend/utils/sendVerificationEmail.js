const { Resend } = require("resend");

async function sendVerificationEmail(email, token) {
  if (!process.env.RESEND_SECRET) {
    throw new Error("RESEND_SECRET is not configured");
  }

  const appUrl = process.env.APP_URL || "http://localhost:5000";

  const verificationUrl =
    `${appUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

  let emailFrom = process.env.EMAIL_FROM;

  if (!emailFrom) {
    emailFrom = "PotBuddy <onboarding@resend.dev>";
  }

  const resend = new Resend(process.env.RESEND_SECRET);

  const result = await resend.emails.send({
    from: emailFrom,
    to: email,
    subject: "Verify your PotBuddy email",
    text: `Verify your PotBuddy account: ${verificationUrl}`,
    html: `
      <h1>Welcome to PotBuddy!</h1>
      <p>Click the link below to verify your email address.</p>
      <p><a href="${verificationUrl}">Verify email</a></p>
      <p>This link expires in one hour.</p>
    `,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data;
}

module.exports = sendVerificationEmail;
