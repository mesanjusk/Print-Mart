const express = require('express');
const router = express.Router();
const { uploadDesign, getMyDesigns, deleteDesign } = require('../controllers/designController');
const { protect } = require('../middleware/authMiddleware');
const { uploadDesign: multerDesign } = require('../config/cloudinary');

router.post('/', protect, multerDesign.single('file'), uploadDesign);
router.get('/', protect, getMyDesigns);
router.delete('/:id', protect, deleteDesign);

module.exports = router;
