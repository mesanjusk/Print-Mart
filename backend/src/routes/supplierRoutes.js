const express = require('express');
const router = express.Router();
const { getSuppliers, getSupplierById, saveProduct, getSavedProducts } = require('../controllers/supplierController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', getSuppliers);
router.get('/saved', protect, getSavedProducts);
router.get('/:id', getSupplierById);
router.post('/save', protect, saveProduct);

module.exports = router;
