const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Product = require('../models/Product');

const getSuppliers = asyncHandler(async (req, res) => {
  const { keyword, page = 1, limit = 20 } = req.query;
  const query = { role: 'seller', isActive: true };
  if (keyword) query.$or = [
    { name: { $regex: keyword, $options: 'i' } },
    { businessName: { $regex: keyword, $options: 'i' } },
  ];
  const total = await User.countDocuments(query);
  const suppliers = await User.find(query)
    .select('-password')
    .skip((page - 1) * limit)
    .limit(Number(limit));
  res.json({ suppliers, total, page: Number(page), pages: Math.ceil(total / limit) });
});

const getSupplierById = asyncHandler(async (req, res) => {
  const supplier = await User.findOne({ _id: req.params.id, role: 'seller' }).select('-password');
  if (!supplier) {
    res.status(404);
    throw new Error('Supplier not found');
  }
  const products = await Product.find({ seller: supplier._id, isActive: true })
    .populate('category', 'name slug')
    .limit(20);
  res.json({ supplier, products });
});

const saveProduct = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const { productId } = req.body;
  const idx = user.savedProducts.indexOf(productId);
  if (idx > -1) {
    user.savedProducts.splice(idx, 1);
    await user.save();
    return res.json({ message: 'Product unsaved', saved: false });
  }
  user.savedProducts.push(productId);
  await user.save();
  res.json({ message: 'Product saved', saved: true });
});

const getSavedProducts = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'savedProducts',
    populate: { path: 'category', select: 'name slug' },
  });
  res.json(user.savedProducts);
});

module.exports = { getSuppliers, getSupplierById, saveProduct, getSavedProducts };
