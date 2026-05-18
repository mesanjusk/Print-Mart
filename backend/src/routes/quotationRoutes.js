const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createQuotation,
  getSellerQuotations,
  getBuyerQuotations,
  getQuotationById,
  sendQuotationWhatsApp,
  updateQuotationStatus,
} = require('../controllers/quotationController');

// POST /api/quotations – create a quotation (seller/admin)
router.post('/', protect, authorize('seller', 'admin'), createQuotation);

// GET /api/quotations/seller – seller's quotation list
router.get('/seller', protect, authorize('seller', 'admin'), getSellerQuotations);

// GET /api/quotations/buyer – buyer's quotation list
router.get('/buyer', protect, getBuyerQuotations);

// GET /api/quotations/:id – single quotation
router.get('/:id', protect, getQuotationById);

// POST /api/quotations/:id/send-whatsapp – send via WhatsApp (seller/admin)
router.post('/:id/send-whatsapp', protect, authorize('seller', 'admin'), sendQuotationWhatsApp);

// PUT /api/quotations/:id/status – buyer accepts/rejects
router.put('/:id/status', protect, updateQuotationStatus);

module.exports = router;
