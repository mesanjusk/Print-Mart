const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const OTP = require('../models/OTP');
const generateToken = require('../utils/generateToken');
const { sendTextMessage } = require('../services/whatsapp');

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const hashOTP = (code) => crypto.createHash('sha256').update(code).digest('hex');

// POST /api/auth/send-otp
// Sends a WhatsApp OTP for registration or forgot-password
const sendOTP = asyncHandler(async (req, res) => {
  const { phone, email, purpose } = req.body;

  if (!purpose || !['registration', 'reset'].includes(purpose)) {
    res.status(400); throw new Error('Invalid purpose');
  }

  let targetPhone = phone;

  if (purpose === 'reset') {
    if (!email) { res.status(400); throw new Error('Email is required'); }
    const user = await User.findOne({ email: email.toLowerCase() });
    // Always succeed to avoid revealing account existence
    if (!user || !user.phone) {
      return res.json({ message: 'OTP sent to your WhatsApp if the account exists.' });
    }
    targetPhone = user.phone;
  } else {
    if (!phone) { res.status(400); throw new Error('Phone is required'); }
    const exists = await User.findOne({ phone });
    if (exists) { res.status(400); throw new Error('Phone number already registered'); }
  }

  const code = generateOTP();

  // Delete any existing OTP for this phone+purpose
  await OTP.deleteMany({ phone: targetPhone, purpose });

  await OTP.create({
    phone: targetPhone,
    code: hashOTP(code),
    purpose,
    email: purpose === 'reset' ? email?.toLowerCase() : undefined,
  });

  try {
    await sendTextMessage(
      targetPhone,
      `Your PrintMart ${purpose === 'registration' ? 'registration' : 'password reset'} OTP is:\n\n*${code}*\n\nValid for 10 minutes. Do not share this with anyone.`,
      null
    );
  } catch (err) {
    console.error('[WhatsApp] OTP send failed:', err.message);
    // For dev/testing — log OTP to console
    console.log(`[OTP] Code for ${targetPhone}: ${code}`);
  }

  res.json({ message: 'OTP sent to your WhatsApp.' });
});

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, businessName, otp } = req.body;

  if (!otp) { res.status(400); throw new Error('OTP is required'); }
  if (!phone) { res.status(400); throw new Error('Phone is required'); }

  const stored = await OTP.findOne({ phone, purpose: 'registration' });
  if (!stored || stored.code !== hashOTP(otp)) {
    res.status(400); throw new Error('Invalid or expired OTP');
  }

  const exists = await User.findOne({ email });
  if (exists) { res.status(400); throw new Error('User already exists'); }

  const allowedRoles = ['buyer', 'seller'];
  const safeRole = allowedRoles.includes(role) ? role : 'buyer';

  const user = await User.create({ name, email, password, role: safeRole, phone, businessName, isVerified: true });

  // Clean up OTP
  await OTP.deleteMany({ phone, purpose: 'registration' });

  // Welcome message
  try {
    await sendTextMessage(
      phone,
      `Welcome to PrintMart, ${name}! 🎉\n\nYour ${safeRole} account is ready.\n\nVisit your dashboard to get started.`,
      user._id
    );
  } catch (_) {}

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
    res.status(401); throw new Error('Invalid email or password');
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

// POST /api/auth/forgot-password — sends OTP via WhatsApp
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) { res.status(400); throw new Error('Email is required'); }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !user.phone) {
    return res.json({ message: 'OTP sent to your WhatsApp if the account exists.' });
  }

  const code = generateOTP();
  await OTP.deleteMany({ phone: user.phone, purpose: 'reset' });
  await OTP.create({ phone: user.phone, code: hashOTP(code), purpose: 'reset', email: user.email });

  try {
    await sendTextMessage(
      user.phone,
      `Your PrintMart password reset OTP is:\n\n*${code}*\n\nValid for 10 minutes. Do not share this with anyone.`,
      user._id
    );
  } catch (err) {
    console.error('[WhatsApp] Reset OTP send failed:', err.message);
    console.log(`[OTP] Reset code for ${user.phone}: ${code}`);
  }

  res.json({ message: 'OTP sent to your WhatsApp.' });
});

// PUT /api/auth/reset-password — verify OTP and set new password
const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, password } = req.body;

  if (!email || !otp || !password) {
    res.status(400); throw new Error('Email, OTP and new password are required');
  }
  if (password.length < 6) {
    res.status(400); throw new Error('Password must be at least 6 characters');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) { res.status(400); throw new Error('Invalid OTP or email'); }

  const stored = await OTP.findOne({ phone: user.phone, purpose: 'reset' });
  if (!stored || stored.code !== hashOTP(otp)) {
    res.status(400); throw new Error('Invalid or expired OTP');
  }

  user.password = password;
  await user.save();
  await OTP.deleteMany({ phone: user.phone, purpose: 'reset' });

  res.json({
    message: 'Password reset successfully',
    token: generateToken(user._id),
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});

module.exports = { sendOTP, register, login, getMe, updateProfile, forgotPassword, resetPassword };
