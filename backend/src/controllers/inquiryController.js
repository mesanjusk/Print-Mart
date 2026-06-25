const asyncHandler = require('express-async-handler');
const Inquiry = require('../models/Inquiry');
const Product = require('../models/Product');
const User = require('../models/User');
const Design = require('../models/Design');
const { sendInquiryNotificationToSeller, sendInquiryConfirmationToBuyer, sendInquiryReplyToUser } = require('../services/whatsapp');
const { sendPush, sendPushToMany } = require('../services/pushNotification');

const createInquiry = asyncHandler(async (req, res) => {
  const { productId, message, quantity, unit, designId, designFileUrl } = req.body;
  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const inquiry = await Inquiry.create({
    product: productId,
    buyer: req.user._id,
    seller: product.seller,
    message,
    quantity,
    unit,
    design: designId || undefined,
    designFileUrl: designFileUrl || undefined,
  });
  product.inquiries += 1;
  await product.save();

  await inquiry.populate([
    { path: 'seller', select: 'name businessName phone pushSubscription pushEnabled plan' },
    { path: 'product', select: 'name' },
    { path: 'buyer', select: 'name phone' },
  ]);

  // 1. Push notification to the direct seller (always, regardless of plan)
  try {
    if (inquiry.seller?.phone) {
      await sendInquiryNotificationToSeller(
        inquiry.seller.phone,
        inquiry.buyer?.name || 'A buyer',
        inquiry.product?.name || 'a product',
        message,
        quantity,
        unit,
        inquiry._id,
        inquiry.seller._id,
        inquiry.buyer?.phone
      );
    }
    if (inquiry.seller?.pushEnabled && inquiry.seller?.pushSubscription?.endpoint) {
      await sendPush(inquiry.seller.pushSubscription, {
        title: `New Inquiry — ${inquiry.product?.name}`,
        body: `${inquiry.buyer?.name || 'A buyer'} needs ${quantity} ${unit}. Tap to view & accept.`,
        url: '/dashboard/inquiries',
        tag: `inquiry-${inquiry._id}`,
      });
    }
  } catch (err) {
    console.error('[Push] Seller notification failed:', err.message);
  }

  // 2. WhatsApp confirmation to buyer (only 1 message — keep this)
  try {
    if (req.user.phone) {
      await sendInquiryConfirmationToBuyer(
        req.user.phone,
        inquiry.product?.name || 'the product',
        inquiry.seller?.businessName || inquiry.seller?.name || 'the seller',
        req.user._id,
        inquiry.seller?.phone
      );
    }
  } catch (err) {
    console.error('[WhatsApp] Buyer confirmation failed:', err.message);
  }

  // 3. Push broadcast to matching premium sellers — replaces WhatsApp broadcast (zero cost)
  try {
    const MAX_BROADCAST = 10; // Can be higher since push is free
    const ps = product.printSpecs || {};
    const similarQuery = {
      _id: { $ne: product._id },
      seller: { $ne: product.seller },
      category: product.category,
      isActive: true,
    };
    if (ps.quantity) similarQuery['printSpecs.quantity'] = ps.quantity;
    if (ps.finish) similarQuery['printSpecs.finish'] = ps.finish;

    const similarProducts = await Product.find(similarQuery)
      .select('seller rating')
      .limit(100)
      .lean();

    const seenSellers = new Set([product.seller.toString()]);
    const sellerIds = [];
    for (const sp of similarProducts) {
      const sid = sp.seller?.toString();
      if (sid && !seenSellers.has(sid)) {
        seenSellers.add(sid);
        sellerIds.push(sid);
      }
    }

    if (sellerIds.length > 0) {
      // Fetch full seller docs with push data — only premium sellers, only those with push enabled
      const matchingSellers = await User.find({
        _id: { $in: sellerIds },
        plan: 'premium',
        pushEnabled: true,
      }).select('name pushSubscription pushEnabled rating').limit(MAX_BROADCAST);

      // Rank by rating
      matchingSellers.sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0));

      if (matchingSellers.length > 0) {
        inquiry.broadcastedSellers = matchingSellers.map((s) => s._id);
        await inquiry.save();

        await sendPushToMany(matchingSellers, {
          title: `New Lead — ${inquiry.product?.name}`,
          body: `${quantity} ${unit} needed. Be the first to accept!`,
          url: '/dashboard/inquiries',
          tag: `broadcast-${inquiry._id}`,
        }, (expiredId) => {
          User.findByIdAndUpdate(expiredId, { pushEnabled: false, pushSubscription: null }).catch(() => {});
        });

        console.log(`[Push] Broadcast sent to ${matchingSellers.length} premium sellers.`);
      }
    }
  } catch (err) {
    console.error('[Push] Broadcast failed:', err.message);
  }

  if (designId) {
    Design.findByIdAndUpdate(designId, { $inc: { usedCount: 1 }, lastUsedProduct: productId }).catch(() => {});
  }

  res.status(201).json(inquiry);
});

const getBuyerInquiries = asyncHandler(async (req, res) => {
  const inquiries = await Inquiry.find({ buyer: req.user._id })
    .populate('product', 'name images slug')
    .populate('seller', 'name businessName')
    .sort({ createdAt: -1 });
  res.json(inquiries);
});

const getSellerInquiries = asyncHandler(async (req, res) => {
  // Seller sees both: inquiries on their products AND ones they were broadcasted
  const inquiries = await Inquiry.find({
    $or: [
      { seller: req.user._id },
      { broadcastedSellers: req.user._id },
    ],
  })
    .populate('product', 'name images slug')
    .populate('buyer', 'name email phone')
    .sort({ createdAt: -1 });
  res.json(inquiries);
});

/**
 * PUT /api/inquiries/:id/accept
 * Seller signals they can fulfil this inquiry.
 * Sends a push to the buyer so they can WhatsApp the seller directly.
 * Seller's personal WhatsApp — zero API cost.
 */
const acceptInquiry = asyncHandler(async (req, res) => {
  const inquiry = await Inquiry.findById(req.params.id)
    .populate('buyer', 'name phone pushSubscription pushEnabled')
    .populate('product', 'name');

  if (!inquiry) {
    res.status(404);
    throw new Error('Inquiry not found');
  }

  const seller = req.user;

  // Must be direct seller or a broadcasted seller
  const isDirectSeller = inquiry.seller.toString() === seller._id.toString();
  const isBroadcasted = inquiry.broadcastedSellers.some(
    (id) => id.toString() === seller._id.toString()
  );
  if (!isDirectSeller && !isBroadcasted) {
    res.status(403);
    throw new Error('Not authorized to accept this inquiry');
  }

  // Idempotent — don't double-add
  const already = inquiry.sellerInterests.some(
    (i) => i.seller.toString() === seller._id.toString()
  );
  if (!already) {
    inquiry.sellerInterests.push({
      seller: seller._id,
      sellerName: seller.name,
      sellerBusiness: seller.businessName || seller.name,
      sellerPhone: seller.phone || '',
    });
    await inquiry.save();
  }

  // Notify buyer via push — they tap it to WhatsApp the seller (user-initiated, free)
  try {
    if (inquiry.buyer?.pushEnabled && inquiry.buyer?.pushSubscription?.endpoint) {
      await sendPush(inquiry.buyer.pushSubscription, {
        title: '🎉 Seller is Ready!',
        body: `${seller.businessName || seller.name} can fulfil your ${inquiry.product?.name} order. Tap to contact them.`,
        url: '/dashboard/inquiries',
        tag: `seller-ready-${inquiry._id}-${seller._id}`,
      });
    }
  } catch (err) {
    console.error('[Push] Buyer acceptance notification failed:', err.message);
  }

  res.json({ message: 'Accepted', sellerInterests: inquiry.sellerInterests });
});

const replyInquiry = asyncHandler(async (req, res) => {
  const inquiry = await Inquiry.findById(req.params.id)
    .populate('buyer', 'name phone')
    .populate('seller', 'name businessName phone');
  if (!inquiry) {
    res.status(404);
    throw new Error('Inquiry not found');
  }
  const isSeller = inquiry.seller._id.toString() === req.user._id.toString();
  const isBuyer = inquiry.buyer._id.toString() === req.user._id.toString();
  if (!isSeller && !isBuyer) {
    res.status(403);
    throw new Error('Not authorized');
  }
  inquiry.replies.push({ sender: req.user._id, message: req.body.message });
  if (isSeller) inquiry.status = 'responded';
  await inquiry.save();

  // Notify the other party via WhatsApp
  try {
    if (isSeller && inquiry.buyer?.phone) {
      await sendInquiryReplyToUser(inquiry.buyer.phone, inquiry.seller?.businessName || inquiry.seller?.name, req.body.message, inquiry.buyer._id);
    } else if (isBuyer && inquiry.seller?.phone) {
      await sendInquiryReplyToUser(inquiry.seller.phone, inquiry.buyer?.name, req.body.message, inquiry.seller._id);
    }
  } catch (e) { console.error('[WhatsApp] Reply notify failed:', e.message); }

  res.json(inquiry);
});

const closeInquiry = asyncHandler(async (req, res) => {
  const inquiry = await Inquiry.findOneAndUpdate(
    { _id: req.params.id, seller: req.user._id },
    { status: 'closed' },
    { new: true }
  );
  if (!inquiry) {
    res.status(404);
    throw new Error('Inquiry not found');
  }
  res.json(inquiry);
});

/**
 * GET /api/inquiries/:id/wa/:interestIndex
 * Privacy-safe redirect: buyer is redirected to seller's WhatsApp
 * without the seller's number being exposed in the frontend HTML.
 */
const waRedirect = asyncHandler(async (req, res) => {
  const inquiry = await Inquiry.findById(req.params.id);
  if (!inquiry) { res.status(404); throw new Error('Inquiry not found'); }

  // Only the buyer of this inquiry can use this endpoint
  if (inquiry.buyer.toString() !== req.user._id.toString()) {
    res.status(403); throw new Error('Not authorized');
  }

  const idx = parseInt(req.params.interestIndex, 10);
  const interest = inquiry.sellerInterests[idx];
  if (!interest?.sellerPhone) {
    res.status(404); throw new Error('Seller phone not available');
  }

  // Fetch product name for the pre-filled message
  await inquiry.populate('product', 'name');

  const cleaned = interest.sellerPhone.replace(/[^0-9]/g, '');
  const num = cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
  const text = encodeURIComponent(
    `Hi ${interest.sellerBusiness || interest.sellerName}, I found you on PrintMart. I need ${inquiry.quantity} ${inquiry.unit} of ${inquiry.product?.name}. Can you share your best price?`
  );

  res.redirect(`https://wa.me/${num}?text=${text}`);
});

module.exports = {
  createInquiry,
  getBuyerInquiries,
  getSellerInquiries,
  acceptInquiry,
  replyInquiry,
  closeInquiry,
  waRedirect,
};
