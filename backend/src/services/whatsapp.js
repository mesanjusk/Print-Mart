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
  verifyWebhook,
};
