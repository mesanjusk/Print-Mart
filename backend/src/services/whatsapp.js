const axios = require('axios');
const WhatsAppLog = require('../models/WhatsAppLog');

const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

const normalisePhone = (phone) => {
  const str = String(phone).trim().replace(/\s|-/g, '');
  if (str.startsWith('+')) return str.slice(1);
  if (str.startsWith('0')) return `91${str.slice(1)}`;
  if (str.length === 10) return `91${str}`;
  return str;
};

const logMessage = async ({ direction, phone, userId, messageType, message, metadata, waMessageId }) => {
  try {
    await WhatsAppLog.create({ direction, phone, userId: userId || null, messageType, message, metadata: metadata || {}, waMessageId, status: direction === 'outbound' ? 'sent' : 'received' });
  } catch (e) {
    // logging must never break main flow
  }
};

const sendRaw = async (to, payload) => {
  if (!PHONE_ID || !ACCESS_TOKEN) {
    console.warn('[WhatsApp] Missing credentials – skipping send.');
    return null;
  }
  const recipient = normalisePhone(to);
  const url = `https://graph.facebook.com/v18.0/${PHONE_ID}/messages`;
  try {
    const { data } = await axios.post(
      url,
      { messaging_product: 'whatsapp', to: recipient, ...payload },
      { headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' } }
    );
    return data;
  } catch (err) {
    console.error('[WhatsApp] send error:', err?.response?.data || err.message);
    return null;
  }
};

const sendTextMessage = async (to, message, userId) => {
  const result = await sendRaw(to, { type: 'text', text: { body: message } });
  await logMessage({ direction: 'outbound', phone: normalisePhone(to), userId, messageType: 'text', message, waMessageId: result?.messages?.[0]?.id });
  return result;
};

// Send interactive button message (max 3 buttons)
const sendButtonMessage = async (to, bodyText, buttons, userId) => {
  const payload = {
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.map((b) => ({
          type: 'reply',
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  };
  const result = await sendRaw(to, payload);
  await logMessage({ direction: 'outbound', phone: normalisePhone(to), userId, messageType: 'interactive', message: bodyText, metadata: { buttons }, waMessageId: result?.messages?.[0]?.id });
  return result;
};

// Send interactive list message
const sendListMessage = async (to, bodyText, buttonLabel, sections, userId) => {
  const payload = {
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: bodyText },
      action: {
        button: buttonLabel.slice(0, 20),
        sections: sections.map((s) => ({
          title: s.title.slice(0, 24),
          rows: s.rows.map((r) => ({
            id: r.id,
            title: r.title.slice(0, 24),
            description: (r.description || '').slice(0, 72),
          })),
        })),
      },
    },
  };
  const result = await sendRaw(to, payload);
  await logMessage({ direction: 'outbound', phone: normalisePhone(to), userId, messageType: 'interactive', message: bodyText, metadata: { sections } });
  return result;
};

// ─── Template Messages (Meta pre-approved required for business-initiated) ───

const sendTemplateMessage = async (to, templateName, languageCode, components, userId) => {
  const payload = {
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode || 'en' },
      ...(components?.length ? { components } : {}),
    },
  };
  const result = await sendRaw(to, payload);
  await logMessage({
    direction: 'outbound',
    phone: normalisePhone(to),
    userId,
    messageType: 'template',
    message: templateName,
    metadata: { templateName, components },
    waMessageId: result?.messages?.[0]?.id,
  });
  return result;
};

// Requires Meta-approved AUTHENTICATION template: printmart_account_verification
// Template body: "{{1}} is your PrintMart verification code. Valid for 10 minutes. Do not share this code."
const sendVerificationOTP = async (phone, otp, userId) => {
  if (!phone) return null;
  return sendTemplateMessage(phone, 'printmart_account_verification', 'en', [
    {
      type: 'body',
      parameters: [{ type: 'text', text: otp }],
    },
    {
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{ type: 'text', text: otp }],
    },
  ], userId);
};

// Requires Meta-approved AUTHENTICATION template: printmart_password_reset
// Template body: "{{1}} is your PrintMart password reset code. Valid for 10 minutes. Do not share this code."
const sendPasswordResetOTP = async (phone, otp, userId) => {
  if (!phone) return null;
  return sendTemplateMessage(phone, 'printmart_password_reset', 'en', [
    {
      type: 'body',
      parameters: [{ type: 'text', text: otp }],
    },
    {
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{ type: 'text', text: otp }],
    },
  ], userId);
};

// ─── Business Notification Messages ─────────────────────────────────────────

const sendWelcomeBuyer = async (phone, name, userId) => {
  const body =
    `👋 Welcome to *PrintMart*, ${name || 'there'}!\n\n` +
    `I can help you with:\n` +
    `📦 *1* – Check my inquiries & orders\n` +
    `📋 *2* – View quotations\n` +
    `🚚 *3* – Track orders\n` +
    `🔤 *HELP* – Show all commands\n\n` +
    `Reply with the number or command to continue.`;
  return sendTextMessage(phone, body, userId);
};

const sendWelcomeSeller = async (phone, name, userId) => {
  const body =
    `👋 Welcome back, *${name || 'Vendor'}*!\n\n` +
    `Quick commands:\n` +
    `📨 *STATUS* – Pending inquiries & orders\n` +
    `💰 *QUOTE [amount]* – Send quotation for latest inquiry\n` +
    `   e.g.  QUOTE 5000\n` +
    `🚚 *DISPATCH [order]* [tracking] – Mark dispatched\n` +
    `   e.g.  DISPATCH PM-2024-0001 TRK123\n` +
    `✅ *DELIVER [order]* – Mark delivered\n` +
    `   e.g.  DELIVER PM-2024-0001\n` +
    `🔤 *HELP* – Show all commands`;
  return sendTextMessage(phone, body, userId);
};

const sendHelpBuyer = async (phone, userId) => {
  const body =
    `*PrintMart Commands (Buyer)*\n\n` +
    `*STATUS* – View open inquiries & orders\n` +
    `*ORDERS* – List your recent orders\n` +
    `*QUOTES* – View pending quotations\n` +
    `*ACCEPT* – Accept latest quotation\n` +
    `*REJECT* – Reject latest quotation\n` +
    `*PAID [order-number]* – Confirm payment\n` +
    `  e.g.  PAID PM-2024-0001\n` +
    `*TRACK [order-number]* – Get tracking info\n` +
    `  e.g.  TRACK PM-2024-0001\n` +
    `*CANCEL [order-number]* – Cancel order\n` +
    `*SELLER* – Upgrade account to Seller\n` +
    `*RESET* – Get a new temporary password\n\n` +
    `Or just type a message to reply to your latest inquiry.`;
  return sendTextMessage(phone, body, userId);
};

const sendHelpSeller = async (phone, userId) => {
  const body =
    `*PrintMart Commands (Vendor)*\n\n` +
    `*STATUS* – Pending inquiries & active orders\n` +
    `*QUOTE [amount]* – Quotation for latest inquiry\n` +
    `  e.g.  QUOTE 5000\n` +
    `*QUOTE [inq-prefix] [amount]* – Specific inquiry\n` +
    `  e.g.  QUOTE INQ123 8000\n` +
    `*DISPATCH [order] [tracking]* – Mark dispatched\n` +
    `  e.g.  DISPATCH PM-2024-0001 DTDC-TRK789\n` +
    `*DELIVER [order]* – Mark as delivered\n` +
    `  e.g.  DELIVER PM-2024-0001\n` +
    `*ORDERS* – Active orders summary\n` +
    `*BUYER* – Info on browsing & buying as a seller\n` +
    `*RESET* – Get a new temporary password\n\n` +
    `Or just reply to this chat to respond to an inquiry.`;
  return sendTextMessage(phone, body, userId);
};

const sendInquiryNotificationToSeller = async (sellerPhone, buyerName, productName, message, quantity, unit, inquiryId, userId) => {
  if (!sellerPhone) return null;
  const shortId = String(inquiryId).slice(-6).toUpperCase();
  const body =
    `🔔 *New Inquiry – PrintMart*\n\n` +
    `*Buyer:* ${buyerName}\n` +
    `*Product:* ${productName}\n` +
    `*Quantity:* ${quantity} ${unit}\n` +
    `*Message:* ${message}\n` +
    `*Ref:* INQ-${shortId}\n\n` +
    `Reply here to respond to this inquiry, or send:\n` +
    `*QUOTE [amount]* to create a quotation\n` +
    `e.g.  QUOTE 5000`;
  return sendTextMessage(sellerPhone, body, userId);
};

const sendInquiryConfirmationToBuyer = async (buyerPhone, productName, sellerBusiness, userId) => {
  if (!buyerPhone) return null;
  const body =
    `✅ *Inquiry Submitted – PrintMart*\n\n` +
    `Your inquiry for *${productName}* has been sent to *${sellerBusiness}*.\n\n` +
    `You will receive a WhatsApp notification when the seller responds.\n\n` +
    `Reply to this chat to add more details to your inquiry.`;
  return sendTextMessage(buyerPhone, body, userId);
};

const sendInquiryReplyToUser = async (phone, senderName, replyMessage, userId) => {
  if (!phone) return null;
  const body =
    `💬 *Reply from ${senderName} – PrintMart*\n\n` +
    `${replyMessage}\n\n` +
    `Reply here to continue the conversation.`;
  return sendTextMessage(phone, body, userId);
};

const sendQuotationToClient = async (clientPhone, quotationDetails, sellerName, userId) => {
  if (!clientPhone) return null;
  const { _id, subtotal, tax, taxAmount, total, validUntil, notes, items = [] } = quotationDetails;
  const shortId = String(_id).slice(-6).toUpperCase();
  const validDate = validUntil
    ? new Date(validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'N/A';

  const itemLines = items
    .slice(0, 5)
    .map((i) => `  • ${i.description} (${i.quantity} ${i.unit}) @ ₹${i.unitPrice} = ₹${i.total}`)
    .join('\n');

  const body =
    `📋 *Quotation Received – PrintMart*\n` +
    `*Ref:* Q-${shortId}\n` +
    `*From:* ${sellerName || 'Vendor'}\n\n` +
    (itemLines ? `*Items:*\n${itemLines}\n\n` : '') +
    `*Subtotal:* ₹${(subtotal || 0).toFixed(2)}\n` +
    `*Tax (${tax || 0}%):* ₹${(taxAmount || 0).toFixed(2)}\n` +
    `*Total:* ₹${(total || 0).toFixed(2)}\n` +
    `*Valid Until:* ${validDate}\n` +
    (notes ? `*Notes:* ${notes}\n` : '') +
    `\nReply *ACCEPT* to confirm or *REJECT* to decline.`;

  return sendTextMessage(clientPhone, body, userId);
};

const sendOrderConfirmation = async (phone, order, role, userId) => {
  if (!phone) return null;
  const isbuyer = role === 'buyer';
  const body =
    `🎉 *Order Confirmed – PrintMart*\n\n` +
    `*Order No:* ${order.orderNumber}\n` +
    `*Total:* ₹${(order.total || 0).toFixed(2)}\n` +
    `*Status:* Payment Pending\n\n` +
    (isbuyer
      ? `Please make payment of ₹${(order.total || 0).toFixed(2)} via bank transfer.\n` +
        `Once paid, reply: *PAID ${order.orderNumber}*\n\n` +
        `Track order: reply *TRACK ${order.orderNumber}*`
      : `A new order has been placed.\n` +
        `Please prepare the order once payment is confirmed.\n` +
        `Reply *STATUS* to see all pending orders.`);
  return sendTextMessage(phone, body, userId);
};

const sendPaymentConfirmed = async (phone, order, role, userId) => {
  if (!phone) return null;
  const isBuyer = role === 'buyer';
  const body =
    `✅ *Payment Confirmed – PrintMart*\n\n` +
    `*Order:* ${order.orderNumber}\n` +
    `*Amount:* ₹${(order.total || 0).toFixed(2)}\n\n` +
    (isBuyer
      ? `Your payment has been confirmed. Your order is now being processed.`
      : `Payment confirmed for Order ${order.orderNumber}.\nPlease process and dispatch the order.\nSend: *DISPATCH ${order.orderNumber} [tracking-number]*`);
  return sendTextMessage(phone, body, userId);
};

const sendDispatchNotification = async (buyerPhone, order, userId) => {
  if (!buyerPhone) return null;
  const body =
    `🚚 *Order Dispatched – PrintMart*\n\n` +
    `*Order:* ${order.orderNumber}\n` +
    `*Tracking:* ${order.trackingInfo || 'Will be updated shortly'}\n\n` +
    `Your order is on the way!\n` +
    `Reply *TRACK ${order.orderNumber}* for latest status.`;
  return sendTextMessage(buyerPhone, body, userId);
};

const sendDeliveryConfirmation = async (phone, order, role, userId) => {
  if (!phone) return null;
  const isBuyer = role === 'buyer';
  const body =
    `📦 *Order ${isBuyer ? 'Delivered' : 'Marked Delivered'} – PrintMart*\n\n` +
    `*Order:* ${order.orderNumber}\n\n` +
    (isBuyer
      ? `Your order has been delivered! Thank you for shopping with PrintMart. 🙏`
      : `Order ${order.orderNumber} has been marked as delivered.`);
  return sendTextMessage(phone, body, userId);
};

const sendQuotationResponse = async (sellerPhone, order, status, userId) => {
  if (!sellerPhone) return null;
  const accepted = status === 'accepted';
  const body =
    `${accepted ? '✅' : '❌'} *Quotation ${accepted ? 'Accepted' : 'Rejected'} – PrintMart*\n\n` +
    (accepted
      ? `Great news! Your quotation has been accepted.\n*Order:* ${order?.orderNumber || 'N/A'}\n*Total:* ₹${(order?.total || 0).toFixed(2)}\n\nPrepare order after payment confirmation.\nReply *STATUS* to see order details.`
      : `Your quotation was declined by the buyer.\nSend a revised quotation using:\n*QUOTE [amount]*`);
  return sendTextMessage(sellerPhone, body, userId);
};

const sendCancellationNotice = async (phone, order, reason, userId) => {
  if (!phone) return null;
  const body =
    `❌ *Order Cancelled – PrintMart*\n\n` +
    `*Order:* ${order.orderNumber}\n` +
    (reason ? `*Reason:* ${reason}\n` : '') +
    `\nContact support if you have questions.`;
  return sendTextMessage(phone, body, userId);
};

const sendBroadcast = async (phones, message) => {
  const results = [];
  for (const phone of phones) {
    const r = await sendTextMessage(phone, message);
    results.push({ phone, success: !!r });
    await new Promise((res) => setTimeout(res, 100));
  }
  return results;
};


const sendBuyerReplyNotificationToSeller = async (sellerPhone, buyerName, productName, replyText) => {
  if (!sellerPhone) return null;
  const body =
    `*Buyer Replied – PrintMart*\n\n` +
    `*${buyerName}* has replied to the inquiry for *${productName}*.\n\n` +
    `*Message:* ${replyText}\n\n` +
    `Log in to PrintMart to respond.`;
  return sendTextMessage(sellerPhone, body);
};

const broadcastInquiryToSellers = async (sellers, specs, buyerName) => {
  if (!sellers || sellers.length === 0) return;
  const specLines = [
    specs.quantity ? `*Quantity:* ${specs.quantity} ${specs.unit || 'pcs'}` : null,
    specs.finish ? `*Finish:* ${specs.finish}` : null,
    specs.size ? `*Size:* ${specs.size}` : null,
    specs.paperWeight ? `*Paper:* ${specs.paperWeight} gsm` : null,
    specs.deliveryDays ? `*Delivery needed in:* ${specs.deliveryDays} days` : null,
  ].filter(Boolean).join('\n');
  const body =
    `*New Inquiry Broadcast – PrintMart*\n\n` +
    `A buyer (*${buyerName}*) is looking for:\n` +
    `*Product:* ${specs.productName || specs.category}\n` +
    `${specLines}\n\n` +
    `If you can fulfill this order, log in to PrintMart and send a quotation.`;
  const results = await Promise.allSettled(
    sellers.map((s) => s.phone ? sendTextMessage(s.phone, body) : Promise.resolve(null))
  );
  const sent = results.filter((r) => r.status === 'fulfilled' && r.value).length;
  console.log(`[WhatsApp] Broadcast sent to ${sent}/${sellers.length} sellers.`);
};

const sendMorningDigest = async (sellerPhone, sellerName, pendingCount, offerCount) => {
  if (!sellerPhone) return null;
  const body =
    `*Good Morning, ${sellerName}! 🌅 — PrintMart*\n\n` +
    `Here's your daily update:\n\n` +
    `📬 *Pending Leads:* ${pendingCount}\n` +
    `🔥 *Active Offers:* ${offerCount}\n\n` +
    `Log in to respond and grow your business!\n` +
    `👉 https://shop.instify.in/dashboard/inquiries`;
  return sendTextMessage(sellerPhone, body);
};
const verifyWebhook = (mode, token, challenge) => {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  console.log('[WA-Webhook] mode:', mode, '| received token:', token, '| expected:', verifyToken);
  if (!verifyToken) {
    console.warn('[WhatsApp] WHATSAPP_VERIFY_TOKEN not set.');
    return null;
  }
  if (mode === 'subscribe' && token === verifyToken) return challenge;
  return null;
};

module.exports = {
  normalisePhone,
  sendTemplateMessage,
  sendVerificationOTP,
  sendPasswordResetOTP,
  sendTextMessage,
  sendButtonMessage,
  sendListMessage,
  sendWelcomeBuyer,
  sendWelcomeSeller,
  sendHelpBuyer,
  sendHelpSeller,
  sendInquiryNotificationToSeller,
  sendInquiryConfirmationToBuyer,
  sendInquiryReplyToUser,
  sendQuotationToClient,
  sendOrderConfirmation,
  sendPaymentConfirmed,
  sendDispatchNotification,
  sendDeliveryConfirmation,
  sendQuotationResponse,
  sendCancellationNotice,
  sendBroadcast,
  sendBuyerReplyNotificationToSeller,
  broadcastInquiryToSellers,
  sendMorningDigest,
  verifyWebhook,
  logMessage,
};
