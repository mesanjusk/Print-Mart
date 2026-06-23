const express = require('express');
const router = express.Router();
const {
  register, login, getMe, updateProfile,
  verifyEmail, verifyOTP, resendVerification,
  forgotPassword, resetPassword, resetPasswordWithOTP,
  magicLogin,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

// Email link verification
router.get('/verify-email', verifyEmail);
// WhatsApp OTP verification
router.post('/verify-otp', verifyOTP);
router.post('/resend-verification', protect, resendVerification);

// Password reset — email link flow
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
// Password reset — WhatsApp OTP flow
router.post('/reset-password-otp', resetPasswordWithOTP);
// Magic link login (WhatsApp one-time link)
router.get('/magic-login', magicLogin);

module.exports = router;
