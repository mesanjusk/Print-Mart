const asyncHandler = require('express-async-handler');
const Category = require('../models/Category');

const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true, parent: null })
    .sort({ name: 1 })
    .lean();
  const withSubs = await Promise.all(
    categories.map(async (cat) => {
      const subcategories = await Category.find({ parent: cat._id, isActive: true });
      return { ...cat, subcategories };
    })
  );
  res.json(withSubs);
});

const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug, isActive: true });
  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }
  res.json(category);
});

const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create(req.body);
  res.status(201).json(category);
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }
  res.json(category);
});

const deleteCategory = asyncHandler(async (req, res) => {
  await Category.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ message: 'Category removed' });
});

module.exports = { getCategories, getCategoryBySlug, createCategory, updateCategory, deleteCategory };
