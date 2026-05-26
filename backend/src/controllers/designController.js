const asyncHandler = require('express-async-handler');
const Design = require('../models/Design');

const uploadDesign = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded');
  }

  const { name, category, description } = req.body;

  const design = await Design.create({
    user: req.user._id,
    name: name || req.file.originalname,
    fileUrl: req.file.path,
    thumbnailUrl: req.file.path,
    fileType: req.file.mimetype?.split('/')[1] || 'unknown',
    category: category || '',
    description: description || '',
  });

  res.status(201).json(design);
});

const getMyDesigns = asyncHandler(async (req, res) => {
  const designs = await Design.find({ user: req.user._id, isActive: true })
    .populate('lastUsedProduct', 'name slug')
    .sort({ updatedAt: -1 });
  res.json(designs);
});

const deleteDesign = asyncHandler(async (req, res) => {
  const design = await Design.findOne({ _id: req.params.id, user: req.user._id });
  if (!design) {
    res.status(404);
    throw new Error('Design not found');
  }
  design.isActive = false;
  await design.save();
  res.json({ message: 'Design removed' });
});

module.exports = { uploadDesign, getMyDesigns, deleteDesign };
