const asyncHandler = require('express-async-handler');
const WhatsAppLog = require('../models/WhatsAppLog');
const WhatsAppSession = require('../models/WhatsAppSession');
const WhatsAppCampaign = require('../models/WhatsAppCampaign');
const WhatsAppOptOut = require('../models/WhatsAppOptOut');
const BotCommandModel = require('../models/BotCommand');
const { DEFAULT_BOT_COMMANDS } = require('../models/BotCommand');
const Order = require('../models/Order');
const User = require('../models/User');
const wa = require('../services/whatsapp');

const getStats = asyncHandler(async (req, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [totalLogs, inbound, outbound, activeSessions, waOrders, totalOrders, optOutCount, campaignCount] = await Promise.all([
    WhatsAppLog.countDocuments(),
    WhatsAppLog.countDocuments({ direction: 'inbound' }),
    WhatsAppLog.countDocuments({ direction: 'outbound' }),
    WhatsAppSession.countDocuments({ lastActivity: { $gte: sevenDaysAgo } }),
    Order.countDocuments({ createdViaWhatsapp: true }),
    Order.countDocuments(),
    WhatsAppOptOut.countDocuments(),
    WhatsAppCampaign.countDocuments({ status: 'active' }),
  ]);

  const dailyMessages = await WhatsAppLog.aggregate([
    { $match: { createdAt: { $gte: sevenDaysAgo } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, inbound: { $sum: { $cond: [{ $eq: ['$direction', 'inbound'] }, 1, 0] } }, outbound: { $sum: { $cond: [{ $eq: ['$direction', 'outbound'] }, 1, 0] } } } },
    { $sort: { _id: 1 } },
  ]);

  const windowOpen = await WhatsAppSession.countDocuments({
    lastInboundAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  });

  res.json({
    totalMessages: totalLogs, inboundMessages: inbound, outboundMessages: outbound,
    activeSessionsLast7Days: activeSessions, ordersViaWhatsapp: waOrders, totalOrders,
    waConversionRate: totalOrders ? ((waOrders / totalOrders) * 100).toFixed(1) : 0,
    optOutCount, activeCampaigns: campaignCount, windowOpenCount: windowOpen, dailyMessages,
    config: {
      phoneIdConfigured: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
      accessTokenConfigured: !!process.env.WHATSAPP_ACCESS_TOKEN,
      verifyTokenConfigured: !!process.env.WHATSAPP_VERIFY_TOKEN,
      apiVersion: 'v18.0',
    },
  });
});

const getLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, phone, direction, messageType } = req.query;
  const filter = {};
  if (phone) filter.phone = { $regex: phone };
  if (direction) filter.direction = direction;
  if (messageType) filter.messageType = messageType;
  const [logs, total] = await Promise.all([
    WhatsAppLog.find(filter).populate('userId', 'name email role').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
    WhatsAppLog.countDocuments(filter),
  ]);
  res.json({ logs, total, page: Number(page), pages: Math.ceil(total / limit) });
});

const getConversations = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const filter = search ? { phone: { $regex: search } } : {};
  const [sessions, total] = await Promise.all([
    WhatsAppSession.find(filter).populate('userId', 'name email role phone businessName').sort({ lastActivity: -1 }).skip((page - 1) * limit).limit(Number(limit)),
    WhatsAppSession.countDocuments(filter),
  ]);
  const now = Date.now();
  const conversations = await Promise.all(sessions.map(async (sess) => {
    const messages = await WhatsAppLog.find({ phone: sess.phone }).sort({ createdAt: -1 }).limit(5);
    const windowOpen = sess.lastInboundAt && (now - new Date(sess.lastInboundAt).getTime()) < 24 * 60 * 60 * 1000;
    const windowExpiresIn = windowOpen ? Math.round((new Date(sess.lastInboundAt).getTime() + 24 * 60 * 60 * 1000 - now) / 60000) : 0;
    return { session: sess, recentMessages: messages.reverse(), windowOpen, windowExpiresIn };
  }));
  res.json({ conversations, total, page: Number(page), pages: Math.ceil(total / limit) });
});

const getConversationByPhone = asyncHandler(async (req, res) => {
  const { phone } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const [messages, total, session] = await Promise.all([
    WhatsAppLog.find({ phone }).populate('userId', 'name email role').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
    WhatsAppLog.countDocuments({ phone }),
    WhatsAppSession.findOne({ phone }).populate('userId', 'name email role phone businessName'),
  ]);
  const now = Date.now();
  const windowOpen = session?.lastInboundAt && (now - new Date(session.lastInboundAt).getTime()) < 24 * 60 * 60 * 1000;
  const windowExpiresIn = windowOpen ? Math.round((new Date(session.lastInboundAt).getTime() + 24 * 60 * 60 * 1000 - now) / 60000) : 0;
  res.json({ messages: messages.reverse(), total, session, windowOpen: !!windowOpen, windowExpiresIn, page: Number(page), pages: Math.ceil(total / limit) });
});

const replyToConversation = asyncHandler(async (req, res) => {
  const { phone } = req.params;
  const { message, messageType = 'text', templateName, templateParams, templateLanguage } = req.body;
  if (!phone) { res.status(400); throw new Error('Phone is required'); }
  let result;
  if (messageType === 'template' && templateName) {
    const components = templateParams?.length
      ? [{ type: 'body', parameters: templateParams.map((t) => ({ type: 'text', text: t })) }] : [];
    result = await wa.sendTemplateMessage(phone, templateName, templateLanguage || 'en', components);
  } else {
    if (!message) { res.status(400); throw new Error('Message is required'); }
    result = await wa.sendTextMessage(phone, `*[PrintMart Support]*\n\n${message}`);
  }
  if (!result) { res.status(502); throw new Error('Failed to send message'); }
  res.json({ message: 'Sent', result });
});

const sendBroadcast = asyncHandler(async (req, res) => {
  const { message, role, phones, campaignName, messageType, templateName, templateParams, templateLanguage } = req.body;
  let targetPhones = phones || [];
  if (!targetPhones.length && role) {
    const query = { isActive: true, phone: { $exists: true, $ne: '' } };
    if (role !== 'all') query.role = role;
    const users = await User.find(query).select('phone');
    targetPhones = users.map((u) => u.phone).filter(Boolean);
  }
  const optOuts = await WhatsAppOptOut.find({ phone: { $in: targetPhones } }).select('phone');
  const optOutSet = new Set(optOuts.map((o) => o.phone));
  targetPhones = targetPhones.filter((p) => !optOutSet.has(p));
  if (!targetPhones.length) { res.status(400); throw new Error('No eligible phones after opt-out filter'); }

  let results = [];
  for (const phone of targetPhones) {
    let r;
    if (messageType === 'template' && templateName) {
      const components = templateParams?.length
        ? [{ type: 'body', parameters: templateParams.map((t) => ({ type: 'text', text: t })) }] : [];
      r = await wa.sendTemplateMessage(phone, templateName, templateLanguage || 'en', components);
    } else {
      r = await wa.sendTextMessage(phone, message);
    }
    results.push({ phone, success: !!r });
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const sent = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  if (campaignName) {
    await WhatsAppCampaign.create({
      name: campaignName, type: 'broadcast_campaign',
      response: { messageType: messageType || 'text', content: message, templateName, templateParams },
      audience: { roles: role ? [role] : [], phones },
      status: 'completed', stats: { sent, failed }, lastRunAt: new Date(), createdBy: req.user._id,
    });
  }
  res.json({ message: 'Broadcast sent', sent, failed, total: results.length, results });
});

const sendDirectMessage = asyncHandler(async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) { res.status(400); throw new Error('Phone and message are required'); }
  const result = await wa.sendTextMessage(phone, `*[PrintMart Support]*\n\n${message}`);
  if (!result) { res.status(502); throw new Error('Failed to send message'); }
  res.json({ message: 'Sent', result });
});

const getSessions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const now = Date.now();
  const [sessions, total] = await Promise.all([
    WhatsAppSession.find().populate('userId', 'name email role phone').sort({ lastActivity: -1 }).skip((page - 1) * limit).limit(Number(limit)),
    WhatsAppSession.countDocuments(),
  ]);
  const enriched = sessions.map((s) => {
    const obj = s.toObject();
    obj.windowOpen = s.lastInboundAt && (now - new Date(s.lastInboundAt).getTime()) < 24 * 60 * 60 * 1000;
    return obj;
  });
  res.json({ sessions: enriched, total, page: Number(page), pages: Math.ceil(total / limit) });
});

const getCampaigns = asyncHandler(async (req, res) => {
  const { type, status } = req.query;
  const filter = {};
  if (type) filter.type = type;
  if (status) filter.status = status;
  const campaigns = await WhatsAppCampaign.find(filter).populate('createdBy', 'name email').sort({ createdAt: -1 });
  res.json(campaigns);
});

const createCampaign = asyncHandler(async (req, res) => {
  const campaign = await WhatsAppCampaign.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json(campaign);
});

const updateCampaign = asyncHandler(async (req, res) => {
  const campaign = await WhatsAppCampaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!campaign) { res.status(404); throw new Error('Campaign not found'); }
  res.json(campaign);
});

const deleteCampaign = asyncHandler(async (req, res) => {
  await WhatsAppCampaign.findByIdAndDelete(req.params.id);
  res.json({ message: 'Campaign deleted' });
});

const runCampaign = asyncHandler(async (req, res) => {
  const campaign = await WhatsAppCampaign.findById(req.params.id);
  if (!campaign) { res.status(404); throw new Error('Campaign not found'); }
  if (campaign.type !== 'broadcast_campaign') { res.status(400); throw new Error('Only broadcast campaigns can be run manually'); }

  let targetPhones = campaign.audience.phones || [];
  if (!targetPhones.length) {
    const roleFilter = campaign.audience.roles?.includes('all') ? {} : { role: { $in: campaign.audience.roles } };
    const query = { isActive: true, phone: { $exists: true, $ne: '' }, ...roleFilter };
    if (campaign.audience.premiumOnly) query.plan = 'premium';
    const users = await User.find(query).select('phone');
    targetPhones = users.map((u) => u.phone).filter(Boolean);
  }

  const optOuts = await WhatsAppOptOut.find({ phone: { $in: targetPhones } }).select('phone');
  const optOutSet = new Set(optOuts.map((o) => o.phone));
  targetPhones = targetPhones.filter((p) => !optOutSet.has(p));

  const results = [];
  for (const phone of targetPhones) {
    let r;
    if (campaign.response.messageType === 'template' && campaign.response.templateName) {
      const components = campaign.response.templateParams?.length
        ? [{ type: 'body', parameters: campaign.response.templateParams.map((t) => ({ type: 'text', text: t })) }] : [];
      r = await wa.sendTemplateMessage(phone, campaign.response.templateName, campaign.response.templateLanguage || 'en', components);
    } else {
      r = await wa.sendTextMessage(phone, campaign.response.content);
    }
    results.push({ phone, success: !!r });
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const sent = results.filter((r) => r.success).length;
  campaign.stats.sent += sent;
  campaign.stats.failed += results.filter((r) => !r.success).length;
  campaign.lastRunAt = new Date();
  campaign.status = 'completed';
  await campaign.save();
  res.json({ message: 'Campaign sent', sent, failed: campaign.stats.failed, total: results.length });
});

const getOptOuts = asyncHandler(async (req, res) => {
  const optOuts = await WhatsAppOptOut.find().populate('userId', 'name email').sort({ optedOutAt: -1 });
  res.json(optOuts);
});

const addOptOut = asyncHandler(async (req, res) => {
  const { phone, reason } = req.body;
  if (!phone) { res.status(400); throw new Error('Phone is required'); }
  const existing = await WhatsAppOptOut.findOne({ phone });
  if (existing) return res.json({ message: 'Already opted out', optOut: existing });
  const user = await User.findOne({ phone }).select('_id');
  const optOut = await WhatsAppOptOut.create({ phone, userId: user?._id, reason: reason || 'admin_added' });
  await WhatsAppSession.findOneAndUpdate({ phone }, { optedOut: true });
  res.status(201).json(optOut);
});

const removeOptOut = asyncHandler(async (req, res) => {
  await WhatsAppOptOut.findByIdAndDelete(req.params.id);
  res.json({ message: 'Opt-out removed' });
});

const getWindowStatus = asyncHandler(async (req, res) => {
  const now = new Date();
  const cutoff = new Date(now - 24 * 60 * 60 * 1000);
  const [open, closed] = await Promise.all([
    WhatsAppSession.countDocuments({ lastInboundAt: { $gte: cutoff } }),
    WhatsAppSession.countDocuments({ $or: [{ lastInboundAt: { $lt: cutoff } }, { lastInboundAt: null }] }),
  ]);
  const openSessions = await WhatsAppSession.find({ lastInboundAt: { $gte: cutoff } })
    .populate('userId', 'name phone role').sort({ lastInboundAt: -1 }).limit(100);
  const enriched = openSessions.map((s) => ({
    ...s.toObject(),
    expiresInMinutes: Math.round((new Date(s.lastInboundAt).getTime() + 24 * 60 * 60 * 1000 - now.getTime()) / 60000),
  }));
  res.json({ open, closed, total: open + closed, openSessions: enriched });
});

const getTemplates = asyncHandler(async (req, res) => {
  const builtIn = [
    { name: 'printmart_account_verification', category: 'AUTHENTICATION', language: 'en', status: 'pending_approval', body: '{{1}} is your PrintMart verification code. Valid for 10 minutes. Do not share this code.', params: 1 },
    { name: 'printmart_password_reset', category: 'AUTHENTICATION', language: 'en', status: 'pending_approval', body: '{{1}} is your PrintMart password reset code. Valid for 10 minutes. Do not share this code.', params: 1 },
    { name: 'hello_world', category: 'UTILITY', language: 'en', status: 'approved', body: 'Hello World! This is a default Meta template.', params: 0 },
  ];
  res.json(builtIn);
});

const syncTemplatesFromMeta = asyncHandler(async (req, res) => {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneId || !token) { res.status(503); throw new Error('WhatsApp credentials not configured'); }
  const axios = require('axios');
  try {
    const phoneRes = await axios.get(
      `https://graph.facebook.com/v18.0/${phoneId}`,
      { headers: { Authorization: `Bearer ${token}` }, params: { fields: 'whatsapp_business_account' } }
    );
    const wabaId = phoneRes.data?.whatsapp_business_account?.id;
    if (!wabaId) { res.status(500); throw new Error('Could not retrieve WABA ID from Meta'); }
    const templatesRes = await axios.get(
      `https://graph.facebook.com/v18.0/${wabaId}/message_templates`,
      { headers: { Authorization: `Bearer ${token}` }, params: { limit: 100 } }
    );
    res.json({ templates: templatesRes.data?.data || [], wabaId });
  } catch (err) {
    res.status(502).json({ message: 'Failed to sync from Meta', error: err?.response?.data || err.message });
  }
});

// ─── Bot Commands (Flow Builder) ─────────────────────────────────────────────

const getBotCommands = asyncHandler(async (req, res) => {
  const count = await BotCommandModel.countDocuments();
  if (count === 0) {
    await BotCommandModel.insertMany(DEFAULT_BOT_COMMANDS);
  }
  const commands = await BotCommandModel.find().sort({ role: 1, priority: 1 });
  const grouped = {
    unknown: commands.filter((c) => c.role === 'unknown'),
    buyer: commands.filter((c) => c.role === 'buyer'),
    seller: commands.filter((c) => c.role === 'seller'),
    all: commands.filter((c) => c.role === 'all'),
  };
  res.json({ commands, grouped });
});

const createBotCommand = asyncHandler(async (req, res) => {
  const { commandKey, name, description, role, triggerKeywords, matchType, response, isEnabled, exampleUsage } = req.body;
  if (!commandKey || !name || !role) { res.status(400); throw new Error('commandKey, name and role are required'); }
  const existing = await BotCommandModel.findOne({ commandKey, role });
  if (existing) { res.status(409); throw new Error('A command with this key and role already exists'); }
  const maxPriority = await BotCommandModel.find({ role }).sort({ priority: -1 }).limit(1);
  const priority = maxPriority.length ? maxPriority[0].priority + 10 : 10;
  const cmd = await BotCommandModel.create({
    commandKey, name, description, role, triggerKeywords: triggerKeywords || [],
    matchType: matchType || 'exact', response, isEnabled: isEnabled !== false,
    isBuiltin: false, isDynamic: false, exampleUsage: exampleUsage || '', priority,
  });
  res.status(201).json(cmd);
});

const updateBotCommand = asyncHandler(async (req, res) => {
  const cmd = await BotCommandModel.findById(req.params.id);
  if (!cmd) { res.status(404); throw new Error('Command not found'); }
  const allowed = ['name', 'description', 'triggerKeywords', 'matchType', 'response', 'isEnabled', 'exampleUsage', 'priority'];
  allowed.forEach((k) => { if (req.body[k] !== undefined) cmd[k] = req.body[k]; });
  await cmd.save();
  res.json(cmd);
});

const deleteBotCommand = asyncHandler(async (req, res) => {
  const cmd = await BotCommandModel.findById(req.params.id);
  if (!cmd) { res.status(404); throw new Error('Command not found'); }
  if (cmd.isBuiltin) { res.status(400); throw new Error('Built-in commands cannot be deleted'); }
  await cmd.deleteOne();
  res.json({ message: 'Command deleted' });
});

const reorderBotCommands = asyncHandler(async (req, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) { res.status(400); throw new Error('orderedIds array required'); }
  await Promise.all(orderedIds.map((id, idx) =>
    BotCommandModel.findByIdAndUpdate(id, { priority: (idx + 1) * 10 })
  ));
  res.json({ message: 'Order saved' });
});

module.exports = {
  getStats, getLogs,
  getConversations, getConversationByPhone, replyToConversation,
  getSessions, sendBroadcast, sendDirectMessage,
  getCampaigns, createCampaign, updateCampaign, deleteCampaign, runCampaign,
  getOptOuts, addOptOut, removeOptOut,
  getWindowStatus, getTemplates, syncTemplatesFromMeta,
  getBotCommands, createBotCommand, updateBotCommand, deleteBotCommand, reorderBotCommands,
};
