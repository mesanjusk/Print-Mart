const express = require('express');
const router = express.Router();
const { getAllUsers, toggleUserStatus } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, authorize('admin'), getAllUsers);
router.put('/:id/status', protect, authorize('admin'), toggleUserStatus);

module.exports = router;
