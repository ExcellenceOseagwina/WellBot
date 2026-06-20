const nodemailer = require("nodemailer");

const APP_NAME = "Wellspring Student Assistant";
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:5000";
const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@wellspring.edu";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  }

  return transporter;
}

async function sendEmail({ to, subject, html, text }) {
  const mail = {
    from: EMAIL_FROM,
    to,
    subject,
    html,
    text
  };

  const transport = getTransporter();

  if (!transport) {
    console.log("\n--- Email (dev mode - SMTP not configured) ---");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text || html);
    console.log("---\n");
    return { dev: true };
  }

  return transport.sendMail(mail);
}

async function sendVerificationEmail(email, token) {
  const link = `${APP_BASE_URL}/verify-email.html?token=${token}`;

  return sendEmail({
    to: email,
    subject: `Verify your ${APP_NAME} account`,
    text: `Welcome to ${APP_NAME}!\n\nPlease verify your email by visiting:\n${link}\n\nThis link expires in 24 hours.`,
    html: `
      <h2>Welcome to ${APP_NAME}</h2>
      <p>Please verify your email address to activate your account.</p>
      <p><a href="${link}">Verify my email</a></p>
      <p>Or copy this link into your browser:</p>
      <p>${link}</p>
      <p>This link expires in 24 hours.</p>
    `
  });
}

async function sendPasswordResetEmail(email, token) {
  const link = `${APP_BASE_URL}/reset-password.html?token=${token}`;

  return sendEmail({
    to: email,
    subject: `Reset your ${APP_NAME} password`,
    text: `You requested a password reset for ${APP_NAME}.\n\nReset your password by visiting:\n${link}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.`,
    html: `
      <h2>Password reset</h2>
      <p>You requested a password reset for your ${APP_NAME} account.</p>
      <p><a href="${link}">Reset my password</a></p>
      <p>Or copy this link into your browser:</p>
      <p>${link}</p>
      <p>This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>
    `
  });
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};
