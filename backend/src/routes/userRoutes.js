const express = require('express');
const router = express.Router();
const { getAllUsers, toggleUserStatus, createAdmin, updateUserRole } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, authorize('admin'), getAllUsers);
router.post('/create-admin', protect, authorize('admin'), createAdmin);
router.put('/:id/status', protect, authorize('admin'), toggleUserStatus);
router.put('/:id/role', protect, authorize('admin'), updateUserRole);

module.exports = router;
