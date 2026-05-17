const asyncHandler = require('express-async-handler');
const Inquiry = require('../models/Inquiry');
const Product = require('../models/Product');

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
