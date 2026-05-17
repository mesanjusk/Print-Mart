const express = require('express');
const router = express.Router();
const {
  getProducts, getProductBySlug, getFeaturedProducts,
  createProduct, updateProduct, deleteProduct, addReview, getSellerProducts,
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');

router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/my', protect, authorize('seller', 'admin'), getSellerProducts);
router.get('/:slug', getProductBySlug);
router.post('/', protect, authorize('seller', 'admin'), upload.array('images', 6), createProduct);
router.put('/:id', protect, authorize('seller', 'admin'), upload.array('images', 6), updateProduct);
router.delete('/:id', protect, authorize('seller', 'admin'), deleteProduct);
router.post('/:id/reviews', protect, addReview);

module.exports = router;
