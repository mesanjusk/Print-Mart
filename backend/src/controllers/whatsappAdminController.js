const asyncHandler = require('express-async-handler');
const WhatsAppLog = require('../models/WhatsAppLog');
const WhatsAppSession = require('../models/WhatsAppSession');
const Order = require('../models/Order');
const User = require('../models/User');
const wa = require('../services/whatsapp');

// GET /api/admin/whatsapp/stats
const getStats = asyncHandler(async (req, res) => {
  const [totalLogs, inbound, outbound, activeSessions, waOrders, totalOrders] = await Promise.all([
    WhatsAppLog.countDocuments(),
    WhatsAppLog.countDocuments({ direction: 'inbound' }),
    WhatsAppLog.countDocuments({ direction: 'outbound' }),
    WhatsAppSession.countDocuments({ lastActivity: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
    Order.countDocuments({ createdViaWhatsapp: true }),
    Order.countDocuments(),
  ]);

  // Messages per day (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const dailyMessages = await WhatsAppLog.aggregate([
    { $match: { createdAt: { $gte: sevenDaysAgo } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    totalMessages: totalLogs,
    inboundMessages: inbound,
    outboundMessages: outbound,
    activeSessionsLast7Days: activeSessions,
    ordersViaWhatsapp: waOrders,
    totalOrders,
    waConversionRate: totalOrders ? ((waOrders / totalOrders) * 100).toFixed(1) : 0,
    dailyMessages,
    config: {
      phoneIdConfigured: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
      accessTokenConfigured: !!process.env.WHATSAPP_ACCESS_TOKEN,
      verifyTokenConfigured: !!process.env.WHATSAPP_VERIFY_TOKEN,
      webhookUrl: `${process.env.CLIENT_URL ? 'configured' : 'not set'} → /api/whatsapp/webhook`,
    },
  });
});

// GET /api/admin/whatsapp/logs
const getLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, phone, direction } = req.query;
  const filter = {};
  if (phone) filter.phone = { $regex: phone };
  if (direction) filter.direction = direction;

  const logs = await WhatsAppLog.find(filter)
    .populate('userId', 'name email role')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await WhatsAppLog.countDocuments(filter);
  res.json({ logs, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// GET /api/admin/whatsapp/conversations
const getConversations = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const sessions = await WhatsAppSession.find()
    .populate('userId', 'name email role phone businessName')
    .sort({ lastActivity: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await WhatsAppSession.countDocuments();

  // For each session, get last 5 messages
  const conversations = await Promise.all(
    sessions.map(async (sess) => {
      const messages = await WhatsAppLog.find({ phone: sess.phone }).sort({ createdAt: -1 }).limit(5);
      return { session: sess, recentMessages: messages.reverse() };
    })
  );

  res.json({ conversations, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// GET /api/admin/whatsapp/conversation/:phone
const getConversationByPhone = asyncHandler(async (req, res) => {
  const { phone } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const messages = await WhatsAppLog.find({ phone })
    .populate('userId', 'name email role')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const total = await WhatsAppLog.countDocuments({ phone });
  const session = await WhatsAppSession.findOne({ phone }).populate('userId', 'name email role phone');
  res.json({ messages: messages.reverse(), total, session, page: Number(page), pages: Math.ceil(total / limit) });
});

// POST /api/admin/whatsapp/broadcast
const sendBroadcast = asyncHandler(async (req, res) => {
  const { message, role, phones } = req.body;
  if (!message) { res.status(400); throw new Error('Message is required'); }

  let targetPhones = phones || [];
  if (!targetPhones.length && role) {
    const users = await User.find({ role, isActive: true, phone: { $exists: true, $ne: '' } }).select('phone');
    targetPhones = users.map((u) => u.phone).filter(Boolean);
  }
  if (!targetPhones.length) { res.status(400); throw new Error('No target phones found'); }

  const results = await wa.sendBroadcast(targetPhones, message);
  const sent = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  res.json({ message: `Broadcast sent`, sent, failed, total: results.length, results });
});

// POST /api/admin/whatsapp/send
const sendDirectMessage = asyncHandler(async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) { res.status(400); throw new Error('Phone and message are required'); }
  const result = await wa.sendTextMessage(phone, `*[Admin] PrintMart:*\n\n${message}`);
  if (!result) { res.status(502); throw new Error('Failed to send WhatsApp message'); }
  res.json({ message: 'Message sent', result });
});

// GET /api/admin/whatsapp/sessions
const getSessions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const sessions = await WhatsAppSession.find()
    .populate('userId', 'name email role phone')
    .sort({ lastActivity: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const total = await WhatsAppSession.countDocuments();
  res.json({ sessions, total, page: Number(page), pages: Math.ceil(total / limit) });
});

module.exports = {
  getStats,
  getLogs,
  getConversations,
  getConversationByPhone,
  sendBroadcast,
  sendDirectMessage,
  getSessions,
};
