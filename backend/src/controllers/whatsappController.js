const Inquiry = require('../models/Inquiry');
const User = require('../models/User');
const { verifyWebhook, sendBuyerReplyNotificationToSeller, sendMorningDigest } = require('../services/whatsapp');

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
    if (body.object !== 'whatsapp_business_account') return res.sendStatus(200);

    const messages = body?.entry?.[0]?.changes?.[0]?.value?.messages;
    if (!messages || messages.length === 0) return res.sendStatus(200);

    for (const msg of messages) {
      const from = msg.from;
      const text = msg?.text?.body || '';
      const msgType = msg.type;
      if (msgType !== 'text' || !text) continue;

      const phoneVariants = [from, `+${from}`];

      // --- Buyer reply flow ---
      const buyer = await User.findOne({ phone: { $in: phoneVariants }, role: 'buyer' }).select('_id name');
      if (buyer) {
        const inquiry = await Inquiry.findOne({
          buyer: buyer._id,
          status: { $in: ['pending', 'responded'] },
        }).sort({ createdAt: -1 });

        if (inquiry) {
          inquiry.replies.push({ sender: buyer._id, message: text });
          await inquiry.save();
          try {
            await inquiry.populate([
              { path: 'seller', select: 'name phone' },
              { path: 'buyer', select: 'name' },
              { path: 'product', select: 'name' },
            ]);
            if (inquiry.seller?.phone) {
              await sendBuyerReplyNotificationToSeller(
                inquiry.seller.phone,
                inquiry.buyer?.name || 'A buyer',
                inquiry.product?.name || 'your product',
                text
              );
            }
          } catch (notifyErr) {
            console.error('[WhatsApp] Seller reply notification failed:', notifyErr.message);
          }
        }
      }

      // --- Seller morning ping flow ---
      const seller = await User.findOne({ phone: { $in: phoneVariants }, role: 'seller' })
        .select('_id name businessName phone pushSubscription pushEnabled morningDigestOptIn lastSeenAt');
      if (seller) {
        // Update lastSeenAt
        await User.findByIdAndUpdate(seller._id, { lastSeenAt: new Date() });

        // Only send digest if morning-ish greeting (optional: remove condition if you want always)
        const greetings = ['hi', 'hello', 'good morning', 'hey', 'hlo', 'ok', 'morning'];
        const isGreeting = greetings.some(g => text.toLowerCase().includes(g));

        if (isGreeting || true) { // always send digest on any seller message
          const Inquiry = require('../models/Inquiry');
          const Offer = require('../models/Offer');
          const [pendingCount, offerCount] = await Promise.all([
            Inquiry.countDocuments({ seller: seller._id, status: 'pending' }),
            Offer.countDocuments({ seller: seller._id, isActive: true, expiresAt: { $gt: new Date() } }),
          ]);

          // WhatsApp digest
          try {
            await sendMorningDigest(seller.phone, seller.businessName || seller.name, pendingCount, offerCount);
          } catch (err) {
            console.error('[WhatsApp] Morning digest failed:', err.message);
          }

          // Push notification too
          if (seller.pushEnabled && seller.pushSubscription?.endpoint) {
            const { sendPush } = require('../services/pushNotification');
            sendPush(seller.pushSubscription, {
              title: 'Good Morning! 🌅',
              body: `You have ${pendingCount} pending leads and ${offerCount} active offers.`,
              url: '/dashboard/inquiries',
              tag: 'morning-digest',
            }).catch(() => {});
          }
        }
      }
    }
  } catch (err) {
    console.error('[WhatsApp] webhookReceive error:', err.message);
  }
  return res.sendStatus(200);
};

module.exports = { webhookVerify, webhookReceive };
