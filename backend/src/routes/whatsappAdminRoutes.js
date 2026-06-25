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
  getBotCommands, createBotCommand, updateBotCommand, deleteBotCommand, reorderBotCommands,
} = require('../controllers/whatsappAdminController');

const adminOnly = [protect, authorize('admin')];

router.get('/stats', ...adminOnly, getStats);
router.get('/logs', ...adminOnly, getLogs);
router.get('/conversations', ...adminOnly, getConversations);
router.get('/conversation/:phone', ...adminOnly, getConversationByPhone);
router.post('/conversation/:phone/reply', ...adminOnly, replyToConversation);
router.get('/sessions', ...adminOnly, getSessions);
router.post('/broadcast', ...adminOnly, sendBroadcast);
router.post('/send', ...adminOnly, sendDirectMessage);
router.get('/campaigns', ...adminOnly, getCampaigns);
router.post('/campaigns', ...adminOnly, createCampaign);
router.put('/campaigns/:id', ...adminOnly, updateCampaign);
router.delete('/campaigns/:id', ...adminOnly, deleteCampaign);
router.post('/campaigns/:id/run', ...adminOnly, runCampaign);
router.get('/optouts', ...adminOnly, getOptOuts);
router.post('/optouts', ...adminOnly, addOptOut);
router.delete('/optouts/:id', ...adminOnly, removeOptOut);
router.get('/window-status', ...adminOnly, getWindowStatus);
router.get('/templates', ...adminOnly, getTemplates);
router.post('/templates/sync', ...adminOnly, syncTemplatesFromMeta);

// Bot flow builder
router.get('/bot-commands', ...adminOnly, getBotCommands);
router.post('/bot-commands', ...adminOnly, createBotCommand);
router.put('/bot-commands/reorder', ...adminOnly, reorderBotCommands);
router.put('/bot-commands/:id', ...adminOnly, updateBotCommand);
router.delete('/bot-commands/:id', ...adminOnly, deleteBotCommand);

module.exports = router;
