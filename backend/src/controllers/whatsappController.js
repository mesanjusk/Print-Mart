const Inquiry = require('../models/Inquiry');
const User = require('../models/User');
const Quotation = require('../models/Quotation');
const Order = require('../models/Order');
const WhatsAppSession = require('../models/WhatsAppSession');
const WhatsAppLog = require('../models/WhatsAppLog');
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

  // Seller upgrade confirmation
  if (session?.state === 'upgrade_seller_confirm') {
    if (upperText === 'YES') {
      user.role = 'seller';
      await user.save();
      session.state = 'idle';
      session.role = 'seller';
      await session.save();
      return wa.sendTextMessage(phone,
        `🎉 *Account Upgraded to Seller!*\n\n` +
        `Welcome to the PrintMart seller community, *${user.name}*!\n\n` +
        `Next steps:\n` +
        `1. Login to your account\n` +
        `2. Complete your business profile\n` +
        `3. Add your products/services\n\n` +
        `🔗 ${process.env.CLIENT_URL || 'https://app.instify.in'}/login\n\n` +
        `Reply *MENU* to see your new seller commands.`,
        user._id
      );
    } else {
      session.state = 'idle';
      await session.save();
      return wa.sendTextMessage(phone, `No problem! You remain a buyer. Reply *MENU* anytime.`, user._id);
    }
  }

  if (cmd.cmd === 'MENU') {
    return wa.sendWelcomeBuyer(phone, user.name, user._id);
  }

  if (cmd.cmd === 'HELP') {
    return wa.sendHelpBuyer(phone, user._id);
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

  // Default: reply to most recent open inquiry
  const inquiry = await Inquiry.findOne({ buyer: user._id, status: { $in: ['pending', 'responded'] } })
    .sort({ createdAt: -1 }).populate('seller', 'name phone');
  if (inquiry) {
    inquiry.replies.push({ sender: user._id, message: text });
    await inquiry.save();
    // Notify seller of buyer reply
    if (inquiry.seller?.phone) {
      await wa.sendInquiryReplyToUser(inquiry.seller.phone, user.name, text, inquiry.seller._id);
    }
    return wa.sendTextMessage(phone, `✅ Your reply has been sent to the vendor.`, user._id);
  }
  return wa.sendWelcomeBuyer(phone, user.name, user._id);
};

// ─── Seller flows ─────────────────────────────────────────────────────────────

const handleSellerMessage = async (phone, user, text, interactiveId) => {
  const cmd = interactiveId ? { cmd: interactiveId.toUpperCase() } : parseCommand(text);

  if (cmd.cmd === 'MENU') {
    return wa.sendWelcomeSeller(phone, user.name, user._id);
  }

  if (cmd.cmd === 'HELP') {
    return wa.sendHelpSeller(phone, user._id);
  }

  if (cmd.cmd === 'STATUS') {
    const inquiries = await Inquiry.find({ seller: user._id, status: { $in: ['pending', 'responded'] } })
      .populate('buyer', 'name').populate('product', 'name').sort({ createdAt: -1 }).limit(5);
    const orders = await Order.find({ seller: user._id, status: { $in: ['paid', 'processing', 'dispatched'] } })
      .sort({ createdAt: -1 }).limit(5);

    let body = `📊 *Vendor Status – PrintMart*\n\n`;
    if (inquiries.length) {
      body += `*Pending Inquiries (${inquiries.length}):*\n`;
      inquiries.forEach((inq, i) => {
        const shortId = String(inq._id).slice(-6).toUpperCase();
        body += `${i + 1}. INQ-${shortId} – ${inq.product?.name || 'Product'} from ${inq.buyer?.name || 'Buyer'} [${inq.status}]\n`;
      });
      body += '\n';
    }
    if (orders.length) {
      body += `*Active Orders (${orders.length}):*\n`;
      orders.forEach((o, i) => {
        body += `${i + 1}. ${o.orderNumber} – ₹${o.total.toFixed(2)} [${o.status.replace('_', ' ')}]\n`;
      });
    }
    if (!inquiries.length && !orders.length) body += `No pending inquiries or active orders. 🎉`;
    return wa.sendTextMessage(phone, body, user._id);
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

  // Default: reply to most recent open inquiry
  const inquiry = await Inquiry.findOne({ seller: user._id, status: { $in: ['pending', 'responded'] } })
    .sort({ createdAt: -1 }).populate('buyer', 'name phone');
  if (inquiry) {
    inquiry.replies.push({ sender: user._id, message: text });
    inquiry.status = 'responded';
    await inquiry.save();
    if (inquiry.buyer?.phone) {
      await wa.sendInquiryReplyToUser(inquiry.buyer.phone, user.name || 'Vendor', text, inquiry.buyer._id);
    }
    return wa.sendTextMessage(phone, `✅ Reply sent to ${inquiry.buyer?.name || 'buyer'}.`, user._id);
  }
  return wa.sendWelcomeSeller(phone, user.name, user._id);
};

// ─── Unknown user flow ────────────────────────────────────────────────────────

// ─── WhatsApp Registration Flow ──────────────────────────────────────────────

const generateTempPassword = () => String(Math.floor(1000000 + Math.random() * 9000000)); // 7 digits

const handleUnknownUser = async (phone, text, session) => {
  const cmd = text?.trim().toUpperCase();
  const state = session?.state || 'idle';
  const ctx = session?.context || {};

  // Entry points
  if (state === 'idle' || !state.startsWith('reg_')) {
    // Guest inquiry — no registration needed
    if (['INQUIRE', 'INQUIRY', 'ENQUIRE', 'ENQUIRY', 'QUOTE', 'PRICE'].includes(cmd)) {
      session.state = 'guest_inquiry';
      session.context = {};
      await session.save();
      return wa.sendTextMessage(phone,
        `📩 *Send an Inquiry – No Registration Needed!*\n\n` +
        `Just tell us what you're looking for:\n\n` +
        `Type your message in this format:\n` +
        `*Product name | Quantity | Your name*\n\n` +
        `Example:\n` +
        `_Business Cards | 500 pcs | Rahul_\n\n` +
        `We'll forward your inquiry to relevant sellers and they'll contact you here on WhatsApp! 📱\n\n` +
        `💡 Register for free to track all your inquiries: reply *REGISTER*`
      );
    }

    if (['REGISTER', 'JOIN', 'SIGNUP', 'NEW ACCOUNT', 'START'].includes(cmd)) {
      session.state = 'reg_role';
      session.context = {};
      await session.save();
      return wa.sendTextMessage(phone,
        `👋 Welcome to *PrintMart*!\n\n` +
        `Register as:\n` +
        `1️⃣ *BUYER* – Browse & purchase products\n` +
        `2️⃣ *SELLER* – List & sell your products\n\n` +
        `Reply *1* or *BUYER* / *2* or *SELLER*`
      );
    }
    // Default unknown user message
    return wa.sendTextMessage(phone,
      `👋 Welcome to *PrintMart*!\n\n` +
      `You don't have an account yet.\n\n` +
      `📝 To register, reply *REGISTER*\n` +
      `🌐 Or sign up at: ${process.env.CLIENT_URL || 'https://print-mart.vercel.app'}/register`
    );
  }

  // Step 1: choose role
  if (state === 'reg_role') {
    let role = null;
    if (['1', 'BUYER'].includes(cmd)) role = 'buyer';
    if (['2', 'SELLER'].includes(cmd)) role = 'seller';
    if (!role) {
      return wa.sendTextMessage(phone, `Please reply *1* for Buyer or *2* for Seller.`);
    }
    session.state = 'reg_name';
    session.context = { role };
    await session.save();
    return wa.sendTextMessage(phone, `Great! You chose *${role.toUpperCase()}*.\n\nPlease enter your *full name*:`);
  }

  // Step 2: name
  if (state === 'reg_name') {
    const name = text?.trim();
    if (!name || name.length < 2) {
      return wa.sendTextMessage(phone, `Please enter a valid full name (at least 2 characters).`);
    }
    session.state = 'reg_email';
    session.context = { ...ctx, name };
    await session.save();
    return wa.sendTextMessage(phone, `Nice to meet you, *${name}*! 😊\n\nPlease enter your *email address*:`);
  }

  // Step 3: email
  if (state === 'reg_email') {
    const email = text?.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return wa.sendTextMessage(phone, `❌ That doesn't look like a valid email.\n\nPlease enter a valid *email address*:`);
    }

    // Check if email already exists
    const existing = await User.findOne({ email });
    if (existing) {
      session.state = 'idle';
      session.context = {};
      await session.save();
      return wa.sendTextMessage(phone,
        `⚠️ This email is already registered.\n\n` +
        `🔑 Login at: ${process.env.CLIENT_URL || 'https://print-mart.vercel.app'}/login\n\n` +
        `Forgot password? Reply *RESET*`
      );
    }

    // Create account
    const tempPassword = generateTempPassword();
    const { name, role } = ctx;

    try {
      const user = await User.create({
        name,
        email,
        password: tempPassword,
        phone: `+${phone}`,
        role,
        isVerified: true, // WhatsApp verified
      });

      session.userId = user._id;
      session.role = role;
      session.state = 'idle';
      session.context = {};
      await session.save();

      const loginUrl = `${process.env.CLIENT_URL || 'https://print-mart.vercel.app'}/login`;

      await wa.sendTextMessage(phone,
        `✅ *Account Created Successfully!*\n\n` +
        `📋 *Your Login Details:*\n` +
        `👤 Name: ${name}\n` +
        `📧 Email: ${email}\n` +
        `🔑 Temp Password: *${tempPassword}*\n\n` +
        `🔗 Login here: ${loginUrl}\n\n` +
        `⚠️ *Important:* Please change your password after first login.\n\n` +
        `After login, complete your profile to activate your full account.`
      );

      console.log(`[WA-Register] New ${role} account created: ${email} (${name}) from ${phone}`);
    } catch (err) {
      console.error('[WA-Register] Error creating account:', err.message);
      session.state = 'idle';
      session.context = {};
      await session.save();
      return wa.sendTextMessage(phone, `❌ Something went wrong. Please try again or register at our website.`);
    }
    return;
  }

  // Guest inquiry submission
  if (state === 'guest_inquiry') {
    const parts = text.split('|').map((s) => s.trim());
    const productName = parts[0];
    const quantity = parts[1] || 'Not specified';
    const guestName = parts[2] || 'Guest';

    if (!productName || productName.length < 2) {
      return wa.sendTextMessage(phone,
        `Please use the format:\n*Product | Quantity | Your name*\n\nExample:\n_Business Cards | 500 pcs | Rahul_`
      );
    }

    // Save as a guest inquiry in WhatsApp log (no DB Inquiry record — no registered user)
    await wa.logMessage({
      direction: 'inbound',
      phone,
      messageType: 'text',
      message: `[GUEST INQUIRY] ${text}`,
    });

    session.state = 'idle';
    session.context = {};
    await session.save();

    // Notify admin via WhatsApp
    const adminPhone = process.env.ADMIN_WHATSAPP_PHONE;
    if (adminPhone) {
      await wa.sendTextMessage(adminPhone,
        `📩 *New Guest Inquiry*\n\n` +
        `📱 From: +${phone}\n` +
        `👤 Name: ${guestName}\n` +
        `📦 Product: ${productName}\n` +
        `📊 Quantity: ${quantity}\n\n` +
        `Reply directly to this number on WhatsApp to follow up.`
      ).catch(() => {});
    }

    return wa.sendTextMessage(phone,
      `✅ *Inquiry Received!*\n\n` +
      `*Product:* ${productName}\n` +
      `*Quantity:* ${quantity}\n\n` +
      `Our team will connect you with the right sellers shortly. They'll message you here on WhatsApp.\n\n` +
      `📝 Register for free to track your inquiries:\nReply *REGISTER*`
    );
  }

  // Reset flow
  if (cmd === 'RESET') {
    session.state = 'idle';
    session.context = {};
    await session.save();
    return wa.sendTextMessage(phone,
      `To reset your password, visit:\n${process.env.CLIENT_URL || 'https://app.instify.in'}/forgot-password`
    );
  }

  // Fallback
  session.state = 'idle';
  session.context = {};
  await session.save();
  return wa.sendTextMessage(phone,
    `👋 Welcome to *PrintMart*!\n\n` +
    `📩 *INQUIRE* – Send an inquiry without registering\n` +
    `📝 *REGISTER* – Create a free account\n\n` +
    `Reply with a command to get started.`
  );
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

      for (const msg of messages) {
        const from = msg.from;
        const msgType = msg.type;
        let text = '';
        let interactiveId = null;

        if (msgType === 'text') {
          text = msg.text?.body || '';
        } else if (msgType === 'interactive') {
          const iType = msg.interactive?.type;
          if (iType === 'button_reply') {
            interactiveId = msg.interactive.button_reply?.id || '';
            text = msg.interactive.button_reply?.title || '';
          } else if (iType === 'list_reply') {
            interactiveId = msg.interactive.list_reply?.id || '';
            text = msg.interactive.list_reply?.title || '';
          }
        }

        if (!text && !interactiveId) continue;

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
            const generateTempPwd = () => String(Math.floor(1000000 + Math.random() * 9000000));
            const loginUrl = process.env.CLIENT_URL || 'https://app.instify.in';

            // REGISTER — already registered: reset & send temp password
            if (['REGISTER', 'JOIN', 'SIGNUP', 'NEW ACCOUNT', 'START'].includes(upperText) && user) {
              const tempPassword = generateTempPwd();
              user.password = tempPassword;
              await user.save();
              await wa.sendTextMessage(from,
                `👋 Welcome back, *${user.name}*!\n\n` +
                `You already have a PrintMart account.\n\n` +
                `📧 Email: ${user.email}\n` +
                `👤 Role: ${user.role}\n` +
                `🔑 Temp Password: *${tempPassword}*\n\n` +
                `🔗 Login: ${loginUrl}/login\n\n` +
                `⚠️ Change your password after login.\n` +
                `Reply *MENU* after logging in.`
              );

            // RESET — password reset for existing users
            } else if (upperText === 'RESET' && user) {
              const tempPassword = generateTempPwd();
              user.password = tempPassword;
              await user.save();
              await wa.sendTextMessage(from,
                `🔑 *Password Reset*\n\n` +
                `Your new temporary password:\n\n` +
                `*${tempPassword}*\n\n` +
                `🔗 Login: ${loginUrl}/login\n\n` +
                `⚠️ Change your password after login via Profile settings.`
              );

            // SELLER — buyer requesting upgrade to seller
            } else if (upperText === 'SELLER' && user?.role === 'buyer') {
              session.state = 'upgrade_seller_confirm';
              await session.save();
              await wa.sendTextMessage(from,
                `🏪 *Become a Seller on PrintMart*\n\n` +
                `As a seller you can:\n` +
                `✅ List your products & services\n` +
                `✅ Receive buyer inquiries\n` +
                `✅ Send quotations & manage orders\n` +
                `✅ Get WhatsApp lead notifications\n\n` +
                `Reply *YES* to upgrade your account to Seller.\n` +
                `Reply *NO* to cancel.`
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

            } else if (!user || session.state?.startsWith('reg_')) {
              await handleUnknownUser(from, text, session);
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
