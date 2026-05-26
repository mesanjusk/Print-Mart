const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, businessName } = req.body;
  const exists = await User.findOne({ email });
  if (exists) {
    res.status(400);
    throw new Error('User already exists');
  }
  const allowedRoles = ['buyer', 'seller'];
  const safeRole = allowedRoles.includes(role) ? role : 'buyer';
  const user = await User.create({ name, email, password, role: safeRole, phone, businessName });
  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: generateToken(user._id),
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }
  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    token: generateToken(user._id),
  });
});

const getMe = asyncHandler(async (req, res) => {
  res.json(req.user);
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const { name, phone, businessName, gstin, address } = req.body;
  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (businessName) user.businessName = businessName;
  if (gstin) user.gstin = gstin;
  if (address) user.address = address;
  if (req.body.password) user.password = req.body.password;
  const updated = await user.save();
  res.json({
    _id: updated._id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    token: generateToken(updated._id),
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) { res.status(400); throw new Error('Email is required'); }

  const user = await User.findOne({ email: email.toLowerCase() });
  // Always return success to avoid revealing whether email exists
  if (!user) {
    return res.json({ message: 'If that email exists, a reset link has been sent.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save({ validateBeforeSave: false });

  const clientUrl = process.env.CLIENT_URL?.split(',')[0]?.trim() || 'http://localhost:5173';
  const resetUrl = `${clientUrl}/reset-password/${token}`;

  // Send email if configured
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: Number(process.env.EMAIL_PORT) || 587,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });
      await transporter.sendMail({
        from: `"PrintMart" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'PrintMart — Reset Your Password',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto">
            <h2 style="color:#16a34a">Reset Your Password</h2>
            <p>Hi ${user.name},</p>
            <p>Click the button below to reset your password. This link expires in 1 hour.</p>
            <a href="${resetUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin:16px 0">
              Reset Password
            </a>
            <p style="color:#6b7280;font-size:13px">Or copy this link: ${resetUrl}</p>
            <p style="color:#6b7280;font-size:13px">If you didn't request this, ignore this email.</p>
          </div>
        `,
      });
    } catch (err) {
      console.error('[Email] Failed to send reset email:', err.message);
      // Don't fail the request — the token is still saved
    }
  } else {
    // No email configured — log the link so admin can find it
    console.log(`[ForgotPassword] Reset link for ${user.email}: ${resetUrl}`);
  }

  res.json({ message: 'If that email exists, a reset link has been sent.' });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password || password.length < 6) {
    res.status(400); throw new Error('Password must be at least 6 characters');
  }

  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400); throw new Error('Reset link is invalid or has expired');
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({
    message: 'Password reset successfully',
    token: generateToken(user._id),
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});

module.exports = { register, login, getMe, updateProfile, forgotPassword, resetPassword };
