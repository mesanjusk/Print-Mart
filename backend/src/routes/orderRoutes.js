const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/orderController');

router.get('/stats', protect, authorize('admin'), getOrderStats);
router.get('/my', protect, getMyOrders);
router.get('/vendor', protect, authorize('seller', 'admin'), getVendorOrders);
router.get('/', protect, authorize('admin'), getAllOrders);
router.get('/:id', protect, getOrderById);
router.post('/from-quotation/:quotationId', protect, createOrderFromQuotation);
router.put('/:id/payment', protect, authorize('seller', 'admin'), confirmPayment);
router.put('/:id/dispatch', protect, authorize('seller', 'admin'), dispatchOrder);
router.put('/:id/deliver', protect, authorize('seller', 'admin'), deliverOrder);
router.put('/:id/cancel', protect, cancelOrder);

module.exports = router;
