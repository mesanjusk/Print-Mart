const asyncHandler = require('express-async-handler');
const Inquiry = require('../models/Inquiry');
const Product = require('../models/Product');
const Design = require('../models/Design');
const {
  sendInquiryNotificationToSeller,
  sendInquiryConfirmationToBuyer,
  broadcastInquiryToSellers,
} = require('../services/whatsapp');

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

  // Populate seller, product name and buyer for WhatsApp notifications
  await inquiry.populate([
    { path: 'seller', select: 'name businessName phone' },
    { path: 'product', select: 'name' },
    { path: 'buyer', select: 'name phone' },
  ]);

  // Send WhatsApp notifications – errors must never break the main response
  try {
    if (inquiry.seller?.phone) {
      await sendInquiryNotificationToSeller(
        inquiry.seller.phone,
        inquiry.buyer?.name || 'A buyer',
        inquiry.product?.name || 'a product',
        message,
        quantity,
        unit
      );
    }
  } catch (err) {
    console.error('[WhatsApp] Seller notification failed:', err.message);
  }

  try {
    if (req.user.phone) {
      await sendInquiryConfirmationToBuyer(
        req.user.phone,
        inquiry.product?.name || 'the product',
        inquiry.seller?.businessName || inquiry.seller?.name || 'the seller'
      );
    }
  } catch (err) {
    console.error('[WhatsApp] Buyer confirmation failed:', err.message);
  }

  // Broadcast to other sellers who offer a similar product (same category + matching printSpecs)
  try {
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
      .populate('seller', 'name phone')
      .select('seller printSpecs name')
      .limit(10)
      .lean();

    const sellersToNotify = [];
    const seenSellers = new Set([product.seller.toString()]);
    for (const sp of similarProducts) {
      const sid = sp.seller?._id?.toString();
      if (sid && !seenSellers.has(sid) && sp.seller.phone) {
        seenSellers.add(sid);
        sellersToNotify.push(sp.seller);
      }
    }

    if (sellersToNotify.length > 0) {
      inquiry.broadcastedSellers = sellersToNotify.map((s) => s._id);
      await inquiry.save();

      await broadcastInquiryToSellers(sellersToNotify, {
        productName: inquiry.product?.name,
        category: product.category,
        quantity,
        unit,
        finish: ps.finish,
        size: ps.size,
        paperWeight: ps.paperWeight,
        deliveryDays: ps.deliveryDays,
      }, inquiry.buyer?.name || 'A buyer');
    }
  } catch (err) {
    console.error('[WhatsApp] Broadcast failed:', err.message);
  }

  // Update design usedCount if a design was attached
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
  const inquiries = await Inquiry.find({ seller: req.user._id })
    .populate('product', 'name images slug')
    .populate('buyer', 'name email phone')
    .sort({ createdAt: -1 });
  res.json(inquiries);
});

const replyInquiry = asyncHandler(async (req, res) => {
  const inquiry = await Inquiry.findById(req.params.id);
  if (!inquiry) {
    res.status(404);
    throw new Error('Inquiry not found');
  }
  if (inquiry.seller.toString() !== req.user._id.toString() &&
      inquiry.buyer.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }
  inquiry.replies.push({ sender: req.user._id, message: req.body.message });
  if (inquiry.seller.toString() === req.user._id.toString()) {
    inquiry.status = 'responded';
  }
  await inquiry.save();
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

module.exports = { createInquiry, getBuyerInquiries, getSellerInquiries, replyInquiry, closeInquiry };
