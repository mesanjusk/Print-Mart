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
    // Promote existing user to admin
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

// PUT /api/users/:id/role  (admin only – change any user's role)
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['buyer', 'seller', 'admin'].includes(role)) {
    res.status(400);
    throw new Error('role must be buyer, seller, or admin');
  }
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
  if (!user) { res.status(404); throw new Error('User not found'); }
  res.json(user);
});

module.exports = { getAllUsers, toggleUserStatus, createAdmin, updateUserRole };
