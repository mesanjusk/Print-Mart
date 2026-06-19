const express = require('express');
const router = express.Router();
const {
  register, login, getMe, updateProfile,
  verifyEmail, resendVerification,
  forgotPassword, resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

// Email verification
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', protect, resendVerification);

// Password reset
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
