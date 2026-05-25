const express = require('express');
const router = express.Router();
const { getAllUsers, toggleUserStatus, createAdmin, updateUserRole, togglePremium, getSellerPlanInfo, notifyInactiveSellers } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, authorize('admin'), getAllUsers);
router.post('/create-admin', protect, authorize('admin'), createAdmin);
router.get('/me/plan', protect, getSellerPlanInfo);
router.put('/:id/status', protect, authorize('admin'), toggleUserStatus);
router.put('/:id/role', protect, authorize('admin'), updateUserRole);
router.put('/:id/premium', protect, authorize('admin'), togglePremium);
router.post('/notify-inactive', protect, authorize('admin'), notifyInactiveSellers);

module.exports = router;
