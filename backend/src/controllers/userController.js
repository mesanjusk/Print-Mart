const asyncHandler = require('express-async-handler');
const User = require('../models/User');

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

const togglePremium = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (user.role !== 'seller') {
    res.status(400);
    throw new Error('Premium plan is only for sellers');
  }
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
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const inactiveSellers = await User.find({
    role: 'seller',
    pushEnabled: true,
    $or: [
      { lastSeenAt: { $lt: cutoff } },
      { lastSeenAt: null },
    ],
  }).select('pushSubscription pushEnabled name');

  const { sendPushToMany } = require('../services/pushNotification');
  const Inquiry = require('../models/Inquiry');

  // Count total new inquiries in last 7 days across all sellers
  const recentCount = await Inquiry.countDocuments({ createdAt: { $gt: cutoff } });

  await sendPushToMany(inactiveSellers, {
    title: '👋 We miss you on PrintMart!',
    body: `${recentCount} new print orders came in. Check your leads!`,
    url: '/dashboard/inquiries',
    tag: 're-engage',
  }, (expiredId) => User.findByIdAndUpdate(expiredId, { pushEnabled: false }).catch(() => {}));

  res.json({ message: `Notified ${inactiveSellers.length} inactive sellers` });
});

module.exports = { getAllUsers, toggleUserStatus, togglePremium, getSellerPlanInfo, notifyInactiveSellers };
