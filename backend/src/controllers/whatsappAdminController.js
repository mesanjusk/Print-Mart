const asyncHandler = require('express-async-handler');
const WhatsAppLog = require('../models/WhatsAppLog');
const WhatsAppSession = require('../models/WhatsAppSession');
const WhatsAppCampaign = require('../models/WhatsAppCampaign');
const WhatsAppOptOut = require('../models/WhatsAppOptOut');
const WhatsAppBotConfig = require('../models/WhatsAppBotConfig');
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
  const filter = search ? { $or: [{ phone: { $regex: search } }, { role: { $regex: search, $options: 'i' } }] } : {};
  const [sessions, total] = await Promise.all([
    WhatsAppSession.find(filter).populate('userId', 'name email role phone businessName').sort({ lastActivity: -1 }).skip((page - 1) * limit).limit(Number(limit)),
    WhatsAppSession.countDocuments(filter),
  ]);
  const now = Date.now();
  const conversations = await Promise.all(sessions.map(async (sess) => {
    const recentMessages = await WhatsAppLog.find({ phone: sess.phone }).sort({ createdAt: -1 }).limit(5);
    const windowOpen = sess.lastInboundAt && (now - new Date(sess.lastInboundAt).getTime()) < 24 * 60 * 60 * 1000;
    const windowExpiresAt = sess.lastInboundAt ? new Date(new Date(sess.lastInboundAt).getTime() + 24 * 60 * 60 * 1000).toISOString() : null;
    const lastMsg = recentMessages[0];
    return {
      phone: sess.phone,
      name: sess.userId?.name || sess.userId?.businessName || null,
      email: sess.userId?.email || null,
      role: sess.role || sess.userId?.role || 'unknown',
      state: sess.state,
      userId: sess.userId,
      lastActivity: sess.lastActivity,
      lastInboundAt: sess.lastInboundAt,
      windowOpen: !!windowOpen,
      windowExpiresAt,
      lastMessage: lastMsg?.message || lastMsg?.templateName || null,
      lastDirection: lastMsg?.direction || null,
      recentMessages: recentMessages.reverse(),
      sessionId: sess._id,
    };
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

// ─── Bot Config ───────────────────────────────────────────────────────────────

const getBotConfig = asyncHandler(async (req, res) => {
  let config = await WhatsAppBotConfig.findOne().populate('updatedBy', 'name email');
  if (!config) config = await WhatsAppBotConfig.create({});
  res.json(config);
});

const updateBotConfig = asyncHandler(async (req, res) => {
  const allowed = ['botEnabled', 'welcomeBuyer', 'welcomeSeller', 'helpBuyer', 'helpSeller',
    'unknownUserGreeting', 'fallbackMessage', 'guestInquiryPrompt', 'optOutConfirmation',
    'optInConfirmation', 'customCommands'];
  const update = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }
  update.updatedBy = req.user._id;

  let config = await WhatsAppBotConfig.findOne();
  if (!config) {
    config = await WhatsAppBotConfig.create(update);
  } else {
    Object.assign(config, update);
    await config.save();
  }
  res.json(config);
});

// ─── Session management ───────────────────────────────────────────────────────

const resetSession = asyncHandler(async (req, res) => {
  const phone = decodeURIComponent(req.params.phone);
  const session = await WhatsAppSession.findOneAndUpdate(
    { phone },
    { state: 'idle', context: {} },
    { new: true }
  ).populate('userId', 'name email role');
  if (!session) { res.status(404); throw new Error('Session not found'); }
  res.json({ message: 'Session reset to idle', session });
});

const deleteSession = asyncHandler(async (req, res) => {
  const phone = decodeURIComponent(req.params.phone);
  await WhatsAppSession.findOneAndDelete({ phone });
  res.json({ message: 'Session deleted' });
});

// ─── Bot command tester (simulates without sending real WA message) ───────────

const testBotCommand = asyncHandler(async (req, res) => {
  const { message, role = 'buyer', hasAccount = true } = req.body;
  if (!message) { res.status(400); throw new Error('message is required'); }

  const config = await WhatsAppBotConfig.findOne() || {};
  const clientUrl = process.env.CLIENT_URL || 'https://print-mart.vercel.app';

  const applyVars = (text, name = 'TestUser') =>
    (text || '').replace(/\{\{name\}\}/g, name).replace(/\{\{clientUrl\}\}/g, clientUrl);

  const t = message.trim().toUpperCase();
  let simulatedResponses = [];

  if (!hasAccount) {
    if (['HI', 'HELLO', 'START', 'MENU', 'HEY'].some(k => t.startsWith(k))) {
      simulatedResponses.push({ type: 'unknown_greeting', body: applyVars(config.unknownUserGreeting || 'Welcome to PrintMart! Reply REGISTER to sign up.') });
    } else if (['REGISTER', 'JOIN', 'SIGNUP'].includes(t)) {
      simulatedResponses.push({ type: 'registration_flow', body: '👋 Welcome to PrintMart!\n\nRegister as:\n1️⃣ BUYER – Browse & purchase\n2️⃣ SELLER – List & sell\n\nReply 1/BUYER or 2/SELLER' });
    } else if (['INQUIRE', 'INQUIRY', 'ENQUIRE', 'QUOTE', 'PRICE'].includes(t)) {
      simulatedResponses.push({ type: 'guest_inquiry', body: applyVars(config.guestInquiryPrompt || 'Send: Product | Qty | Name') });
    } else {
      simulatedResponses.push({ type: 'unknown_fallback', body: applyVars(config.unknownUserGreeting || 'Welcome! Reply REGISTER to get started.') });
    }
  } else if (role === 'buyer') {
    if (['HI', 'HELLO', 'START', 'MENU', 'HEY'].some(k => t.startsWith(k))) {
      simulatedResponses.push({ type: 'welcome_buyer', body: applyVars(config.welcomeBuyer || 'Welcome!', 'TestUser') });
    } else if (t.startsWith('HELP')) {
      simulatedResponses.push({ type: 'help_buyer', body: config.helpBuyer || 'Buyer commands...' });
    } else if (t.startsWith('ORDERS')) {
      simulatedResponses.push({ type: 'orders_list', body: '📦 Your Orders\n\n[Would list recent orders here]\n\nReply TRACK [order#] for tracking.' });
    } else if (t.startsWith('QUOTES') || t === 'QUOTE') {
      simulatedResponses.push({ type: 'quotes_list', body: '📋 Pending Quotations\n\n[Would list pending quotations here]\n\nReply ACCEPT or REJECT.' });
    } else if (t.startsWith('STATUS')) {
      simulatedResponses.push({ type: 'status', body: '📊 Your Status\n\n[Would show open inquiries and active orders]' });
    } else if (t.startsWith('ACCEPT')) {
      simulatedResponses.push({ type: 'accept_quote', body: '✅ [Would accept the latest pending quotation and create an order]' });
    } else if (t.startsWith('REJECT')) {
      simulatedResponses.push({ type: 'reject_quote', body: '❌ [Would reject the latest pending quotation]' });
    } else if (t.startsWith('PAID ')) {
      simulatedResponses.push({ type: 'payment_confirm', body: '✅ [Would confirm payment for order: ' + t.replace('PAID ', '') + ']' });
    } else if (t.startsWith('TRACK ')) {
      simulatedResponses.push({ type: 'track_order', body: '🚚 [Would show tracking info for order: ' + t.replace('TRACK ', '') + ']' });
    } else if (t.startsWith('CANCEL ')) {
      simulatedResponses.push({ type: 'cancel_order', body: '❌ [Would cancel order: ' + t.replace('CANCEL ', '') + ']' });
    } else if (['STOP', 'UNSUBSCRIBE', 'OPTOUT'].includes(t)) {
      simulatedResponses.push({ type: 'opt_out', body: config.optOutConfirmation || '✅ You have been unsubscribed.' });
    } else if (['START', 'SUBSCRIBE', 'OPTIN'].includes(t)) {
      simulatedResponses.push({ type: 'opt_in', body: config.optInConfirmation || '✅ You are now subscribed.' });
    } else {
      simulatedResponses.push({ type: 'fallback_or_inquiry_reply', body: config.fallbackMessage || 'Sorry, I didn\'t understand. Reply HELP for commands.' });
    }
  } else if (role === 'seller') {
    if (['HI', 'HELLO', 'START', 'MENU', 'HEY'].some(k => t.startsWith(k))) {
      simulatedResponses.push({ type: 'welcome_seller', body: applyVars(config.welcomeSeller || 'Welcome Seller!', 'TestUser') });
    } else if (t.startsWith('HELP')) {
      simulatedResponses.push({ type: 'help_seller', body: config.helpSeller || 'Seller commands...' });
    } else if (t.startsWith('ORDERS')) {
      simulatedResponses.push({ type: 'orders_list', body: '📦 Your Orders\n\n[Would list seller orders here]' });
    } else if (t.startsWith('STATUS')) {
      simulatedResponses.push({ type: 'status', body: '📊 Vendor Status\n\n[Would show pending inquiries and active orders]' });
    } else if (t.startsWith('QUOTE ')) {
      const parts = t.replace('QUOTE ', '').trim().split(/\s+/);
      simulatedResponses.push({ type: 'send_quote', body: `✅ [Would create and send quotation for amount: ₹${parts[parts.length - 1]}]` });
    } else if (t.startsWith('DISPATCH ')) {
      simulatedResponses.push({ type: 'dispatch_order', body: '✅ [Would mark order as dispatched with tracking info]' });
    } else if (t.startsWith('DELIVER ')) {
      simulatedResponses.push({ type: 'deliver_order', body: '✅ [Would mark order as delivered]' });
    } else if (['STOP', 'UNSUBSCRIBE', 'OPTOUT'].includes(t)) {
      simulatedResponses.push({ type: 'opt_out', body: config.optOutConfirmation || '✅ Unsubscribed.' });
    } else {
      simulatedResponses.push({ type: 'fallback_or_inquiry_reply', body: config.fallbackMessage || 'Sorry, I didn\'t understand. Reply HELP.' });
    }
  }

  // Check custom commands
  const customCommands = config.customCommands || [];
  const lower = message.toLowerCase().trim();
  for (const cc of customCommands) {
    if (!cc.active) continue;
    const rolesMatch = !cc.roles?.length || cc.roles.includes('all') || cc.roles.includes(role);
    if (!rolesMatch) continue;
    let matches = false;
    if (cc.matchType === 'exact') matches = lower === cc.keyword;
    else if (cc.matchType === 'starts_with') matches = lower.startsWith(cc.keyword);
    else matches = lower.includes(cc.keyword);
    if (matches) {
      simulatedResponses.unshift({ type: 'custom_command', keyword: cc.keyword, body: cc.response });
      break;
    }
  }

  res.json({ message, role, hasAccount, simulatedResponses });
});

module.exports = {
  getStats, getLogs,
  getConversations, getConversationByPhone, replyToConversation,
  getSessions, sendBroadcast, sendDirectMessage,
  getCampaigns, createCampaign, updateCampaign, deleteCampaign, runCampaign,
  getOptOuts, addOptOut, removeOptOut,
  getWindowStatus, getTemplates, syncTemplatesFromMeta,
  getBotConfig, updateBotConfig,
  resetSession, deleteSession, testBotCommand,
};
