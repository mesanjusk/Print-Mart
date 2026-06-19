const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/email');
const wa = require('../services/whatsapp');

// Generate a 6-digit OTP
const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

// Send via both email (link) and WhatsApp (OTP) — whichever is configured
const dispatchVerification = async (user, emailToken, otp) => {
  const promises = [];
  promises.push(sendVerificationEmail(user, emailToken).catch(() => {}));
  if (user.phone) {
    promises.push(wa.sendVerificationOTP(user.phone, otp, user._id).catch(() => {}));
  }
  await Promise.allSettled(promises);
};

const dispatchPasswordReset = async (user, emailToken, otp) => {
  const promises = [];
  promises.push(sendPasswordResetEmail(user, emailToken).catch(() => {}));
  if (user.phone) {
    promises.push(wa.sendPasswordResetOTP(user.phone, otp, user._id).catch(() => {}));
  }
  await Promise.allSettled(promises);
};

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, businessName } = req.body;
  const exists = await User.findOne({ email });
  if (exists) {
    res.status(400);
    throw new Error('User already exists');
  }
  const allowedRoles = ['buyer', 'seller'];
  const safeRole = allowedRoles.includes(role) ? role : 'buyer';

  const emailToken = crypto.randomBytes(32).toString('hex');
  const otp = generateOTP();
  const expire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  const user = await User.create({
    name, email, password, role: safeRole, phone, businessName,
    emailVerifyToken: emailToken,
    emailVerifyExpire: expire,
    otpCode: otp,
    otpPurpose: 'verify_email',
    otpExpire: new Date(Date.now() + 10 * 60 * 1000), // 10 min for OTP
  });

  dispatchVerification(user, emailToken, otp);

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    token: generateToken(user._id),
    message: phone
      ? 'Account created. Check your email for a verification link or WhatsApp for an OTP.'
      : 'Account created. Check your email for a verification link.',
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

// Verify via email link
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) { res.status(400); throw new Error('Token is required'); }
  const user = await User.findOne({
    emailVerifyToken: token,
    emailVerifyExpire: { $gt: new Date() },
  });
  if (!user) { res.status(400); throw new Error('Invalid or expired verification link'); }
  user.isVerified = true;
  user.emailVerifyToken = undefined;
  user.emailVerifyExpire = undefined;
  user.otpCode = undefined;
  user.otpPurpose = undefined;
  user.otpExpire = undefined;
  await user.save();
  res.json({ message: 'Email verified successfully. You can now log in.' });
});

// Verify via WhatsApp OTP
const verifyOTP = asyncHandler(async (req, res) => {
  const { otp, purpose } = req.body;
  if (!otp || !purpose) { res.status(400); throw new Error('OTP and purpose are required'); }

  const user = await User.findOne({
    otpCode: otp,
    otpPurpose: purpose,
    otpExpire: { $gt: new Date() },
  });
  if (!user) { res.status(400); throw new Error('Invalid or expired OTP'); }

  if (purpose === 'verify_email') {
    user.isVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpire = undefined;
  }

  user.otpCode = undefined;
  user.otpPurpose = undefined;
  user.otpExpire = undefined;
  await user.save();

  res.json({
    message: purpose === 'verify_email'
      ? 'Account verified successfully.'
      : 'OTP verified. You may now set a new password.',
    userId: user._id,
  });
});

const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user.isVerified) { res.status(400); throw new Error('Email is already verified'); }
  const emailToken = crypto.randomBytes(32).toString('hex');
  const otp = generateOTP();
  user.emailVerifyToken = emailToken;
  user.emailVerifyExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
  user.otpCode = otp;
  user.otpPurpose = 'verify_email';
  user.otpExpire = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();
  await dispatchVerification(user, emailToken, otp);
  res.json({
    message: user.phone
      ? 'Verification email and WhatsApp OTP sent.'
      : 'Verification email sent.',
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const successMsg = 'If that account exists, a reset link/OTP has been sent.';
  const user = await User.findOne({ email });
  if (!user) return res.json({ message: successMsg });

  const emailToken = crypto.randomBytes(32).toString('hex');
  const otp = generateOTP();
  user.resetPasswordToken = emailToken;
  user.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000); // 1h
  user.otpCode = otp;
  user.otpPurpose = 'reset_password';
  user.otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  await user.save();

  await dispatchPasswordReset(user, emailToken, otp);
  res.json({ message: successMsg, hasWhatsApp: !!user.phone });
});

// Reset via email link token
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
  if (!user) { res.status(400); throw new Error('Invalid or expired reset link'); }
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  user.otpCode = undefined;
  user.otpPurpose = undefined;
  user.otpExpire = undefined;
  await user.save();
  res.json({ message: 'Password reset successfully. Please log in.' });
});

// Reset password using WhatsApp OTP (two-step: verify OTP first, then set password)
const resetPasswordWithOTP = asyncHandler(async (req, res) => {
  const { userId, otp, password } = req.body;
  if (!userId || !otp || !password || password.length < 6) {
    res.status(400);
    throw new Error('userId, otp, and new password (min 6 chars) are required');
  }
  const user = await User.findOne({
    _id: userId,
    otpCode: otp,
    otpPurpose: 'reset_password',
    otpExpire: { $gt: new Date() },
  });
  if (!user) { res.status(400); throw new Error('Invalid or expired OTP'); }
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  user.otpCode = undefined;
  user.otpPurpose = undefined;
  user.otpExpire = undefined;
  await user.save();
  res.json({ message: 'Password reset successfully. Please log in.' });
});

module.exports = {
  register, login, getMe, updateProfile,
  verifyEmail, verifyOTP, resendVerification,
  forgotPassword, resetPassword, resetPasswordWithOTP,
};
