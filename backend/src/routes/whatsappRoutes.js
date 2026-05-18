const express = require('express');
const router = express.Router();
const { webhookVerify, webhookReceive } = require('../controllers/whatsappController');

// GET /api/whatsapp/webhook – Meta webhook verification (public)
router.get('/webhook', webhookVerify);

// POST /api/whatsapp/webhook – incoming messages from Meta (public)
router.post('/webhook', webhookReceive);

module.exports = router;
