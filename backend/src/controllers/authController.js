const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/email');

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, businessName } = req.body;
  const exists = await User.findOne({ email });
  if (exists) {
    res.status(400);
    throw new Error('User already exists');
  }
  const allowedRoles = ['buyer', 'seller'];
  const safeRole = allowedRoles.includes(role) ? role : 'buyer';

  const verifyToken = crypto.randomBytes(32).toString('hex');
  const verifyExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  const user = await User.create({
    name, email, password, role: safeRole, phone, businessName,
    emailVerifyToken: verifyToken,
    emailVerifyExpire: verifyExpire,
  });

  sendVerificationEmail(user, verifyToken).catch(() => {});

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
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
  if (!user.isActive) {
    res.status(403);
    throw new Error('Your account has been disabled. Please contact support.');
  }
  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    isVerified: user.isVerified,
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
    isVerified: updated.isVerified,
    token: generateToken(updated._id),
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) {
    res.status(400);
    throw new Error('Verification token is required');
  }
  const user = await User.findOne({
    emailVerifyToken: token,
    emailVerifyExpire: { $gt: new Date() },
  });
  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired verification token');
  }
  user.isVerified = true;
  user.emailVerifyToken = undefined;
  user.emailVerifyExpire = undefined;
  await user.save();
  res.json({ message: 'Email verified successfully. You can now log in.' });
});

const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user.isVerified) {
    res.status(400);
    throw new Error('Email is already verified');
  }
  const verifyToken = crypto.randomBytes(32).toString('hex');
  user.emailVerifyToken = verifyToken;
  user.emailVerifyExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();
  await sendVerificationEmail(user, verifyToken);
  res.json({ message: 'Verification email sent' });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  // Always return success to avoid user enumeration
  if (!user) {
    return res.json({ message: 'If that email exists, a reset link has been sent.' });
  }
  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000); // 1h
  await user.save();
  await sendPasswordResetEmail(user, resetToken);
  res.json({ message: 'If that email exists, a reset link has been sent.' });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password || password.length < 6) {
    res.status(400);
    throw new Error('Valid token and password (min 6 chars) are required');
  }
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpire: { $gt: new Date() },
  });
  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired reset token');
  }
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();
  res.json({ message: 'Password reset successfully. Please log in.' });
});

module.exports = { register, login, getMe, updateProfile, verifyEmail, resendVerification, forgotPassword, resetPassword };
