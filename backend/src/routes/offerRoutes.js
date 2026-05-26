const express = require('express');
const router = express.Router();
const { createOffer, getActiveOffers, getSellerOffers, updateOffer, deleteOffer } = require('../controllers/offerController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', getActiveOffers);
router.get('/my', protect, authorize('seller', 'admin'), getSellerOffers);
router.post('/', protect, authorize('seller', 'admin'), createOffer);
router.put('/:id', protect, authorize('seller', 'admin'), updateOffer);
router.delete('/:id', protect, authorize('seller', 'admin'), deleteOffer);

module.exports = router;
