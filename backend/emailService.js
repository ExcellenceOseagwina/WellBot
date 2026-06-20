const nodemailer = require("nodemailer");

const APP_NAME = "Wellspring Student Assistant";
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:5000";
const IS_PRODUCTION = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

let transporter = null;

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function emailFromAddress() {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  if (process.env.SMTP_USER) return `${APP_NAME} <${process.env.SMTP_USER}>`;
  return "noreply@wellspring.edu";
}

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

async function sendEmail({ to, subject, html, text, link }) {
  const mail = {
    from: emailFromAddress(),
    to,
    subject,
    html,
    text
  };

  const transport = getTransporter();

  if (!transport) {
    if (IS_PRODUCTION) return { dev: true, link };

    console.log("\n--- Email (dev mode - SMTP not configured) ---");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text || html);
    console.log("---\n");
    return { dev: true, link };
  }

  await transport.sendMail(mail);
  return { dev: false };
}

async function sendVerificationEmail(email, token) {
  const link = `${APP_BASE_URL}/verify-email.html?token=${token}`;

  return sendEmail({
    to: email,
    subject: `Verify your ${APP_NAME} account`,
    link,
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
    link,
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
  isSmtpConfigured,
  sendVerificationEmail,
  sendPasswordResetEmail
};
