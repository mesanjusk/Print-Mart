const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/email');
const wa = require('../services/whatsapp');

const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

const dispatchVerification = async (user, emailToken, otp) => {
  const promises = [sendVerificationEmail(user, emailToken).catch(() => {})];
  if (user.phone) promises.push(wa.sendVerificationOTP(user.phone, otp, user._id).catch(() => {}));
  await Promise.allSettled(promises);
};

const dispatchPasswordReset = async (user, emailToken, otp) => {
  const promises = [sendPasswordResetEmail(user, emailToken).catch(() => {})];
  if (user.phone) promises.push(wa.sendPasswordResetOTP(user.phone, otp, user._id).catch(() => {}));
  await Promise.allSettled(promises);
};

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, businessName } = req.body;

  if (!phone) { res.status(400); throw new Error('Mobile number is required'); }

  const normalizedPhone = phone.replace(/\D/g, '');
  if (await User.findOne({ phone: normalizedPhone })) {
    res.status(400); throw new Error('Mobile number already registered');
  }
  if (email && await User.findOne({ email: email.toLowerCase() })) {
    res.status(400); throw new Error('Email already registered');
  }

  const allowedRoles = ['buyer', 'seller'];
  const safeRole = allowedRoles.includes(role) ? role : 'buyer';

  const user = await User.create({
    name,
    email: email ? email.toLowerCase() : undefined,
    password,
    role: safeRole,
    phone: normalizedPhone,
    businessName,
    isVerified: true,
  });

  if (email) {
    const emailToken = crypto.randomBytes(32).toString('hex');
    const otp = generateOTP();
    user.emailVerifyToken = emailToken;
    user.emailVerifyExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
    user.otpCode = otp;
    user.otpPurpose = 'verify_email';
    user.otpExpire = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    dispatchVerification(user, emailToken, otp);
  }

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isVerified: user.isVerified,
    token: generateToken(user._id),
    message: 'Account created successfully.',
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { phone, email, password } = req.body;

  let user;
  if (phone) {
    const normalizedPhone = phone.replace(/\D/g, '');
    const last10 = normalizedPhone.slice(-10);
    user = await User.findOne({ phone: { $regex: last10 } });
  } else if (email) {
    user = await User.findOne({ email: email.toLowerCase() });
  }

  if (!user || !(await user.matchPassword(password))) {
    res.status(401); throw new Error('Invalid mobile number or password');
  }
  if (!user.isActive) {
    res.status(403); throw new Error('Your account has been disabled. Contact support.');
  }

  user.lastSeenAt = new Date();
  await user.save();

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    plan: user.plan,
    isVerified: user.isVerified,
    avatar: user.avatar,
    businessName: user.businessName,
    phone: user.phone,
    token: generateToken(user._id),
  });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  res.json(user);
});

// PUT /api/auth/profile
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const { name, phone, businessName, gstin, address, avatar, morningDigestOptIn } = req.body;

  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (businessName !== undefined) user.businessName = businessName;
  if (gstin !== undefined) user.gstin = gstin;
  if (address) user.address = { ...user.address, ...address };
  if (avatar !== undefined) user.avatar = avatar;
  if (morningDigestOptIn !== undefined) user.morningDigestOptIn = morningDigestOptIn;

  const updated = await user.save();
  res.json({
    _id: updated._id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    plan: updated.plan,
    isVerified: updated.isVerified,
    token: generateToken(updated._id),
  });
});

// GET /api/auth/verify-email?token=
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

  res.json({ message: 'Email verified successfully' });
});

// POST /api/auth/verify-otp  { otp, purpose }
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

  res.json({ message: 'OTP verified', userId: user._id });
});

// POST /api/auth/resend-verification (protected)
const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user.isVerified) { res.status(400); throw new Error('Account already verified'); }

  const emailToken = crypto.randomBytes(32).toString('hex');
  const otp = generateOTP();
  user.emailVerifyToken = emailToken;
  user.emailVerifyExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
  user.otpCode = otp;
  user.otpPurpose = 'verify_email';
  user.otpExpire = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  dispatchVerification(user, emailToken, otp);
  res.json({ message: 'Verification resent via email and WhatsApp' });
});

// POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const { phone, email } = req.body;
  if (!phone && !email) { res.status(400); throw new Error('Mobile number is required'); }

  let user;
  if (phone) {
    user = await User.findOne({ phone: phone.replace(/\D/g, '') });
  } else {
    user = await User.findOne({ email: email.toLowerCase() });
  }
  if (!user) return res.json({ message: 'If this number exists, a reset OTP has been sent.' });

  const emailToken = crypto.randomBytes(32).toString('hex');
  const otp = generateOTP();
  user.resetPasswordToken = emailToken;
  user.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000); // 1h
  user.otpCode = otp;
  user.otpPurpose = 'reset_password';
  user.otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  await user.save();

  dispatchPasswordReset(user, emailToken, otp);

  res.json({
    message: 'Reset link and OTP sent',
    hasWhatsApp: !!user.phone,
  });
});

// POST /api/auth/reset-password  (email link flow)
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) { res.status(400); throw new Error('Token and password are required'); }
  if (password.length < 6) { res.status(400); throw new Error('Password must be at least 6 characters'); }

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

// POST /api/auth/reset-password-otp  (WhatsApp OTP flow)
const resetPasswordWithOTP = asyncHandler(async (req, res) => {
  const { userId, otp, password } = req.body;
  if (!userId || !otp || !password) { res.status(400); throw new Error('userId, OTP and password are required'); }
  if (password.length < 6) { res.status(400); throw new Error('Password must be at least 6 characters'); }

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
