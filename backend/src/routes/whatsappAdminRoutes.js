const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getStats,
  getLogs,
  getConversations,
  getConversationByPhone,
  sendBroadcast,
  sendDirectMessage,
  getSessions,
} = require('../controllers/whatsappAdminController');

const adminOnly = [protect, authorize('admin')];

router.get('/stats', ...adminOnly, getStats);
router.get('/logs', ...adminOnly, getLogs);
router.get('/conversations', ...adminOnly, getConversations);
router.get('/conversation/:phone', ...adminOnly, getConversationByPhone);
router.get('/sessions', ...adminOnly, getSessions);
router.post('/broadcast', ...adminOnly, sendBroadcast);
router.post('/send', ...adminOnly, sendDirectMessage);

module.exports = router;
