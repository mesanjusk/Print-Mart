const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Quotation = require('../models/Quotation');
const User = require('../models/User');
const wa = require('../services/whatsapp');

const populateOrder = (query) =>
  query
    .populate('buyer', 'name email phone')
    .populate('seller', 'name businessName phone')
    .populate('product', 'name images slug')
    .populate('quotation', 'subtotal total tax status');

// POST /api/orders/from-quotation/:quotationId
const createOrderFromQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.quotationId)
    .populate('buyer', 'name phone')
    .populate('seller', 'name businessName phone')
    .populate('product', 'name');

  if (!quotation) { res.status(404); throw new Error('Quotation not found'); }

  const buyerId = req.user._id.toString();
  if (quotation.buyer._id.toString() !== buyerId) {
    res.status(403); throw new Error('Only the buyer can convert a quotation to order');
  }
  if (quotation.status !== 'sent') {
    res.status(400); throw new Error('Quotation must be in "sent" status to create an order');
  }

  quotation.status = 'accepted';
  await quotation.save();

  const order = await Order.create({
    quotation: quotation._id,
    inquiry: quotation.inquiry,
    buyer: quotation.buyer._id,
    seller: quotation.seller._id,
    product: quotation.product._id,
    items: quotation.items,
    subtotal: quotation.subtotal,
    tax: quotation.tax,
    taxAmount: quotation.taxAmount,
    total: quotation.total,
    notes: req.body.notes || '',
    deliveryAddress: req.body.deliveryAddress,
  });

  const populated = await populateOrder(Order.findById(order._id));
  const fullOrder = await populated;

  // WhatsApp notifications
  try {
    if (quotation.buyer?.phone) await wa.sendOrderConfirmation(quotation.buyer.phone, order, 'buyer', quotation.buyer._id);
    if (quotation.seller?.phone) await wa.sendQuotationResponse(quotation.seller.phone, order, 'accepted', quotation.seller._id);
  } catch (e) { console.error('[Order] WA notify error:', e.message); }

  res.status(201).json(fullOrder);
});

// GET /api/orders/my – buyer orders
const getMyOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const filter = { buyer: req.user._id };
  if (status) filter.status = status;
  const orders = await populateOrder(
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit))
  );
  const total = await Order.countDocuments(filter);
  res.json({ orders, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// GET /api/orders/vendor – seller orders
const getVendorOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const filter = { seller: req.user._id };
  if (status) filter.status = status;
  const orders = await populateOrder(
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit))
  );
  const total = await Order.countDocuments(filter);
  res.json({ orders, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// GET /api/orders – admin all orders
const getAllOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const orders = await populateOrder(
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit))
  );
  const total = await Order.countDocuments(filter);
  res.json({ orders, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// GET /api/orders/:id
const getOrderById = asyncHandler(async (req, res) => {
  const order = await populateOrder(Order.findById(req.params.id));
  if (!order) { res.status(404); throw new Error('Order not found'); }
  const uid = req.user._id.toString();
  if (order.buyer._id.toString() !== uid && order.seller._id.toString() !== uid && req.user.role !== 'admin') {
    res.status(403); throw new Error('Not authorized');
  }
  res.json(order);
});

// PUT /api/orders/:id/payment – admin or seller confirms payment
const confirmPayment = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('buyer', 'name phone').populate('seller', 'name phone');
  if (!order) { res.status(404); throw new Error('Order not found'); }
  order.paymentStatus = 'paid';
  order.status = 'paid';
  order.paymentConfirmedAt = new Date();
  order.paymentMethod = req.body.paymentMethod || order.paymentMethod;
  await order.save();
  try {
    if (order.buyer?.phone) await wa.sendPaymentConfirmed(order.buyer.phone, order, 'buyer', order.buyer._id);
    if (order.seller?.phone) await wa.sendPaymentConfirmed(order.seller.phone, order, 'seller', order.seller._id);
  } catch (e) { console.error('[Order] WA notify error:', e.message); }
  res.json(order);
});

// PUT /api/orders/:id/dispatch
const dispatchOrder = asyncHandler(async (req, res) => {
  const { trackingInfo } = req.body;
  const order = await Order.findById(req.params.id).populate('buyer', 'name phone');
  if (!order) { res.status(404); throw new Error('Order not found'); }
  if (order.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403); throw new Error('Not authorized');
  }
  order.status = 'dispatched';
  order.dispatchedAt = new Date();
  order.trackingInfo = trackingInfo || '';
  await order.save();
  try {
    if (order.buyer?.phone) await wa.sendDispatchNotification(order.buyer.phone, order, order.buyer._id);
  } catch (e) { console.error('[Order] WA notify error:', e.message); }
  res.json(order);
});

// PUT /api/orders/:id/deliver
const deliverOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('buyer', 'name phone').populate('seller', 'name phone');
  if (!order) { res.status(404); throw new Error('Order not found'); }
  if (order.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403); throw new Error('Not authorized');
  }
  order.status = 'delivered';
  order.deliveredAt = new Date();
  await order.save();
  try {
    if (order.buyer?.phone) await wa.sendDeliveryConfirmation(order.buyer.phone, order, 'buyer', order.buyer._id);
    if (order.seller?.phone) await wa.sendDeliveryConfirmation(order.seller.phone, order, 'seller', order.seller._id);
  } catch (e) { console.error('[Order] WA notify error:', e.message); }
  res.json(order);
});

// PUT /api/orders/:id/cancel
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('buyer', 'name phone').populate('seller', 'name phone');
  if (!order) { res.status(404); throw new Error('Order not found'); }
  const uid = req.user._id.toString();
  if (order.buyer._id.toString() !== uid && order.seller._id.toString() !== uid && req.user.role !== 'admin') {
    res.status(403); throw new Error('Not authorized');
  }
  if (['delivered', 'dispatched', 'cancelled'].includes(order.status)) {
    res.status(400); throw new Error(`Cannot cancel order in status: ${order.status}`);
  }
  order.status = 'cancelled';
  order.cancelledAt = new Date();
  order.cancelReason = req.body.reason || 'Cancelled';
  await order.save();
  try {
    const reason = order.cancelReason;
    if (order.buyer?.phone) await wa.sendCancellationNotice(order.buyer.phone, order, reason, order.buyer._id);
    if (order.seller?.phone) await wa.sendCancellationNotice(order.seller.phone, order, reason, order.seller._id);
  } catch (e) { console.error('[Order] WA notify error:', e.message); }
  res.json(order);
});

// GET /api/orders/stats – admin stats
const getOrderStats = asyncHandler(async (req, res) => {
  const [total, pending, paid, processing, dispatched, delivered, cancelled, revenue] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ status: 'pending_payment' }),
    Order.countDocuments({ status: 'paid' }),
    Order.countDocuments({ status: 'processing' }),
    Order.countDocuments({ status: 'dispatched' }),
    Order.countDocuments({ status: 'delivered' }),
    Order.countDocuments({ status: 'cancelled' }),
    Order.aggregate([{ $match: { status: 'delivered' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
  ]);
  res.json({
    total, pending, paid, processing, dispatched, delivered, cancelled,
    totalRevenue: revenue[0]?.total || 0,
  });
});

module.exports = {
  createOrderFromQuotation,
  getMyOrders,
  getVendorOrders,
  getAllOrders,
  getOrderById,
  confirmPayment,
  dispatchOrder,
  deliverOrder,
  cancelOrder,
  getOrderStats,
};
