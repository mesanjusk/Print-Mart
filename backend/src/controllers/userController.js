const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json(users);
});

const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  user.isActive = !user.isActive;
  await user.save();
  res.json({ message: `User ${user.isActive ? 'activated' : 'deactivated'}` });
});

// POST /api/users/create-admin  (admin only – promotes/creates another admin)
const createAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    res.status(400);
    throw new Error('name, email, and password are required');
  }
  const exists = await User.findOne({ email });
  if (exists) {
    exists.role = 'admin';
    await exists.save();
    return res.json({ message: `${exists.name} promoted to admin`, user: { _id: exists._id, email: exists.email, role: exists.role } });
  }
  const user = await User.create({ name, email, password, phone, role: 'admin' });
  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: generateToken(user._id),
  });
});

// PUT /api/users/:id/role  (admin/superadmin only)
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const validRoles = ['buyer', 'seller', 'admin', 'superadmin'];
  if (!validRoles.includes(role)) {
    res.status(400);
    throw new Error('role must be buyer, seller, admin, or superadmin');
  }
  // Only superadmin can assign/remove the superadmin role
  if (role === 'superadmin' && req.user.role !== 'superadmin') {
    res.status(403);
    throw new Error('Only a superadmin can assign the superadmin role');
  }
  const target = await User.findById(req.params.id);
  if (!target) { res.status(404); throw new Error('User not found'); }
  // Prevent demoting a superadmin unless requester is superadmin
  if (target.role === 'superadmin' && req.user.role !== 'superadmin') {
    res.status(403);
    throw new Error('Only a superadmin can change another superadmin\'s role');
  }
  target.role = role;
  await target.save();
  res.json(await User.findById(target._id).select('-password'));
});

const togglePremium = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404); throw new Error('User not found'); }
  if (user.role !== 'seller') { res.status(400); throw new Error('Premium plan is only for sellers'); }
  user.plan = user.plan === 'premium' ? 'free' : 'premium';
  if (user.plan === 'premium') user.planActivatedAt = new Date();
  await user.save();
  res.json({ message: `Seller plan set to ${user.plan}`, plan: user.plan });
});

const getSellerPlanInfo = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('plan planActivatedAt role');
  res.json({ plan: user.plan, planActivatedAt: user.planActivatedAt, role: user.role });
});

const notifyInactiveSellers = asyncHandler(async (req, res) => {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const inactiveSellers = await User.find({
    role: 'seller',
    pushEnabled: true,
    $or: [{ lastSeenAt: { $lt: cutoff } }, { lastSeenAt: null }],
  }).select('pushSubscription pushEnabled name');

  const { sendPushToMany } = require('../services/pushNotification');
  const Inquiry = require('../models/Inquiry');
  const recentCount = await Inquiry.countDocuments({ createdAt: { $gt: cutoff } });

  await sendPushToMany(inactiveSellers, {
    title: '👋 We miss you on PrintMart!',
    body: `${recentCount} new print orders came in. Check your leads!`,
    url: '/dashboard/inquiries',
    tag: 're-engage',
  }, (expiredId) => User.findByIdAndUpdate(expiredId, { pushEnabled: false }).catch(() => {}));

  res.json({ message: `Notified ${inactiveSellers.length} inactive sellers` });
});

module.exports = { getAllUsers, toggleUserStatus, createAdmin, updateUserRole, togglePremium, getSellerPlanInfo, notifyInactiveSellers };
