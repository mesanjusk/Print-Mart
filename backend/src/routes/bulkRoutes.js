const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  bulkImportCategories, bulkImportProducts, bulkImportSellers,
  confirmSellerOTP, getCatalog, addSingleSeller,
} = require('../controllers/bulkController');

const adminOnly = [protect, authorize('admin')];

router.get('/catalog', protect, getCatalog);
router.post('/categories', ...adminOnly, bulkImportCategories);
router.post('/products', ...adminOnly, bulkImportProducts);
router.post('/sellers', ...adminOnly, bulkImportSellers);
router.post('/sellers/confirm-otp', ...adminOnly, confirmSellerOTP);
router.post('/seller', ...adminOnly, addSingleSeller);

module.exports = router;
