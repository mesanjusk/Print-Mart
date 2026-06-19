const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }
  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = await User.findById(decoded.id).select('-password');
  // Update lastSeenAt without blocking the request
  User.findByIdAndUpdate(decoded.id, { lastSeenAt: new Date() }).catch(() => {});
  if (!req.user) {
    res.status(401);
    throw new Error('User not found');
  }
  next();
});

const authorize = (...roles) => (req, res, next) => {
  // superadmin inherits all admin privileges automatically
  const effectiveRole = req.user.role === 'superadmin' && roles.includes('admin')
    ? 'admin'
    : req.user.role;
  if (!roles.includes(effectiveRole) && req.user.role !== 'superadmin') {
    res.status(403);
    throw new Error('Not authorized for this action');
  }
  next();
};

module.exports = { protect, authorize };
