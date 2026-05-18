const asyncHandler = require('express-async-handler');
const Quotation = require('../models/Quotation');
const { sendQuotationToClient } = require('../services/whatsapp');

/**
 * POST /api/quotations
 * Create a new quotation. Totals are calculated from items.
 * Access: seller / admin
 */
const createQuotation = asyncHandler(async (req, res) => {
  const { inquiry, buyer, product, items = [], tax = 0, validUntil, notes, status } = req.body;

  // Calculate subtotal from items
  const processedItems = items.map((item) => {
    const total = (item.quantity || 0) * (item.unitPrice || 0);
    return { ...item, total };
  });

  const subtotal = processedItems.reduce((sum, item) => sum + (item.total || 0), 0);
  const taxAmount = (subtotal * tax) / 100;
  const total = subtotal + taxAmount;

  const quotation = await Quotation.create({
    inquiry,
    seller: req.user._id,
    buyer,
    product,
    items: processedItems,
    subtotal,
    tax,
    taxAmount,
    total,
    validUntil,
    notes,
    status,
  });

  res.status(201).json(quotation);
});

/**
 * GET /api/quotations/seller
 * All quotations belonging to the logged-in seller.
 * Access: seller / admin
 */
const getSellerQuotations = asyncHandler(async (req, res) => {
  const quotations = await Quotation.find({ seller: req.user._id })
    .populate('buyer', 'name email phone')
    .populate('product', 'name images slug')
    .sort({ createdAt: -1 });

  res.json(quotations);
});

/**
 * GET /api/quotations/buyer
 * All quotations belonging to the logged-in buyer.
 * Access: authenticated
 */
const getBuyerQuotations = asyncHandler(async (req, res) => {
  const quotations = await Quotation.find({ buyer: req.user._id })
    .populate('seller', 'name businessName phone')
    .populate('product', 'name images slug')
    .sort({ createdAt: -1 });

  res.json(quotations);
});

/**
 * GET /api/quotations/:id
 * Single quotation – accessible by the buyer or seller on the quotation.
 * Access: authenticated
 */
const getQuotationById = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.id)
    .populate('seller', 'name businessName phone email')
    .populate('buyer', 'name email phone')
    .populate('product', 'name images slug')
    .populate('inquiry');

  if (!quotation) {
    res.status(404);
    throw new Error('Quotation not found');
  }

  const userId = req.user._id.toString();
  if (
    quotation.seller._id.toString() !== userId &&
    quotation.buyer._id.toString() !== userId
  ) {
    res.status(403);
    throw new Error('Not authorized to view this quotation');
  }

  res.json(quotation);
});

/**
 * POST /api/quotations/:id/send-whatsapp
 * Send the quotation to the buyer via WhatsApp.
 * Access: seller / admin
 */
const sendQuotationWhatsApp = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.id)
    .populate('buyer', 'name phone');

  if (!quotation) {
    res.status(404);
    throw new Error('Quotation not found');
  }

  const buyerPhone = quotation.buyer?.phone;
  if (!buyerPhone) {
    res.status(400);
    throw new Error('Buyer does not have a phone number on record');
  }

  await sendQuotationToClient(buyerPhone, quotation);

  quotation.whatsappSent = true;
  if (quotation.status === 'draft') {
    quotation.status = 'sent';
  }
  await quotation.save();

  res.json({ message: 'Quotation sent via WhatsApp', quotation });
});

/**
 * PUT /api/quotations/:id/status
 * Buyer accepts or rejects a quotation.
 * Access: authenticated (buyer)
 */
const updateQuotationStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowed = ['accepted', 'rejected'];

  if (!allowed.includes(status)) {
    res.status(400);
    throw new Error(`Status must be one of: ${allowed.join(', ')}`);
  }

  const quotation = await Quotation.findById(req.params.id);

  if (!quotation) {
    res.status(404);
    throw new Error('Quotation not found');
  }

  if (quotation.buyer.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Only the buyer can accept or reject a quotation');
  }

  quotation.status = status;
  await quotation.save();

  res.json(quotation);
});

module.exports = {
  createQuotation,
  getSellerQuotations,
  getBuyerQuotations,
  getQuotationById,
  sendQuotationWhatsApp,
  updateQuotationStatus,
};
