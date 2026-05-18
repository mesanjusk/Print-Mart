const express = require('express');
const router = express.Router();
const { subscribe, unsubscribe } = require('../controllers/pushController');
const { protect } = require('../middleware/authMiddleware');

router.post('/subscribe', protect, subscribe);
router.post('/unsubscribe', protect, unsubscribe);

module.exports = router;
