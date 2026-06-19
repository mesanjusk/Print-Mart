const nodemailer = require('nodemailer');

const createTransport = () =>
  nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[Email] Credentials not configured — skipping send.');
    return null;
  }
  const transporter = createTransport();
  return transporter.sendMail({
    from: `"PrintMart" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

const sendVerificationEmail = async (user, token) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const url = `${clientUrl}/verify-email?token=${token}`;
  return sendEmail({
    to: user.email,
    subject: 'Verify your PrintMart account',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>Welcome to PrintMart, ${user.name}!</h2>
        <p>Click the button below to verify your email address. This link expires in 24 hours.</p>
        <a href="${url}" style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold">
          Verify Email
        </a>
        <p style="margin-top:16px;color:#6b7280;font-size:13px">Or copy this link: ${url}</p>
      </div>
    `,
  });
};

const sendPasswordResetEmail = async (user, token) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const url = `${clientUrl}/reset-password?token=${token}`;
  return sendEmail({
    to: user.email,
    subject: 'Reset your PrintMart password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>Password Reset Request</h2>
        <p>Hi ${user.name}, click below to reset your password. This link expires in 1 hour.</p>
        <a href="${url}" style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold">
          Reset Password
        </a>
        <p style="margin-top:16px;color:#6b7280;font-size:13px">If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });
};

module.exports = { sendEmail, sendVerificationEmail, sendPasswordResetEmail };
