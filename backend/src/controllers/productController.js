const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const Review = require('../models/Review');

const getProducts = asyncHandler(async (req, res) => {
  const { keyword, category, minPrice, maxPrice, page = 1, limit = 20, sort } = req.query;

  const query = { isActive: true };

  if (keyword) {
    query.$text = { $search: keyword };
  }
  if (category) query.category = category;
  if (minPrice || maxPrice) {
    query['price.min'] = {};
    if (minPrice) query['price.min'].$gte = Number(minPrice);
    if (maxPrice) query['price.min'].$lte = Number(maxPrice);
  }

  const sortObj = {};
  if (sort === 'price_asc') sortObj['price.min'] = 1;
  else if (sort === 'price_desc') sortObj['price.min'] = -1;
  else if (sort === 'newest') sortObj.createdAt = -1;
  else if (sort === 'popular') sortObj.views = -1;
  else sortObj.featured = -1;

  const total = await Product.countDocuments(query);
  const products = await Product.find(query)
    .populate('category', 'name slug')
    .populate('seller', 'name businessName avatar')
    .sort(sortObj)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean();

  res.json({
    products,
    page: Number(page),
    pages: Math.ceil(total / limit),
    total,
  });
});

const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, isActive: true })
    .populate('category', 'name slug')
    .populate('seller', 'name businessName avatar phone address');
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  product.views += 1;
  await product.save();

  const reviews = await Review.find({ product: product._id })
    .populate('user', 'name avatar')
    .sort({ createdAt: -1 });

  res.json({ product, reviews });
});

const getFeaturedProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ isActive: true, featured: true })
    .populate('category', 'name slug')
    .populate('seller', 'name businessName')
    .limit(12)
    .lean();
  res.json(products);
});

const createProduct = asyncHandler(async (req, res) => {
  const images = req.files ? req.files.map((f) => f.path) : [];
  const product = await Product.create({
    ...req.body,
    seller: req.user._id,
    images,
    specifications: req.body.specifications ? JSON.parse(req.body.specifications) : [],
    tags: req.body.tags ? JSON.parse(req.body.tags) : [],
    price: req.body.price ? JSON.parse(req.body.price) : {},
    printSpecs: req.body.printSpecs ? JSON.parse(req.body.printSpecs) : undefined,
  });
  res.status(201).json(product);
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, seller: req.user._id });
  if (!product) {
    res.status(404);
    throw new Error('Product not found or unauthorized');
  }
  const updates = { ...req.body };
  if (req.files?.length) updates.images = req.files.map((f) => f.path);
  if (updates.specifications) updates.specifications = JSON.parse(updates.specifications);
  if (updates.tags) updates.tags = JSON.parse(updates.tags);
  if (updates.price) updates.price = JSON.parse(updates.price);
  if (updates.printSpecs) updates.printSpecs = JSON.parse(updates.printSpecs);
  Object.assign(product, updates);
  await product.save();
  res.json(product);
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, seller: req.user._id });
  if (!product) {
    res.status(404);
    throw new Error('Product not found or unauthorized');
  }
  product.isActive = false;
  await product.save();
  res.json({ message: 'Product removed' });
});

const addReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  const existing = await Review.findOne({ product: product._id, user: req.user._id });
  if (existing) {
    res.status(400);
    throw new Error('You have already reviewed this product');
  }
  await Review.create({ product: product._id, user: req.user._id, rating, comment });
  const reviews = await Review.find({ product: product._id });
  product.rating.count = reviews.length;
  product.rating.average = reviews.reduce((a, r) => a + r.rating, 0) / reviews.length;
  await product.save();
  res.status(201).json({ message: 'Review added' });
});

const getSellerProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ seller: req.user._id })
    .populate('category', 'name')
    .sort({ createdAt: -1 });
  res.json(products);
});

/**
 * GET /api/products/compare
 * Find all active products in the same category with matching print specs.
 * Used to show price comparison across sellers.
 */
const compareProducts = asyncHandler(async (req, res) => {
  const { category, quantity, finish, size, paperWeight, sides } = req.query;

  if (!category) {
    res.status(400);
    throw new Error('category is required');
  }

  const query = { category, isActive: true };
  if (quantity) query['printSpecs.quantity'] = Number(quantity);
  if (finish) query['printSpecs.finish'] = finish;
  if (size) query['printSpecs.size'] = size;
  if (paperWeight) query['printSpecs.paperWeight'] = Number(paperWeight);
  if (sides) query['printSpecs.sides'] = sides;

  const products = await Product.find(query)
    .populate('seller', 'name businessName avatar rating address plan')
    .populate('category', 'name slug')
    .sort({ 'price.min': 1 })
    .lean();

  res.json(products);
});

/**
 * PUT /api/products/:id/print-specs
 * Seller updates print specs for their product.
 */
const updatePrintSpecs = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, seller: req.user._id });
  if (!product) {
    res.status(404);
    throw new Error('Product not found or unauthorized');
  }
  product.printSpecs = { ...product.printSpecs?.toObject?.() || {}, ...req.body };
  await product.save();
  res.json(product);
});

module.exports = {
  getProducts,
  getProductBySlug,
  getFeaturedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  addReview,
  getSellerProducts,
  compareProducts,
  updatePrintSpecs,
};
