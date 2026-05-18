const express = require('express');
const router = express.Router();
const { getAllUsers, toggleUserStatus, togglePremium, getSellerPlanInfo } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, authorize('admin'), getAllUsers);
router.put('/:id/status', protect, authorize('admin'), toggleUserStatus);
router.put('/:id/premium', protect, authorize('admin'), togglePremium);
router.get('/me/plan', protect, getSellerPlanInfo);

module.exports = router;
