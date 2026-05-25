const asyncHandler = require('express-async-handler');
const Inquiry = require('../models/Inquiry');
const Product = require('../models/Product');
const { sendInquiryNotificationToSeller, sendInquiryConfirmationToBuyer, sendInquiryReplyToUser } = require('../services/whatsapp');

const createInquiry = asyncHandler(async (req, res) => {
  const { productId, message, quantity, unit } = req.body;
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
        unit,
        inquiry._id,
        inquiry.seller._id
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
        inquiry.seller?.businessName || inquiry.seller?.name || 'the seller',
        req.user._id
      );
    }
  } catch (err) {
    console.error('[WhatsApp] Buyer confirmation failed:', err.message);
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

module.exports = { createInquiry, getBuyerInquiries, getSellerInquiries, replyInquiry, closeInquiry };
