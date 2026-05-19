const axios = require('axios');

const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

/**
 * Normalise a phone number: prepend +91 if no + prefix present.
 */
const normalisePhone = (phone) => {
  const str = String(phone).trim();
  if (str.startsWith('+')) return str.replace('+', '');
  return `91${str}`;
};

/**
 * POST a text message to the WhatsApp Cloud API.
 * @param {string} to   Recipient phone number
 * @param {string} message  Plain-text body
 * @returns {object|null}
 */
const sendTextMessage = async (to, message) => {
  if (!PHONE_ID || !ACCESS_TOKEN) {
    console.warn('[WhatsApp] Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN – skipping send.');
    return null;
  }

  const recipient = normalisePhone(to);
  const url = `https://graph.facebook.com/v18.0/${PHONE_ID}/messages`;

  try {
    const { data } = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return data;
  } catch (err) {
    console.error('[WhatsApp] sendTextMessage error:', err?.response?.data || err.message);
    return null;
  }
};

/**
 * Notify a seller that a new inquiry has arrived.
 */
const sendInquiryNotificationToSeller = async (
  sellerPhone,
  buyerName,
  productName,
  message,
  quantity,
  unit
) => {
  if (!sellerPhone) {
    console.warn('[WhatsApp] sendInquiryNotificationToSeller: no seller phone provided.');
    return null;
  }

  const body =
    `*New Inquiry – PrintMart*\n\n` +
    `You have received a new inquiry.\n\n` +
    `*Buyer:* ${buyerName}\n` +
    `*Product:* ${productName}\n` +
    `*Quantity:* ${quantity} ${unit}\n` +
    `*Message:* ${message}\n\n` +
    `Please log in to PrintMart to respond.`;

  return sendTextMessage(sellerPhone, body);
};

/**
 * Confirm to the buyer that their inquiry was submitted.
 */
const sendInquiryConfirmationToBuyer = async (buyerPhone, productName, sellerBusiness) => {
  if (!buyerPhone) {
    console.warn('[WhatsApp] sendInquiryConfirmationToBuyer: no buyer phone provided.');
    return null;
  }

  const body =
    `*Inquiry Submitted – PrintMart*\n\n` +
    `Your inquiry for *${productName}* has been sent to *${sellerBusiness}*.\n\n` +
    `You will be notified once the seller responds. Thank you for using PrintMart!`;

  return sendTextMessage(buyerPhone, body);
};

/**
 * Send a quotation summary to a client via WhatsApp.
 * @param {string} clientPhone
 * @param {object} quotationDetails  Quotation document (or plain object)
 */
const sendQuotationToClient = async (clientPhone, quotationDetails) => {
  if (!clientPhone) {
    console.warn('[WhatsApp] sendQuotationToClient: no client phone provided.');
    return null;
  }

  const { subtotal, tax, taxAmount, total, validUntil, notes } = quotationDetails;

  const validDate = validUntil
    ? new Date(validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'N/A';

  const body =
    `*Quotation – PrintMart*\n\n` +
    `You have received a new quotation.\n\n` +
    `*Subtotal:* ₹${(subtotal || 0).toFixed(2)}\n` +
    `*Tax (${tax || 0}%):* ₹${(taxAmount || 0).toFixed(2)}\n` +
    `*Total:* ₹${(total || 0).toFixed(2)}\n` +
    `*Valid Until:* ${validDate}\n` +
    (notes ? `*Notes:* ${notes}\n` : '') +
    `\nPlease log in to PrintMart to accept or reject this quotation.`;

  return sendTextMessage(clientPhone, body);
};

/**
 * Notify a seller that the buyer replied to their inquiry via WhatsApp.
 */
const sendBuyerReplyNotificationToSeller = async (sellerPhone, buyerName, productName, replyText) => {
  if (!sellerPhone) return null;

  const body =
    `*Buyer Replied – PrintMart*\n\n` +
    `*${buyerName}* has replied to the inquiry for *${productName}*.\n\n` +
    `*Message:* ${replyText}\n\n` +
    `Log in to PrintMart to respond.`;

  return sendTextMessage(sellerPhone, body);
};

/**
 * Broadcast a buyer's inquiry to multiple sellers who offer a similar product.
 * @param {Array} sellers  Array of { name, phone } objects
 * @param {object} specs   { productName, category, quantity, unit, finish, size, deliveryDays }
 * @param {string} buyerName
 */
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
    `If you can fulfill this order, log in to PrintMart and send a quotation.\n` +
    `The buyer will compare prices from all responding sellers.`;

  const results = await Promise.allSettled(
    sellers.map((s) => s.phone ? sendTextMessage(s.phone, body) : Promise.resolve(null))
  );

  const sent = results.filter((r) => r.status === 'fulfilled' && r.value).length;
  console.log(`[WhatsApp] Broadcast sent to ${sent}/${sellers.length} sellers.`);
};

/**
 * Send a morning lead digest to a seller via WhatsApp.
 */
const sendMorningDigest = async (sellerPhone, sellerName, pendingCount, offerCount) => {
  if (!sellerPhone) return null;
  const body =
    `*Good Morning, ${sellerName}! 🌅 — PrintMart*\n\n` +
    `Here's your daily update:\n\n` +
    `📬 *Pending Leads:* ${pendingCount}\n` +
    `🔥 *Active Offers:* ${offerCount}\n\n` +
    `Log in to respond and grow your business!\n` +
    `👉 https://app.instify.in/dashboard/inquiries`;
  return sendTextMessage(sellerPhone, body);
};

/**
 * Verify the WhatsApp webhook challenge.
 * Returns the challenge string on success, or null on failure.
 */
const verifyWebhook = (mode, token, challenge) => {
  if (!VERIFY_TOKEN) {
    console.warn('[WhatsApp] WHATSAPP_VERIFY_TOKEN is not set – webhook verification will always fail.');
    return null;
  }
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return challenge;
  }
  return null;
};

module.exports = {
  sendTextMessage,
  sendInquiryNotificationToSeller,
  sendInquiryConfirmationToBuyer,
  sendQuotationToClient,
  sendBuyerReplyNotificationToSeller,
  broadcastInquiryToSellers,
  sendMorningDigest,
  verifyWebhook,
};
