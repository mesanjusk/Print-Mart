const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getStats, getLogs,
  getConversations, getConversationByPhone, replyToConversation,
  getSessions, sendBroadcast, sendDirectMessage,
  getCampaigns, createCampaign, updateCampaign, deleteCampaign, runCampaign,
  getOptOuts, addOptOut, removeOptOut,
  getWindowStatus, getTemplates, syncTemplatesFromMeta,
  getBotConfig, updateBotConfig,
  resetSession, deleteSession, testBotCommand,
} = require('../controllers/whatsappAdminController');

const adminOnly = [protect, authorize('admin')];

// Analytics & logs
router.get('/stats', ...adminOnly, getStats);
router.get('/logs', ...adminOnly, getLogs);

// Conversations / inbox
router.get('/conversations', ...adminOnly, getConversations);
router.get('/conversation/:phone', ...adminOnly, getConversationByPhone);
router.post('/conversation/:phone/reply', ...adminOnly, replyToConversation);

// Sessions
router.get('/sessions', ...adminOnly, getSessions);
router.post('/sessions/:phone/reset', ...adminOnly, resetSession);
router.delete('/sessions/:phone', ...adminOnly, deleteSession);

// Direct & broadcast
router.post('/broadcast', ...adminOnly, sendBroadcast);
router.post('/send', ...adminOnly, sendDirectMessage);

// Campaigns
router.get('/campaigns', ...adminOnly, getCampaigns);
router.post('/campaigns', ...adminOnly, createCampaign);
router.put('/campaigns/:id', ...adminOnly, updateCampaign);
router.delete('/campaigns/:id', ...adminOnly, deleteCampaign);
router.post('/campaigns/:id/run', ...adminOnly, runCampaign);

// Opt-outs
router.get('/optouts', ...adminOnly, getOptOuts);
router.post('/optouts', ...adminOnly, addOptOut);
router.delete('/optouts/:id', ...adminOnly, removeOptOut);

// 24h window
router.get('/window-status', ...adminOnly, getWindowStatus);

// Templates
router.get('/templates', ...adminOnly, getTemplates);
router.post('/templates/sync', ...adminOnly, syncTemplatesFromMeta);

// Bot config
router.get('/bot-config', ...adminOnly, getBotConfig);
router.put('/bot-config', ...adminOnly, updateBotConfig);

// Bot tester
router.post('/bot-test', ...adminOnly, testBotCommand);

module.exports = router;
