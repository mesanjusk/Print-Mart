const express = require('express');
const router = express.Router();
const {
  createInquiry, getBuyerInquiries, getSellerInquiries,
  acceptInquiry, replyInquiry, closeInquiry,
} = require('../controllers/inquiryController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, createInquiry);
router.get('/buyer', protect, getBuyerInquiries);
router.get('/seller', protect, authorize('seller', 'admin'), getSellerInquiries);
router.put('/:id/accept', protect, authorize('seller', 'admin'), acceptInquiry);
router.post('/:id/reply', protect, replyInquiry);
router.put('/:id/close', protect, authorize('seller', 'admin'), closeInquiry);

module.exports = router;
