const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const subscribe = asyncHandler(async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400);
    throw new Error('Invalid push subscription object');
  }

  await User.findByIdAndUpdate(req.user._id, {
    pushSubscription: { endpoint, keys },
    pushEnabled: true,
  });

  res.json({ message: 'Push subscription saved' });
});

const unsubscribe = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    pushSubscription: null,
    pushEnabled: false,
  });
  res.json({ message: 'Push subscription removed' });
});

module.exports = { subscribe, unsubscribe };
