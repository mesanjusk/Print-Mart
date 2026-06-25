const Inquiry = require('../models/Inquiry');
const Product = require('../models/Product');
const User = require('../models/User');
const Quotation = require('../models/Quotation');
const Order = require('../models/Order');
const WhatsAppSession = require('../models/WhatsAppSession');
const WhatsAppLog = require('../models/WhatsAppLog');
const BotCommand = require('../models/BotCommand');
const wa = require('../services/whatsapp');

// ─── Webhook verification ────────────────────────────────────────────────────

const webhookVerify = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const result = wa.verifyWebhook(mode, token, challenge);
  if (result !== null) {
    console.log('[WA-Bot] Webhook verified.');
    return res.status(200).send(result);
  }
  return res.status(403).json({ message: 'Verification failed' });
};

// ─── Session helpers ─────────────────────────────────────────────────────────

const getOrCreateSession = async (phone, user) => {
  let session = await WhatsAppSession.findOne({ phone });
  if (!session) {
    session = await WhatsAppSession.create({
      phone,
      userId: user?._id || null,
      role: user?.role || 'unknown',
      state: 'idle',
      context: {},
    });
  } else if (user && !session.userId) {
    session.userId = user._id;
    session.role = user.role;
  }
  session.lastActivity = new Date();
  // Track 24h customer service window — updated only on inbound
  return session;
};

// ─── Command parser ──────────────────────────────────────────────────────────

const parseCommand = (text) => {
  const t = text.trim().toUpperCase();
  if (/^(HI|HELLO|START|MENU|HEY)/.test(t)) return { cmd: 'MENU' };
  if (/^HELP/.test(t)) return { cmd: 'HELP' };
  if (/^STATUS/.test(t)) return { cmd: 'STATUS' };
  if (/^ORDERS/.test(t)) return { cmd: 'ORDERS' };
  if (/^QUOTES?/.test(t) && (t === 'QUOTES' || t === 'QUOTE')) return { cmd: 'LIST_QUOTES' };
  if (/^ACCEPT/.test(t)) return { cmd: 'ACCEPT', args: t.replace('ACCEPT', '').trim() };
  if (/^REJECT/.test(t)) return { cmd: 'REJECT', args: t.replace('REJECT', '').trim() };
  if (/^PAID\s+/.test(t)) return { cmd: 'PAID', args: t.replace('PAID', '').trim() };
  if (/^TRACK\s+/.test(t)) return { cmd: 'TRACK', args: t.replace('TRACK', '').trim() };
  if (/^CANCEL\s+/.test(t)) return { cmd: 'CANCEL', args: t.replace('CANCEL', '').trim() };
  // Seller commands
  if (/^QUOTE\s+/.test(t)) {
    const parts = t.replace('QUOTE', '').trim().split(/\s+/);
    if (parts.length >= 2 && isNaN(parts[0])) {
      return { cmd: 'SEND_QUOTE', inquiryRef: parts[0], amount: parseFloat(parts[1]) };
    }
    return { cmd: 'SEND_QUOTE', inquiryRef: null, amount: parseFloat(parts[0]) };
  }
  if (/^DISPATCH\s+/.test(t)) {
    const parts = t.replace('DISPATCH', '').trim().split(/\s+/);
    return { cmd: 'DISPATCH', orderNum: parts[0], tracking: parts.slice(1).join(' ') || '' };
  }
  if (/^DELIVER\s+/.test(t)) {
    return { cmd: 'DELIVER', orderNum: t.replace('DELIVER', '').trim() };
  }
  return { cmd: 'REPLY', text: text.trim() };
};

// ─── Buyer flows ─────────────────────────────────────────────────────────────

const handleBuyerMessage = async (phone, user, text, interactiveId, session) => {
  const cmd = interactiveId ? { cmd: interactiveId.toUpperCase() } : parseCommand(text);
  const upperText = text?.trim().toUpperCase();

  // Seller upgrade — collect business name
  if (session?.state === 'upgrade_seller_business') {
    const bizName = text?.trim();
    if (!bizName || bizName.length < 2) {
      return wa.sendTextMessage(phone, `Please enter a valid *Business Name* (at least 2 characters):`);
    }
    session.state = 'upgrade_seller_city';
    session.context = { ...session.context, businessName: bizName };
    session.markModified('context');
    await session.save();
    return wa.sendTextMessage(phone, `✅ *${bizName}*\n\nNow enter your *City / Location*:`);
  }

  // Seller upgrade — collect city then complete upgrade
  if (session?.state === 'upgrade_seller_city') {
    const city = text?.trim();
    if (!city || city.length < 2) {
      return wa.sendTextMessage(phone, `Please enter your *City / Location*:`);
    }
    const bizName = session.context?.businessName || '';
    user.role = 'seller';
    user.businessName = bizName;
    user.address = { ...user.address, city };
    await user.save();
    session.state = 'idle';
    session.role = 'seller';
    session.context = {};
    session.markModified('context');
    await session.save();
    const magicLink = await generateMagicLink(user);
    return wa.sendCtaUrlMessage(phone,
      `🎉 *You're now a Seller on PrintMart!*\n\n` +
      `🏪 Business: *${bizName}*\n` +
      `📍 City: *${city}*\n\n` +
      `⚠️ Link expires in 30 minutes.\n` +
      `Add GSTIN and bank details from your Profile after login.`,
      'Open Dashboard', magicLink, user._id
    );
  }

  // Seller upgrade — legacy confirm state (keep as fallback)
  if (session?.state === 'upgrade_seller_confirm') {
    session.state = 'idle';
    await session.save();
    return wa.sendTextMessage(phone, `Reply *SELLER* to start the upgrade process.`, user._id);
  }

  if (cmd.cmd === 'MENU') {
    return wa.sendButtonMessage(phone,
      `Hey *${user.name}* 👋 Welcome to *PrintMart*!\n\nWhat would you like to do?`,
      [{ id: 'GET_QUOTE', title: 'Get Quote' }, { id: 'HELP', title: 'Help' }],
      user._id
    );
  }

  if (cmd.cmd === 'GET_QUOTE') {
    session.state = 'guest_product';
    session.context = {};
    await session.save();
    return wa.sendTextMessage(phone, `📦 *What product are you looking for?*\n\nPlease type the product name:`, user._id);
  }

  if (cmd.cmd === 'HELP') {
    return useBotCmd('buyer_help', phone, () => wa.sendHelpBuyer(phone, user._id), { userId: user._id });
  }

  if (cmd.cmd === 'STATUS') {
    const inquiries = await Inquiry.find({ buyer: user._id, status: { $in: ['pending', 'responded'] } })
      .populate('product', 'name').populate('seller', 'businessName name').sort({ createdAt: -1 }).limit(5);
    const orders = await Order.find({ buyer: user._id, status: { $in: ['pending_payment', 'paid', 'processing', 'dispatched'] } })
      .sort({ createdAt: -1 }).limit(5);

    let body = `📊 *Your Status – PrintMart*\n\n`;
    if (inquiries.length) {
      body += `*Open Inquiries (${inquiries.length}):*\n`;
      inquiries.forEach((inq, i) => {
        body += `${i + 1}. ${inq.product?.name || 'Product'} → ${inq.seller?.businessName || inq.seller?.name || 'Vendor'} [${inq.status}]\n`;
      });
      body += '\n';
    } else body += `No open inquiries.\n\n`;

    if (orders.length) {
      body += `*Active Orders (${orders.length}):*\n`;
      orders.forEach((o, i) => {
        body += `${i + 1}. ${o.orderNumber} – ₹${o.total.toFixed(2)} [${o.status.replace('_', ' ')}]\n`;
      });
    } else body += `No active orders.`;

    return wa.sendTextMessage(phone, body, user._id);
  }

  if (cmd.cmd === 'ORDERS') {
    const orders = await Order.find({ buyer: user._id }).sort({ createdAt: -1 }).limit(8);
    if (!orders.length) return wa.sendTextMessage(phone, `You have no orders yet on PrintMart.`, user._id);
    let body = `📦 *Your Orders – PrintMart*\n\n`;
    orders.forEach((o, i) => {
      body += `${i + 1}. *${o.orderNumber}* – ₹${o.total.toFixed(2)}\n   Status: ${o.status.replace(/_/g, ' ')}\n\n`;
    });
    body += `Reply *TRACK [order-number]* for tracking details.`;
    return wa.sendTextMessage(phone, body, user._id);
  }

  if (cmd.cmd === 'LIST_QUOTES') {
    const quotes = await Quotation.find({ buyer: user._id, status: 'sent' })
      .populate('seller', 'businessName name').populate('product', 'name').sort({ createdAt: -1 }).limit(5);
    if (!quotes.length) return wa.sendTextMessage(phone, `You have no pending quotations.`, user._id);
    let body = `📋 *Pending Quotations – PrintMart*\n\n`;
    quotes.forEach((q, i) => {
      const shortId = String(q._id).slice(-6).toUpperCase();
      body += `${i + 1}. Q-${shortId} from *${q.seller?.businessName || q.seller?.name}*\n   Product: ${q.product?.name} – ₹${q.total.toFixed(2)}\n\n`;
    });
    body += `Reply *ACCEPT* to accept the latest or *ACCEPT Q-[ref]* for specific.`;
    return wa.sendTextMessage(phone, body, user._id);
  }

  if (cmd.cmd === 'ACCEPT') {
    const quotation = await findQuotationForBuyer(user._id, cmd.args, 'sent');
    if (!quotation) return wa.sendTextMessage(phone, `No pending quotation found to accept. Reply *QUOTES* to see available quotations.`, user._id);

    quotation.status = 'accepted';
    await quotation.save();

    // Create order
    const order = await Order.create({
      quotation: quotation._id,
      inquiry: quotation.inquiry,
      buyer: user._id,
      seller: quotation.seller,
      product: quotation.product,
      items: quotation.items,
      subtotal: quotation.subtotal,
      tax: quotation.tax,
      taxAmount: quotation.taxAmount,
      total: quotation.total,
      createdViaWhatsapp: true,
    });

    await wa.sendOrderConfirmation(phone, order, 'buyer', user._id);

    // Notify seller
    const seller = await User.findById(quotation.seller);
    if (seller?.phone) {
      await wa.sendQuotationResponse(seller.phone, order, 'accepted', seller._id);
    }
    return;
  }

  if (cmd.cmd === 'REJECT') {
    const quotation = await findQuotationForBuyer(user._id, cmd.args, 'sent');
    if (!quotation) return wa.sendTextMessage(phone, `No pending quotation found. Reply *QUOTES* to see your quotations.`, user._id);

    quotation.status = 'rejected';
    await quotation.save();
    await wa.sendTextMessage(phone, `❌ Quotation rejected. The vendor has been notified.`, user._id);

    const seller = await User.findById(quotation.seller);
    if (seller?.phone) {
      await wa.sendQuotationResponse(seller.phone, null, 'rejected', seller._id);
    }
    return;
  }

  if (cmd.cmd === 'PAID') {
    const orderNum = cmd.args;
    const order = await Order.findOne({ orderNumber: orderNum, buyer: user._id });
    if (!order) return wa.sendTextMessage(phone, `Order ${orderNum} not found. Reply *ORDERS* to see your orders.`, user._id);
    if (order.paymentStatus === 'paid') return wa.sendTextMessage(phone, `Payment for ${orderNum} is already confirmed.`, user._id);

    order.paymentStatus = 'paid';
    order.status = 'paid';
    order.paymentConfirmedAt = new Date();
    await order.save();

    await wa.sendPaymentConfirmed(phone, order, 'buyer', user._id);
    const seller = await User.findById(order.seller);
    if (seller?.phone) {
      await wa.sendPaymentConfirmed(seller.phone, order, 'seller', seller._id);
    }
    return;
  }

  if (cmd.cmd === 'TRACK') {
    const orderNum = cmd.args;
    const order = await Order.findOne({ $or: [{ orderNumber: orderNum }, { orderNumber: { $regex: orderNum, $options: 'i' } }], buyer: user._id });
    if (!order) return wa.sendTextMessage(phone, `Order ${orderNum} not found. Reply *ORDERS* to see your orders.`, user._id);
    const body =
      `🚚 *Tracking – ${order.orderNumber}*\n\n` +
      `*Status:* ${order.status.replace(/_/g, ' ').toUpperCase()}\n` +
      `*Tracking:* ${order.trackingInfo || 'Not dispatched yet'}\n` +
      `*Total:* ₹${order.total.toFixed(2)}\n` +
      `*Payment:* ${order.paymentStatus}`;
    return wa.sendTextMessage(phone, body, user._id);
  }

  if (cmd.cmd === 'CANCEL') {
    const orderNum = cmd.args;
    const order = await Order.findOne({ orderNumber: orderNum, buyer: user._id });
    if (!order) return wa.sendTextMessage(phone, `Order ${orderNum} not found.`, user._id);
    if (['delivered', 'dispatched', 'cancelled'].includes(order.status)) {
      return wa.sendTextMessage(phone, `Cannot cancel order in status: ${order.status}.`, user._id);
    }
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelReason = 'Cancelled by buyer via WhatsApp';
    await order.save();
    await wa.sendCancellationNotice(phone, order, 'Cancelled by buyer', user._id);
    const seller = await User.findById(order.seller);
    if (seller?.phone) await wa.sendCancellationNotice(seller.phone, order, 'Cancelled by buyer', seller._id);
    return;
  }

  // Default: forward typed text to most recent open inquiry as a reply
  const inquiry = await Inquiry.findOne({ buyer: user._id, status: { $in: ['pending', 'responded'] } })
    .sort({ createdAt: -1 }).populate('seller', 'name phone');
  if (inquiry && !interactiveId) {
    inquiry.replies.push({ sender: user._id, message: text });
    await inquiry.save();
    if (inquiry.seller?.phone) {
      await wa.sendInquiryReplyToUser(inquiry.seller.phone, user.name, text, inquiry.seller._id);
    }
    return wa.sendTextMessage(phone, `✅ Your reply has been sent to the vendor.`, user._id);
  }
  return useBotCmd('buyer_welcome', phone, () => wa.sendWelcomeBuyer(phone, user.name, user._id), { userId: user._id, name: user.name });
};

// ─── Seller flows ─────────────────────────────────────────────────────────────

const handleSellerMessage = async (phone, user, text, interactiveId) => {
  const cmd = interactiveId ? { cmd: interactiveId.toUpperCase() } : parseCommand(text);

  if (cmd.cmd === 'MENU') {
    return useBotCmd('seller_welcome', phone, () => wa.sendWelcomeSeller(phone, user.name, user._id), { userId: user._id, name: user.name });
  }

  if (cmd.cmd === 'GET_QUOTE') {
    const session = await WhatsAppSession.findOne({ phone });
    if (session) {
      session.state = 'guest_product';
      session.context = {};
      await session.save();
    }
    return wa.sendTextMessage(phone, `📦 *What product are you looking for?*\n\nPlease type the product name:\n_(e.g., Business Cards, Flyers, Banners, T-Shirts)_`, user._id);
  }

  if (cmd.cmd === 'HELP') {
    return useBotCmd('seller_help', phone, () => wa.sendHelpSeller(phone, user._id), { userId: user._id });
  }

  if (cmd.cmd === 'STATUS') {
    const total = await Inquiry.countDocuments({ seller: user._id, status: { $in: ['pending', 'responded'] } });
    if (total === 0) {
      return wa.sendButtonMessage(phone,
        `📊 *Vendor Status – PrintMart*\n\nNo pending inquiries. 🎉`,
        [{ id: 'ORDERS', title: 'My Orders' }, { id: 'MENU', title: 'Main Menu' }],
        user._id
      );
    }
    const inquiries = await Inquiry.find({ seller: user._id, status: { $in: ['pending', 'responded'] } })
      .populate('buyer', 'name phone').populate('product', 'name').sort({ createdAt: -1 }).limit(3);

    const sellerSess = await WhatsAppSession.findOne({ phone });
    if (sellerSess) { sellerSess.context = { ...sellerSess.context, inqOffset: 3 }; await sellerSess.save(); }

    let body = `📊 *You have ${total} pending ${total === 1 ? 'inquiry' : 'inquiries'}*\n\n`;
    inquiries.forEach((inq, i) => {
      const bp = (inq.buyer?.phone || '').replace(/\D/g, '');
      const bNum = bp.startsWith('91') ? bp : (bp.length === 10 ? `91${bp}` : bp);
      const dt = inq.createdAt ? new Date(inq.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : '';
      body += `━━━━━━━━━━━━━━━━\n`;
      body += `*${i + 1}. ${inq.product?.name || 'Product'}*\n`;
      body += `   👤 ${inq.buyer?.name || 'Buyer'}\n`;
      if (bNum) body += `   📞 +${bNum}\n`;
      body += `   📦 Qty: ${inq.quantity || 1}\n`;
      body += `   🕐 ${dt}\n`;
    });

    const btns = total > 3
      ? [{ id: 'MORE_INQ', title: `More (${total - 3} left)` }, { id: 'GET_QUOTE', title: 'Get a Quote' }, { id: 'ORDERS', title: 'My Orders' }]
      : [{ id: 'GET_QUOTE', title: 'Get a Quote' }, { id: 'ORDERS', title: 'My Orders' }, { id: 'MENU', title: 'Main Menu' }];
    return wa.sendButtonMessage(phone, body, btns, user._id);
  }

  if (cmd.cmd === 'MORE_INQ') {
    const sellerSess = await WhatsAppSession.findOne({ phone });
    const offset = sellerSess?.context?.inqOffset || 3;
    const total = await Inquiry.countDocuments({ seller: user._id, status: { $in: ['pending', 'responded'] } });
    const inquiries = await Inquiry.find({ seller: user._id, status: { $in: ['pending', 'responded'] } })
      .populate('buyer', 'name phone').populate('product', 'name').sort({ createdAt: -1 }).skip(offset).limit(3);
    if (!inquiries.length) return wa.sendTextMessage(phone, `No more inquiries.`, user._id);

    if (sellerSess) { sellerSess.context = { ...sellerSess.context, inqOffset: offset + 3 }; await sellerSess.save(); }

    let body = `📋 *Inquiries ${offset + 1}–${offset + inquiries.length} of ${total}*\n\n`;
    inquiries.forEach((inq, i) => {
      const bp = (inq.buyer?.phone || '').replace(/\D/g, '');
      const bNum = bp.startsWith('91') ? bp : (bp.length === 10 ? `91${bp}` : bp);
      const dt = inq.createdAt ? new Date(inq.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : '';
      body += `━━━━━━━━━━━━━━━━\n`;
      body += `*${offset + i + 1}. ${inq.product?.name || 'Product'}*\n`;
      body += `   👤 ${inq.buyer?.name || 'Buyer'}\n`;
      if (bNum) body += `   📞 +${bNum}\n`;
      body += `   📦 Qty: ${inq.quantity || 1}\n`;
      body += `   🕐 ${dt}\n`;
    });

    const btns = offset + 3 < total
      ? [{ id: 'MORE_INQ', title: `More (${total - offset - 3} left)` }, { id: 'GET_QUOTE', title: 'Get a Quote' }, { id: 'ORDERS', title: 'My Orders' }]
      : [{ id: 'GET_QUOTE', title: 'Get a Quote' }, { id: 'ORDERS', title: 'My Orders' }, { id: 'MENU', title: 'Main Menu' }];
    return wa.sendButtonMessage(phone, body, btns, user._id);
  }

  if (cmd.cmd === 'ORDERS') {
    const orders = await Order.find({ seller: user._id }).sort({ createdAt: -1 }).limit(8);
    if (!orders.length) return wa.sendTextMessage(phone, `No orders yet.`, user._id);
    let body = `📦 *Your Orders – PrintMart*\n\n`;
    orders.forEach((o, i) => {
      body += `${i + 1}. *${o.orderNumber}* – ₹${o.total.toFixed(2)}\n   Status: ${o.status.replace(/_/g, ' ')} | Payment: ${o.paymentStatus}\n\n`;
    });
    return wa.sendTextMessage(phone, body, user._id);
  }

  if (cmd.cmd === 'SEND_QUOTE') {
    const { inquiryRef, amount } = cmd;
    if (!amount || isNaN(amount) || amount <= 0) {
      return wa.sendTextMessage(phone, `Invalid amount. Usage: *QUOTE 5000* or *QUOTE INQ-ABC 5000*`, user._id);
    }

    let inquiry;
    if (inquiryRef) {
      const inquiries = await Inquiry.find({ seller: user._id, status: { $in: ['pending', 'responded'] } }).sort({ createdAt: -1 });
      inquiry = inquiries.find((inq) => String(inq._id).toUpperCase().includes(inquiryRef.replace('INQ-', '').replace('INQ', '')));
    }
    if (!inquiry) {
      inquiry = await Inquiry.findOne({ seller: user._id, status: { $in: ['pending', 'responded'] } }).sort({ createdAt: -1 })
        .populate('buyer', 'name phone').populate('product', 'name');
    } else {
      await inquiry.populate([{ path: 'buyer', select: 'name phone' }, { path: 'product', select: 'name' }]);
    }

    if (!inquiry) return wa.sendTextMessage(phone, `No open inquiry found. Inquiries must be pending or responded.`, user._id);

    const quotation = await Quotation.create({
      inquiry: inquiry._id,
      seller: user._id,
      buyer: inquiry.buyer._id,
      product: inquiry.product._id,
      items: [{ description: inquiry.product?.name || 'Product', quantity: inquiry.quantity || 1, unit: inquiry.unit || 'pcs', unitPrice: amount, total: amount * (inquiry.quantity || 1) }],
      subtotal: amount * (inquiry.quantity || 1),
      tax: 0,
      taxAmount: 0,
      total: amount * (inquiry.quantity || 1),
      status: 'sent',
      whatsappSent: true,
    });

    // Notify buyer
    const sellerUser = await User.findById(user._id).select('name businessName');
    if (inquiry.buyer?.phone) {
      await wa.sendQuotationToClient(inquiry.buyer.phone, quotation, sellerUser?.businessName || sellerUser?.name, inquiry.buyer._id);
    }

    const shortId = String(quotation._id).slice(-6).toUpperCase();
    return wa.sendTextMessage(phone, `✅ Quotation Q-${shortId} sent to ${inquiry.buyer?.name || 'buyer'} for ₹${quotation.total.toFixed(2)}`, user._id);
  }

  if (cmd.cmd === 'DISPATCH') {
    const { orderNum, tracking } = cmd;
    const order = await Order.findOne({ orderNumber: orderNum, seller: user._id });
    if (!order) return wa.sendTextMessage(phone, `Order ${orderNum} not found.`, user._id);
    if (!['paid', 'processing'].includes(order.status)) {
      return wa.sendTextMessage(phone, `Order ${orderNum} is in status "${order.status}" and cannot be dispatched.`, user._id);
    }
    order.status = 'dispatched';
    order.dispatchedAt = new Date();
    order.trackingInfo = tracking || 'In transit';
    await order.save();
    await wa.sendTextMessage(phone, `✅ Order ${orderNum} marked as dispatched with tracking: ${order.trackingInfo}`, user._id);
    const buyer = await User.findById(order.buyer);
    if (buyer?.phone) await wa.sendDispatchNotification(buyer.phone, order, buyer._id);
    return;
  }

  if (cmd.cmd === 'DELIVER') {
    const { orderNum } = cmd;
    const order = await Order.findOne({ orderNumber: orderNum, seller: user._id });
    if (!order) return wa.sendTextMessage(phone, `Order ${orderNum} not found.`, user._id);
    if (order.status !== 'dispatched') return wa.sendTextMessage(phone, `Order ${orderNum} must be in "dispatched" status first.`, user._id);
    order.status = 'delivered';
    order.deliveredAt = new Date();
    await order.save();
    await wa.sendDeliveryConfirmation(phone, order, 'seller', user._id);
    const buyer = await User.findById(order.buyer);
    if (buyer?.phone) await wa.sendDeliveryConfirmation(buyer.phone, order, 'buyer', buyer._id);
    return;
  }

  // Default: forward typed text to most recent open inquiry as a reply
  const inquiry = await Inquiry.findOne({ seller: user._id, status: { $in: ['pending', 'responded'] } })
    .sort({ createdAt: -1 }).populate('buyer', 'name phone');
  if (inquiry && !interactiveId) {
    inquiry.replies.push({ sender: user._id, message: text });
    inquiry.status = 'responded';
    await inquiry.save();
    if (inquiry.buyer?.phone) {
      await wa.sendInquiryReplyToUser(inquiry.buyer.phone, user.name || 'Vendor', text, inquiry.buyer._id);
    }
    return wa.sendTextMessage(phone, `✅ Reply sent to ${inquiry.buyer?.name || 'buyer'}.`, user._id);
  }
  return useBotCmd('seller_welcome', phone, () => wa.sendWelcomeSeller(phone, user.name, user._id), { userId: user._id, name: user.name });
};

// ─── Unknown user flow ────────────────────────────────────────────────────────

// ─── WhatsApp Registration Flow ──────────────────────────────────────────────

const generateTempPassword = () => String(Math.floor(1000000 + Math.random() * 9000000)); // 7 digits

const generateMagicLink = async (user, redirectPath = '') => {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  user.magicToken = token;
  user.magicTokenExpire = new Date(Date.now() + 30 * 60 * 1000); // 30 min
  await user.save();
  const base = `${process.env.CLIENT_URL || 'https://shop.instify.in'}/magic-login?token=${token}`;
  return redirectPath ? `${base}&redirect=${encodeURIComponent(redirectPath)}` : base;
};

const useBotCmd = async (key, phone, fallback, { userId, name } = {}) => {
  try {
    const cmd = await BotCommand.findOne({ key, isActive: true }).lean();
    if (cmd?.response?.text) {
      let text = cmd.response.text;
      if (name) text = text.replace(/\{name\}/gi, name);
      if (cmd.response.type === 'button' && cmd.response.buttons?.length) {
        return wa.sendButtonMessage(phone, text, cmd.response.buttons, userId);
      }
      return wa.sendTextMessage(phone, text, userId);
    }
  } catch (e) {
    console.error(`[BotCmd] lookup error for "${key}":`, e.message);
  }
  return fallback();
};

const handleUnknownUser = async (phone, text, interactiveId, session, profileName = '') => {
  // interactiveId takes priority so button taps are handled correctly
  const cmd = interactiveId ? interactiveId.toUpperCase() : text?.trim().toUpperCase();
  const state = session?.state || 'idle';
  const ctx = session?.context || {};

  // ─── IDLE ─────────────────────────────────────────────────────────────────
  if (state === 'idle') {
    // Auto-register with WhatsApp profile name (silent, no prompts)
    let autoUser = null;
    if (!session.userId) {
      const last10 = phone.replace(/\D/g, '').slice(-10);
      autoUser = await User.findOne({ phone: { $regex: last10 } });
      if (!autoUser) {
        const displayName = profileName || 'PrintMart User';
        try {
          autoUser = await User.create({
            name: displayName,
            password: generateTempPassword(),
            phone: `+${phone}`,
            role: 'buyer',
            isVerified: true,
          });
        } catch (err) {
          if (err.code === 11000) autoUser = await User.findOne({ phone: { $regex: last10 } });
        }
      }
      if (autoUser) {
        session.userId = autoUser._id;
        session.role = autoUser.role;
        await session.save();
      }
    }

    if (['INQUIRE', 'INQUIRY', 'ENQUIRE', 'ENQUIRY', 'QUOTE', 'PRICE', 'BUY', 'GET A QUOTE', 'GET_QUOTE', 'GET QUOTE'].includes(cmd)) {
      session.state = 'guest_product';
      session.context = {};
      await session.save();
      return wa.sendTextMessage(phone, `📦 *What product are you looking for?*\n\nPlease type the product name:`);
    }

    // Register as Seller (separate command with business details)
    if (['SELL', 'BECOME SELLER', 'JOIN AS SELLER', 'SELL ON PRINTMART'].includes(cmd)) {
      session.state = 'sell_name';
      session.context = {};
      await session.save();
      return wa.sendTextMessage(phone,
        `🏪 *Sell on PrintMart!*\n\n` +
        `Reach thousands of buyers across India.\n\n` +
        `Please enter your *full name*:`
      );
    }

    if (cmd === 'HELP') {
      return useBotCmd('guest_help', phone, () => wa.sendButtonMessage(phone,
        `*How can we help?*\n\n• Tap *Get Quote* to send your requirement to sellers\n• Visit our website to browse products\n\n🌐 Website: ${process.env.CLIENT_URL || 'https://shop.instify.in'}\n📞 Support: +91 93701 95000`,
        [{ id: 'GET_QUOTE', title: 'Get Quote' }]
      ));
    }

    if (cmd === 'RESET') {
      const last10r = phone.replace(/\D/g, '').slice(-10);
      const existingUser = await User.findOne({ phone: { $regex: last10r } });
      if (existingUser) {
        const magicLink = await generateMagicLink(existingUser);
        return wa.sendCtaUrlMessage(phone,
          `🔑 *Password Reset*\n\nHi *${existingUser.name}*!\n\nTap below to login and set your password.\n⚠️ Link expires in 30 minutes.\nGo to Profile → Change Password after logging in.`,
          'Reset Password', magicLink
        );
      }
      return wa.sendTextMessage(phone, `⚠️ No account found for this number.\n\nReply *SELL* to join as a seller.`);
    }

    const greetName = autoUser?.name || profileName || 'there';
    return wa.sendButtonMessage(phone,
      `Hey *${greetName}* 👋 Welcome to *PrintMart*!\n\nConnect with top printing sellers across India.\n\nWhat would you like to do?`,
      [{ id: 'GET_QUOTE', title: 'Get Quote' }, { id: 'HELP', title: 'Help' }]
    );
  }

  // ─── GUIDED GUEST INQUIRY ─────────────────────────────────────────────────

  if (state === 'guest_product') {
    if (['HI', 'HELLO', 'MENU', 'HEY', 'HELP'].includes(cmd)) {
      session.state = 'idle'; session.context = {}; await session.save();
      return useBotCmd('main_menu', phone, () => wa.sendMainMenu(phone));
    }
    const product = text?.trim();
    if (!product || product.length < 2) {
      return wa.sendTextMessage(phone, `Please type the product name you are looking for.`);
    }
    session.state = 'guest_qty';
    session.context = { product, buyerName: profileName };
    await session.save();
    return wa.sendTextMessage(phone, `📊 *How many pieces do you need?*\n\nEnter the quantity (e.g. 500):`);
  }

  if (state === 'guest_qty') {
    if (['HI', 'HELLO', 'MENU', 'HEY', 'HELP'].includes(cmd)) {
      session.state = 'idle'; session.context = {}; await session.save();
      return useBotCmd('main_menu', phone, () => wa.sendMainMenu(phone));
    }
    const qty = text?.trim();
    if (!qty) return wa.sendTextMessage(phone, `Please enter the quantity.`);
    const { product, buyerName: ctxName } = ctx;

    // Resolve buyer name from context, profile, or registered account
    let buyerName = ctxName || profileName;
    if (!buyerName && session.userId) {
      const sessionUser = await User.findById(session.userId).lean();
      buyerName = sessionUser?.name;
    }
    buyerName = buyerName || 'PrintMart User';

    await wa.logMessage({ direction: 'inbound', phone, messageType: 'text', message: `[INQUIRY] Product: ${product} | Qty: ${qty} | Buyer: ${buyerName}` });
    const adminPhone = process.env.ADMIN_WHATSAPP_PHONE;
    if (adminPhone) {
      await wa.sendTextMessage(adminPhone,
        `📩 *New Inquiry – PrintMart*\n\n📱 WhatsApp: +${phone}\n👤 Name: ${buyerName}\n📦 Product: ${product}\n📊 Quantity: ${qty}`
      ).catch(() => {});
    }

    try {
      const matchingProducts = await Product.find({
        $or: [
          { name: { $regex: product, $options: 'i' } },
          { tags: { $elemMatch: { $regex: product, $options: 'i' } } },
        ],
        isActive: true,
      }).populate('seller', 'name businessName phone isActive').lean();

      const sellersWithProducts = [];
      const seen = new Set();
      for (const p of matchingProducts) {
        // Skip inactive sellers and skip if the requesting user is the seller themselves
        if (
          p.seller?.phone &&
          p.seller?.isActive !== false &&
          !seen.has(String(p.seller._id)) &&
          String(p.seller._id) !== String(session.userId)
        ) {
          sellersWithProducts.push({ seller: p.seller, product: p });
          seen.add(String(p.seller._id));
          if (sellersWithProducts.length >= 3) break;
        }
      }
      const sellers = sellersWithProducts.map((sp) => sp.seller);

      // Save Inquiry records to DB so buyer can track them in dashboard
      if (session.userId && sellersWithProducts.length > 0) {
        const parsedQty = parseInt(qty, 10);
        await Promise.all(
          sellersWithProducts.map(({ seller, product: matchedProduct }) =>
            Inquiry.create({
              product: matchedProduct._id,
              buyer: session.userId,
              seller: seller._id,
              message: `WhatsApp inquiry: ${product} × ${qty}`,
              quantity: isNaN(parsedQty) ? 1 : parsedQty,
            }).catch((e) => console.error('[WA-Bot] Inquiry save error:', e.message))
          )
        );
      }

      session.state = 'idle'; session.context = {}; await session.save();

      const CLIENT = process.env.CLIENT_URL || 'https://shop.instify.in';

      const confirmBody =
        `✅ *Inquiry Received, ${buyerName}!*\n\n` +
        `📦 *Product:* ${product}\n` +
        `📊 *Quantity:* ${qty}\n\n` +
        (sellers.length > 0
          ? `*${sellers.length}* seller(s) will contact you shortly on WhatsApp.`
          : `Sellers will contact you shortly on WhatsApp.`);

      // Track Inquiry as CTA URL button (shown above Help/Menu)
      if (session.userId) {
        const trackerUser = await User.findById(session.userId);
        if (trackerUser) {
          const trackLink = await generateMagicLink(trackerUser, '/dashboard/inquiries');
          await wa.sendCtaUrlMessage(phone, confirmBody, 'Track Inquiry', trackLink, session.userId);
        } else {
          await wa.sendTextMessage(phone, confirmBody, null);
        }
      } else {
        await wa.sendTextMessage(phone, confirmBody, null);
      }

      // Help + Menu quick-reply buttons (separate message, appears below Track button)
      await wa.sendButtonMessage(phone,
        `Need anything else?`,
        [{ id: 'HELP', title: 'Help' }, { id: 'MENU', title: 'Main Menu' }],
        session.userId || null
      ).catch(() => {});

      // Per seller: Chat button + Call button (2 CTA messages, both as buttons)
      if (sellers.length > 0) {
        for (const s of sellers) {
          const sellerClean = s.phone.replace(/\D/g, '');
          const sellerWaNum = sellerClean.startsWith('91') ? sellerClean : `91${sellerClean}`;
          const displayName = s.businessName || s.name;
          await wa.sendCtaUrlMessage(
            phone,
            `🏪 *${displayName}*\n📞 +${sellerWaNum}`,
            'Chat on WhatsApp',
            `https://wa.me/${sellerWaNum}`,
            session.userId || null
          ).catch(() => {});
          await wa.sendCtaUrlMessage(
            phone,
            `📞 Call *${displayName}*`,
            'Call Now',
            `${CLIENT}/call?phone=${sellerWaNum}`,
            session.userId || null
          ).catch(() => {});
        }

        // Notify sellers only if within 24-hour messaging window
        const guestClean = phone.replace(/\D/g, '');
        const buyerWaNum = guestClean.startsWith('91') ? guestClean : `91${guestClean}`;
        const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        for (const s of sellers) {
          const sellerNorm = s.phone.replace(/\D/g, '');
          const withinWindow = await WhatsAppLog.exists({ phone: sellerNorm, direction: 'inbound', createdAt: { $gte: cutoff24h } });
          if (!withinWindow) continue;
          await wa.sendCtaUrlMessage(
            s.phone,
            `🔔 *New Inquiry – PrintMart*\n\n📦 *Product:* ${product}\n📊 *Quantity:* ${qty}\n👤 *Buyer:* ${buyerName}\n📞 +${buyerWaNum}`,
            'Chat with Buyer',
            `https://wa.me/${buyerWaNum}`,
            s._id
          ).catch(() => {});
          await wa.sendCtaUrlMessage(
            s.phone,
            `📞 Call *${buyerName}*`,
            'Call Now',
            `${CLIENT}/call?phone=${buyerWaNum}`,
            s._id
          ).catch(() => {});
        }
      }

      // 60-second reminder if buyer doesn't respond
      const reminderRef = Date.now();
      setTimeout(async () => {
        try {
          const latestSession = await WhatsAppSession.findOne({ phone });
          if (!latestSession || latestSession.updatedAt.getTime() <= reminderRef) {
            await wa.sendButtonMessage(phone,
              `⏰ *Reminder – PrintMart*\n\nYour inquiry for *${product}* is live! Sellers will reach out soon.\n\nWant to place another inquiry or need help?`,
              [{ id: 'GET_QUOTE', title: 'New Quote' }, { id: 'HELP', title: 'Help' }, { id: 'MENU', title: 'Main Menu' }],
              session.userId || null
            );
          }
        } catch (e) {
          console.error('[WA-Bot] Reminder error:', e.message);
        }
      }, 60000);

    } catch (sellerLookupErr) {
      console.error('[WA-Bot] Seller lookup error:', sellerLookupErr.message);
      session.state = 'idle'; session.context = {}; await session.save();
      return wa.sendTextMessage(phone,
        `✅ *Inquiry Received, ${buyerName}!*\n\nYour requirement for *${product}* (Qty: ${qty}) has been noted.\n\nSellers will contact you shortly on WhatsApp.`
      );
    }
    return;
  }

  if (state === 'guest_name') {
    if (['HI', 'HELLO', 'MENU', 'HEY', 'HELP'].includes(cmd)) {
      session.state = 'idle'; session.context = {}; await session.save();
      return useBotCmd('main_menu', phone, () => wa.sendMainMenu(phone));
    }
    const guestName = text?.trim();
    if (!guestName || guestName.length < 2) {
      return wa.sendTextMessage(phone, `Please enter your name.`);
    }
    const { product, qty } = ctx;
    await wa.logMessage({ direction: 'inbound', phone, messageType: 'text', message: `[GUEST INQUIRY] Product: ${product} | Qty: ${qty} | Name: ${guestName}` });
    const adminPhone = process.env.ADMIN_WHATSAPP_PHONE;
    if (adminPhone) {
      await wa.sendTextMessage(adminPhone,
        `📩 *New Guest Inquiry – PrintMart*\n\n📱 WhatsApp: +${phone}\n👤 Name: ${guestName}\n📦 Product: ${product}\n📊 Quantity: ${qty}\n\nContact this number on WhatsApp to follow up.`
      ).catch(() => {});
    }

    // Find up to 3 sellers with matching products
    try {
      const matchingProducts = await Product.find({
        $or: [
          { name: { $regex: product, $options: 'i' } },
          { tags: { $elemMatch: { $regex: product, $options: 'i' } } },
        ],
        isActive: true,
      }).populate('seller', 'name businessName phone isActive').lean();

      const sellers = [];
      const seen = new Set();
      for (const p of matchingProducts) {
        if (
          p.seller?.phone &&
          p.seller?.isActive !== false &&
          !seen.has(String(p.seller._id)) &&
          String(p.seller._id) !== String(session.userId)
        ) {
          sellers.push(p.seller);
          seen.add(String(p.seller._id));
          if (sellers.length >= 3) break;
        }
      }

      const CLIENT = process.env.CLIENT_URL || 'https://shop.instify.in';
      session.state = 'idle'; session.context = {}; await session.save();

      // Message 1: confirmation + Register button (single message)
      await wa.sendButtonMessage(phone,
        `✅ *Thank you, ${guestName}!*\n\nYour requirement for *${product}* (Qty: ${qty}) has been received.\n\n${sellers.length > 0 ? `*${sellers.length}* seller(s) will contact you shortly.` : 'Sellers will contact you shortly.'}\n\nRegister free to track all your inquiries:`,
        [{ id: 'REGISTER', title: 'Register Free' }]
      );

      if (sellers.length > 0) {
        // Per seller: Chat button + Call button (both as CTA buttons)
        for (const s of sellers) {
          const sellerClean = s.phone.replace(/\D/g, '');
          const sellerWaNum = sellerClean.startsWith('91') ? sellerClean : `91${sellerClean}`;
          const displayName = s.businessName || s.name;
          await wa.sendCtaUrlMessage(
            phone,
            `🏪 *${displayName}*\n📞 +${sellerWaNum}`,
            'Chat on WhatsApp',
            `https://wa.me/${sellerWaNum}`
          ).catch(() => {});
          await wa.sendCtaUrlMessage(
            phone,
            `📞 Call *${displayName}*`,
            'Call Now',
            `${CLIENT}/call?phone=${sellerWaNum}`
          ).catch(() => {});
        }

        // Notify sellers only if within 24-hour messaging window
        const guestClean = phone.replace(/\D/g, '');
        const buyerWaNum = guestClean.startsWith('91') ? guestClean : `91${guestClean}`;
        const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        for (const s of sellers) {
          const sellerNorm = s.phone.replace(/\D/g, '');
          const withinWindow = await WhatsAppLog.exists({ phone: sellerNorm, direction: 'inbound', createdAt: { $gte: cutoff24h } });
          if (!withinWindow) continue;
          await wa.sendCtaUrlMessage(
            s.phone,
            `🔔 *New Inquiry – PrintMart*\n\n📦 *Product:* ${product}\n📊 *Quantity:* ${qty}\n👤 *Buyer:* ${guestName}\n📞 +${buyerWaNum}`,
            'Chat with Buyer',
            `https://wa.me/${buyerWaNum}`,
            s._id
          ).catch(() => {});
          await wa.sendCtaUrlMessage(
            s.phone,
            `📞 Call *${guestName}*`,
            'Call Now',
            `${CLIENT}/call?phone=${buyerWaNum}`,
            s._id
          ).catch(() => {});
        }
      }
    } catch (sellerLookupErr) {
      console.error('[WA-Bot] Seller lookup error:', sellerLookupErr.message);
      session.state = 'idle'; session.context = {}; await session.save();
      return wa.sendButtonMessage(phone,
        `✅ *Thank you, ${guestName}!*\n\nYour requirement for *${product}* (Qty: ${qty}) has been received.\n\nOur sellers will contact you on WhatsApp shortly.\n\nRegister free to track all your inquiries and orders:`,
        [{ id: 'REGISTER', title: 'Register Free' }]
      );
    }
    return;
  }

  // ─── REGISTRATION STEPS ───────────────────────────────────────────────────

  if (state === 'reg_role') {
    let role = null;
    if (['1', 'BUYER'].includes(cmd)) role = 'buyer';
    if (['2', 'SELLER'].includes(cmd)) role = 'seller';
    if (!role) {
      if (['REGISTER', 'JOIN', 'SIGNUP', 'NEW ACCOUNT', 'START', 'SELL', 'SELLER'].includes(cmd)) {
        return useBotCmd('guest_register_prompt', phone, () => wa.sendButtonMessage(phone, 'Choose your account type:', [
          { id: 'BUYER', title: 'Buyer' },
          { id: 'SELLER', title: 'Seller' },
        ]));
      }
      session.state = 'idle'; session.context = {}; await session.save();
      return useBotCmd('main_menu', phone, () => wa.sendMainMenu(phone));
    }
    session.state = 'reg_name';
    session.context = { role };
    session.markModified('context');
    await session.save();
    return wa.sendTextMessage(phone, `You chose *${role.toUpperCase()}*. 👍\n\nPlease enter your *full name*:`);
  }

  if (state === 'reg_name') {
    const name = text?.trim();
    if (!name || name.length < 2) {
      return wa.sendTextMessage(phone, `Please enter a valid full name (at least 2 characters).`);
    }
    session.state = 'reg_email';
    session.context = { ...ctx, name };
    session.markModified('context');
    await session.save();
    return wa.sendTextMessage(phone, `Nice to meet you, *${name}*! 😊\n\nOptionally enter your *email address* (or type *SKIP* to skip):`);
  }

  if (state === 'reg_email') {
    const emailInput = text?.trim().toLowerCase();
    const skip = ['SKIP', 'NO', 'NONE', 'NA', 'N/A'].includes(emailInput?.toUpperCase());
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!skip && !emailRegex.test(emailInput)) {
      return wa.sendTextMessage(phone, `❌ That doesn't look like a valid email.\n\nEnter your *email address* or type *SKIP*:`);
    }

    const email = skip ? undefined : emailInput;
    if (email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        session.state = 'idle'; session.context = {}; await session.save();
        return wa.sendTextMessage(phone,
          `⚠️ This email is already registered.\n\n🔑 Login at: ${process.env.CLIENT_URL || 'https://shop.instify.in'}/login\n\nForgot password? Reply *RESET*`
        );
      }
    }

    const { name, role } = ctx;
    const withPlus = `+${phone}`;

    // Phone duplicate check — auto-registered accounts get updated with explicit registration data
    const last10 = phone.replace(/\D/g, '').slice(-10);
    const phoneExists = await User.findOne({ phone: { $regex: last10 } });
    if (phoneExists) {
      phoneExists.name = name;
      if (email) phoneExists.email = email;
      phoneExists.role = role || 'buyer';
      phoneExists.isVerified = true;
      await phoneExists.save();

      session.userId = phoneExists._id;
      session.role = phoneExists.role;
      session.state = 'idle';
      session.context = {};
      session.markModified('context');
      await session.save();

      const magicLink = await generateMagicLink(phoneExists, '/dashboard/inquiries');
      return wa.sendCtaUrlMessage(phone,
        `✅ *Registration Complete!*\n\n` +
        `👤 Name: ${name}\n` +
        (email ? `📧 Email: ${email}\n` : '') +
        `📱 Phone: +${phone}\n` +
        `👤 Role: ${phoneExists.role}\n\n` +
        `⚠️ Link expires in 30 minutes.`,
        'Login Now', magicLink
      );
    }

    try {
      const user = await User.create({
        name,
        email,
        password: generateTempPassword(),
        phone: withPlus,
        role: role || 'buyer',
        isVerified: true,
      });

      session.userId = user._id;
      session.role = role;
      session.state = 'idle';
      session.context = {};
      session.markModified('context');
      await session.save();

      const magicLink = await generateMagicLink(user, '/dashboard/inquiries');

      await wa.sendCtaUrlMessage(phone,
        `✅ *Registration Successful!*\n\n` +
        `👤 Name: ${name}\n` +
        (email ? `📧 Email: ${email}\n` : '') +
        `📱 Phone: ${withPlus}\n` +
        `👤 Role: ${role || 'buyer'}\n\n` +
        `⚠️ Link expires in 30 minutes.\n` +
        `Add your email in Profile for notifications after login.`,
        'Login Now', magicLink
      );

      console.log(`[WA-Register] New ${role} account: ${name} (${email || 'no email'}) from ${withPlus}`);
    } catch (err) {
      console.error('[WA-Register] Error creating account:', err.code, err.message);
      session.state = 'idle'; session.context = {}; await session.save();
      if (err.code === 11000) {
        return wa.sendTextMessage(phone,
          `⚠️ This number is already registered.\nReply *RESET* to get a login link.`
        );
      }
      return wa.sendTextMessage(phone, `❌ Something went wrong. Please try again later.`);
    }
    return;
  }

  // ─── SELLER REGISTRATION STEPS ───────────────────────────────────────────

  if (state === 'sell_name') {
    if (['HI', 'HELLO', 'MENU', 'HEY'].includes(cmd)) {
      session.state = 'idle'; session.context = {}; await session.save();
      return useBotCmd('main_menu', phone, () => wa.sendMainMenu(phone));
    }
    const name = text?.trim();
    if (!name || name.length < 2) {
      return wa.sendTextMessage(phone, `Please enter a valid full name (at least 2 characters).`);
    }
    session.state = 'sell_business';
    session.context = { ...ctx, name };
    session.markModified('context');
    await session.save();
    return wa.sendTextMessage(phone, `Great, *${name}*! 👍\n\nNow enter your *Business Name* (e.g. ABC Printers):`);
  }

  if (state === 'sell_business') {
    if (['HI', 'HELLO', 'MENU', 'HEY'].includes(cmd)) {
      session.state = 'idle'; session.context = {}; await session.save();
      return useBotCmd('main_menu', phone, () => wa.sendMainMenu(phone));
    }
    const bizName = text?.trim();
    if (!bizName || bizName.length < 2) {
      return wa.sendTextMessage(phone, `Please enter a valid Business Name.`);
    }
    session.state = 'sell_city';
    session.context = { ...ctx, businessName: bizName };
    session.markModified('context');
    await session.save();
    return wa.sendTextMessage(phone, `✅ *${bizName}*\n\nEnter your *City / Location* (e.g. Mumbai):`);
  }

  if (state === 'sell_city') {
    if (['HI', 'HELLO', 'MENU', 'HEY'].includes(cmd)) {
      session.state = 'idle'; session.context = {}; await session.save();
      return useBotCmd('main_menu', phone, () => wa.sendMainMenu(phone));
    }
    const city = text?.trim();
    if (!city || city.length < 2) {
      return wa.sendTextMessage(phone, `Please enter your City / Location.`);
    }
    const { name, businessName } = ctx;
    const withPlus = `+${phone}`;

    // Phone duplicate check
    const last10s = phone.replace(/\D/g, '').slice(-10);
    const phoneExistsSell = await User.findOne({ phone: { $regex: last10s } });
    if (phoneExistsSell) {
      session.state = 'idle'; session.context = {}; await session.save();
      const magicLink = await generateMagicLink(phoneExistsSell);
      return wa.sendCtaUrlMessage(phone,
        `👋 *${phoneExistsSell.name}*, you already have an account!\n\n⚠️ Link expires in 30 minutes.`,
        'Login Now', magicLink
      );
    }

    try {
      const newSeller = await User.create({
        name,
        password: generateTempPassword(),
        phone: withPlus,
        role: 'seller',
        businessName: businessName || name,
        address: { city },
        isVerified: true,
      });

      session.userId = newSeller._id;
      session.role = 'seller';
      session.state = 'idle';
      session.context = {};
      session.markModified('context');
      await session.save();

      const magicLink = await generateMagicLink(newSeller, '/dashboard/profile');

      return wa.sendCtaUrlMessage(phone,
        `🎉 *Welcome to PrintMart as a Seller!*\n\n` +
        `👤 Name: ${name}\n` +
        `🏪 Business: ${businessName}\n` +
        `📍 City: ${city}\n` +
        `📱 Phone: ${withPlus}\n\n` +
        `⚠️ Link expires in 30 minutes.\n` +
        `Add email, GSTIN and bank details from your Profile after login.`,
        'Open Dashboard', magicLink
      );
    } catch (err) {
      console.error('[WA-Sell] Error creating seller account:', err.code, err.message);
      session.state = 'idle'; session.context = {}; await session.save();
      if (err.code === 11000) {
        return wa.sendTextMessage(phone, `⚠️ This number is already registered.\nReply *RESET* to get a login link.`);
      }
      return wa.sendTextMessage(phone, `❌ Something went wrong. Please try again later.`);
    }
  }

  // ─── FALLBACK ─────────────────────────────────────────────────────────────
  session.state = 'idle'; session.context = {}; await session.save();
  return useBotCmd('main_menu', phone, () => wa.sendMainMenu(phone));
};

// ─── Helper: find quotation ───────────────────────────────────────────────────

const findQuotationForBuyer = async (buyerId, ref, status) => {
  if (ref) {
    const allQuotes = await Quotation.find({ buyer: buyerId, status }).sort({ createdAt: -1 });
    const match = allQuotes.find((q) => String(q._id).toUpperCase().includes(ref.replace('Q-', '').replace('Q', '')));
    if (match) return match;
  }
  return Quotation.findOne({ buyer: buyerId, status }).sort({ createdAt: -1 });
};

// ─── Main webhook handler ─────────────────────────────────────────────────────

const webhookReceive = async (req, res) => {
  // Always respond 200 immediately to Meta
  res.sendStatus(200);

  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    const changes = body?.entry?.[0]?.changes;
    if (!changes) return;

    for (const change of changes) {
      const value = change?.value;

      // Handle status updates (delivered, read, etc.)
      if (value?.statuses) {
        for (const status of value.statuses) {
          await WhatsAppLog.findOneAndUpdate(
            { waMessageId: status.id },
            { status: status.status },
            { upsert: false }
          ).catch(() => {});
        }
        continue;
      }

      const messages = value?.messages;
      if (!messages || !messages.length) continue;

      const profileName = value?.contacts?.[0]?.profile?.name || '';

      for (const msg of messages) {
        const from = msg.from;
        const msgType = msg.type;
        let text = '';
        let interactiveId = null;

        if (msgType === 'text') {
          text = msg.text?.body || '';
        } else if (msgType === 'interactive') {
          const iType = msg.interactive?.type;
          // Log the full raw interactive payload so we can see exactly what Meta sends
          console.log(`[WA-Bot] Interactive msg type="${iType}" raw:`, JSON.stringify(msg.interactive));
          if (iType === 'button_reply') {
            interactiveId = msg.interactive.button_reply?.id || '';
            text = msg.interactive.button_reply?.title || '';
          } else if (iType === 'list_reply') {
            interactiveId = msg.interactive.list_reply?.id || '';
            text = msg.interactive.list_reply?.title || '';
          } else if (iType === 'button') {
            interactiveId = msg.interactive.button?.payload || msg.interactive.button?.id || '';
            text = msg.interactive.button?.text || msg.interactive.button?.title || interactiveId || '';
          } else {
            // Unknown type — still process; use raw JSON as interactiveId fallback
            interactiveId = JSON.stringify(msg.interactive);
            text = '';
          }
        }

        // Always process interactive messages even if text extraction failed
        if (!text && !interactiveId && msgType !== 'interactive') continue;

        console.log(`[WA-Bot] Message from ${from} [${msgType}]: ${text || interactiveId}`);

        // Log inbound
        await wa.logMessage({ direction: 'inbound', phone: from, messageType: msgType === 'interactive' ? 'button_reply' : msgType, message: text || interactiveId });

        const phoneVariants = [from, `+${from}`];
        const user = await User.findOne({ phone: { $in: phoneVariants } });
        const session = await getOrCreateSession(from, user);
        // Update 24h customer service window timestamp on every inbound message
        session.lastInboundAt = new Date();

        // Check active auto-reply campaigns before normal handler
        let handledByAutoReply = false;
        if (text) {
          try {
            const WhatsAppCampaign = require('../models/WhatsAppCampaign');
            const WhatsAppOptOut = require('../models/WhatsAppOptOut');
            const isOptedOut = await WhatsAppOptOut.findOne({ phone: from });
            if (!isOptedOut) {
              const campaigns = await WhatsAppCampaign.find({ type: 'auto_reply', status: 'active' });
              const lowerText = text.toLowerCase().trim();
              for (const camp of campaigns) {
                const userRole = user?.role || 'unknown';
                const rolesMatch = !camp.trigger.roles?.length ||
                  camp.trigger.roles.includes('any') || camp.trigger.roles.includes(userRole);
                if (!rolesMatch) continue;
                const match = camp.trigger.keywords?.some((kw) => {
                  if (camp.trigger.matchType === 'exact') return lowerText === kw;
                  if (camp.trigger.matchType === 'starts_with') return lowerText.startsWith(kw);
                  return lowerText.includes(kw); // contains
                });
                if (match) {
                  if (camp.response.messageType === 'template' && camp.response.templateName) {
                    const components = camp.response.templateParams?.length
                      ? [{ type: 'body', parameters: camp.response.templateParams.map((t) => ({ type: 'text', text: t })) }] : [];
                    await wa.sendTemplateMessage(from, camp.response.templateName, camp.response.templateLanguage || 'en', components);
                  } else {
                    await wa.sendTextMessage(from, camp.response.content);
                  }
                  camp.stats.sent = (camp.stats.sent || 0) + 1;
                  await camp.save();
                  handledByAutoReply = true;
                  break;
                }
              }
            }
          } catch (arErr) {
            console.error('[WA-Bot] Auto-reply check error:', arErr.message);
          }
        }

        if (!handledByAutoReply) {
          try {
            const upperText = text?.trim().toUpperCase();
            const loginUrl = process.env.CLIENT_URL || 'https://shop.instify.in';

            // REGISTER — already registered: send magic login link
            if (['REGISTER', 'JOIN', 'SIGNUP', 'NEW ACCOUNT', 'START'].includes(upperText) && user) {
              const magicLink = await generateMagicLink(user);
              await wa.sendCtaUrlMessage(from,
                `👋 Welcome back, *${user.name}*!\n\n` +
                `You already have a PrintMart account.\n\n` +
                (user.email ? `📧 Email: ${user.email}\n` : '') +
                `📱 Phone: ${user.phone}\n` +
                `👤 Role: ${user.role}\n\n` +
                `⚠️ Link expires in 30 minutes.`,
                'Login Now', magicLink
              );

            // RESET — send magic login link
            } else if (upperText === 'RESET' && user) {
              const magicLink = await generateMagicLink(user);
              await wa.sendCtaUrlMessage(from,
                `🔑 *Password Reset*\n\n` +
                `Tap below to login and set a new password.\n\n` +
                `⚠️ Link expires in 30 minutes.\n` +
                `Go to Profile → Change Password after logging in.`,
                'Reset Password', magicLink
              );

            // SELLER — buyer requesting upgrade (collect mandatory business details)
            } else if (upperText === 'SELLER' && user?.role === 'buyer') {
              session.state = 'upgrade_seller_business';
              session.context = {};
              session.markModified('context');
              await session.save();
              await wa.sendTextMessage(from,
                `🏪 *Become a Seller on PrintMart*\n\n` +
                `As a seller you can:\n` +
                `✅ List your products & services\n` +
                `✅ Receive buyer inquiries\n` +
                `✅ Send quotations & manage orders\n` +
                `✅ Get WhatsApp lead notifications\n\n` +
                `To get started, enter your *Business Name*:`
              );

            // BUYER — seller requesting buyer mode
            } else if (upperText === 'BUYER' && user?.role === 'seller') {
              await wa.sendTextMessage(from,
                `🛒 *Buyer Mode*\n\n` +
                `As a seller on PrintMart, you can also browse and inquire about products as a buyer.\n\n` +
                `Visit the app to:\n` +
                `• Browse products\n` +
                `• Send inquiries to other sellers\n` +
                `• Compare prices\n\n` +
                `🔗 ${loginUrl}/products\n\n` +
                `Your seller dashboard remains active. Reply *MENU* for seller commands.`
              );

            } else if (!user || session.state?.startsWith('reg_') || session.state?.startsWith('guest_') || session.state?.startsWith('sell_')) {
              await handleUnknownUser(from, text, interactiveId, session, profileName);
            } else if (user.role === 'seller' || user.role === 'admin') {
              await handleSellerMessage(from, user, text, interactiveId);
            } else {
              await handleBuyerMessage(from, user, text, interactiveId, session);
            }
          } catch (handlerErr) {
            console.error(`[WA-Bot] Handler error for ${from}:`, handlerErr.message);
            await wa.sendTextMessage(from, `Sorry, something went wrong. Please try again or reply *MENU*.`);
          }
        }

        session.lastActivity = new Date();
        await session.save();
      }
    }
  } catch (err) {
    console.error('[WA-Bot] webhookReceive error:', err.message);
  }
};

module.exports = { webhookVerify, webhookReceive };
