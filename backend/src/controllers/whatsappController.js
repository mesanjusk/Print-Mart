const Inquiry = require('../models/Inquiry');
const User = require('../models/User');
const { verifyWebhook } = require('../services/whatsapp');

/**
 * GET /api/whatsapp/webhook
 * Meta webhook verification handshake.
 */
const webhookVerify = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const result = verifyWebhook(mode, token, challenge);

  if (result !== null) {
    console.log('[WhatsApp] Webhook verified successfully.');
    return res.status(200).send(result);
  }

  console.warn('[WhatsApp] Webhook verification failed – token mismatch or wrong mode.');
  return res.status(403).json({ message: 'Verification failed' });
};

/**
 * POST /api/whatsapp/webhook
 * Receive incoming messages / status updates from Meta.
 * Always responds 200 OK to acknowledge receipt.
 */
const webhookReceive = async (req, res) => {
  try {
    const body = req.body;

    // Confirm this is a WhatsApp Business Account event
    if (body.object !== 'whatsapp_business_account') {
      return res.sendStatus(200);
    }

    const messages = body?.entry?.[0]?.changes?.[0]?.value?.messages;

    if (!messages || messages.length === 0) {
      return res.sendStatus(200);
    }

    for (const msg of messages) {
      const from = msg.from; // sender phone (without leading +)
      const text = msg?.text?.body || '';
      const msgType = msg.type;

      console.log(`[WhatsApp] Incoming message from ${from} [${msgType}]: ${text}`);

      if (msgType !== 'text' || !text) continue;

      // Phone may be stored as "9198XXXXXXXX" or "+9198XXXXXXXX"
      const phoneVariants = [from, `+${from}`];

      // Find the buyer whose phone matches the sender
      const buyer = await User.findOne({ phone: { $in: phoneVariants } }).select('_id');

      if (!buyer) {
        console.log(`[WhatsApp] No user found for phone ${from} – ignoring message.`);
        continue;
      }

      // Find their most recent open inquiry
      const inquiry = await Inquiry.findOne({
        buyer: buyer._id,
        status: { $in: ['pending', 'responded'] },
      }).sort({ createdAt: -1 });

      if (inquiry) {
        inquiry.replies.push({
          sender: buyer._id,
          message: text,
        });
        await inquiry.save();
        console.log(`[WhatsApp] Saved reply to inquiry ${inquiry._id}`);
      } else {
        console.log(`[WhatsApp] No open inquiry found for buyer ${buyer._id}.`);
      }
    }
  } catch (err) {
    console.error('[WhatsApp] webhookReceive error:', err.message);
  }

  // Always acknowledge receipt to Meta
  return res.sendStatus(200);
};

module.exports = { webhookVerify, webhookReceive };
