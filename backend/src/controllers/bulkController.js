const asyncHandler = require('express-async-handler');
const Category = require('../models/Category');
const Product = require('../models/Product');
const User = require('../models/User');
const wa = require('../services/whatsapp');
const generateToken = require('../utils/generateToken');

// POST /api/admin/bulk/categories
const bulkImportCategories = asyncHandler(async (req, res) => {
  const { categories } = req.body;
  if (!Array.isArray(categories) || !categories.length) {
    res.status(400); throw new Error('categories array required');
  }
  const results = { created: [], skipped: [], errors: [] };
  for (const cat of categories) {
    try {
      const exists = await Category.findOne({ name: cat.name.trim() });
      if (exists) { results.skipped.push(cat.name); continue; }
      await Category.create({ name: cat.name.trim(), description: cat.description, icon: cat.icon });
      results.created.push(cat.name);
    } catch (e) { results.errors.push({ name: cat.name, error: e.message }); }
  }
  res.json(results);
});

// POST /api/admin/bulk/products
const bulkImportProducts = asyncHandler(async (req, res) => {
  const { products } = req.body;
  if (!Array.isArray(products) || !products.length) {
    res.status(400); throw new Error('products array required');
  }
  const results = { created: [], skipped: [], errors: [] };
  for (const p of products) {
    try {
      const category = await Category.findOne({ name: { $regex: new RegExp(`^${p.categoryName}$`, 'i') } });
      if (!category) { results.errors.push({ name: p.name, error: `Category "${p.categoryName}" not found` }); continue; }
      const seller = await User.findOne({ email: p.sellerEmail?.toLowerCase() });
      if (!seller) { results.errors.push({ name: p.name, error: `Seller "${p.sellerEmail}" not found` }); continue; }
      const exists = await Product.findOne({ name: p.name.trim(), seller: seller._id });
      if (exists) { results.skipped.push(p.name); continue; }
      await Product.create({
        name: p.name.trim(),
        description: p.description || p.name,
        category: category._id,
        seller: seller._id,
        price: { min: Number(p.priceMin) || 0, max: Number(p.priceMax) || undefined, unit: p.unit || 'piece' },
        minOrderQty: Number(p.minOrderQty) || 1,
        tags: Array.isArray(p.tags) ? p.tags : (p.tags || '').split(',').map(t => t.trim()).filter(Boolean),
      });
      results.created.push(p.name);
    } catch (e) { results.errors.push({ name: p.name, error: e.message }); }
  }
  res.json(results);
});

// POST /api/admin/bulk/sellers
const bulkImportSellers = asyncHandler(async (req, res) => {
  const { sellers } = req.body;
  if (!Array.isArray(sellers) || !sellers.length) {
    res.status(400); throw new Error('sellers array required');
  }
  const results = { created: [], skipped: [], errors: [] };
  const generateOTP = () => String(Math.floor(1000000 + Math.random() * 9000000));

  for (const s of sellers) {
    try {
      const exists = await User.findOne({ email: s.email.toLowerCase() });
      if (exists) { results.skipped.push(s.email); continue; }
      const tempPassword = generateOTP();
      const user = await User.create({
        name: s.name.trim(),
        email: s.email.toLowerCase(),
        password: tempPassword,
        phone: s.phone ? String(s.phone).replace(/\D/g,'').replace(/^0/,'91') : undefined,
        role: 'seller',
        businessName: s.businessName,
        gstin: s.gstin,
        isVerified: false,
      });
      if (user.phone) {
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        user.otpCode = otp;
        user.otpPurpose = 'verify_email';
        user.otpExpire = new Date(Date.now() + 30 * 60 * 1000);
        await user.save();
        await wa.sendTextMessage(user.phone,
          `👋 Welcome to *PrintMart*, ${user.name}!\n\n` +
          `Your account has been created by our team.\n\n` +
          `📧 Email: ${user.email}\n` +
          `🔑 Temp Password: *${tempPassword}*\n\n` +
          `Your admin will confirm your account shortly.\n` +
          `🔐 Verification Code: *${otp}*\n\n` +
          `Share this code with your PrintMart admin to activate your account.\n\n` +
          `🔗 Login: ${process.env.CLIENT_URL || 'https://app.instify.in'}/login`
        ).catch(() => {});
        results.created.push({ email: s.email, name: s.name, otpSent: true });
      } else {
        results.created.push({ email: s.email, name: s.name, otpSent: false });
      }
    } catch (e) { results.errors.push({ email: s.email, error: e.message }); }
  }
  res.json(results);
});

// POST /api/admin/bulk/sellers/confirm-otp
const confirmSellerOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({
    email: email.toLowerCase(),
    otpCode: otp,
    otpPurpose: 'verify_email',
    otpExpire: { $gt: new Date() },
  });
  if (!user) { res.status(400); throw new Error('Invalid or expired OTP'); }
  user.isVerified = true;
  user.otpCode = undefined;
  user.otpPurpose = undefined;
  user.otpExpire = undefined;
  await user.save();
  if (user.phone) {
    await wa.sendTextMessage(user.phone,
      `✅ *Account Activated!*\n\n` +
      `Your PrintMart seller account is now active, ${user.name}!\n\n` +
      `🔗 Login: ${process.env.CLIENT_URL || 'https://app.instify.in'}/login\n\n` +
      `Reply *MENU* to get started.`
    ).catch(() => {});
  }
  res.json({ message: 'Seller account activated', user: { name: user.name, email: user.email } });
});

// GET /api/admin/bulk/catalog
const getCatalog = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).select('name slug icon').sort('name');
  const products = await Product.find({ isActive: true })
    .select('name category price.min price.unit')
    .populate('category', 'name')
    .sort('name')
    .limit(500);
  res.json({ categories, products });
});

// POST /api/admin/sellers (add single seller)
const addSingleSeller = asyncHandler(async (req, res) => {
  const { name, email, phone, businessName, gstin } = req.body;
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) { res.status(400); throw new Error('Email already registered'); }
  const generateOTP = () => String(Math.floor(1000000 + Math.random() * 9000000));
  const tempPassword = generateOTP();
  const cleanPhone = phone ? String(phone).replace(/\D/,'').replace(/^0/,'91') : undefined;
  const user = await User.create({
    name: name.trim(), email: email.toLowerCase(), password: tempPassword,
    phone: cleanPhone, role: 'seller', businessName, gstin, isVerified: false,
  });
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  user.otpCode = otp;
  user.otpPurpose = 'verify_email';
  user.otpExpire = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();
  if (cleanPhone) {
    await wa.sendTextMessage(cleanPhone,
      `👋 Welcome to *PrintMart*, ${name}!\n\n` +
      `Your seller account has been created.\n\n` +
      `📧 Email: ${email}\n` +
      `🔑 Temp Password: *${tempPassword}*\n\n` +
      `🔐 Verification Code: *${otp}*\n\n` +
      `Share this code with your PrintMart admin to activate your account.\n\n` +
      `🔗 Login: ${process.env.CLIENT_URL || 'https://app.instify.in'}/login`
    ).catch(() => {});
  }
  res.status(201).json({ message: 'Seller created', email, tempPassword, otpSent: !!cleanPhone });
});

module.exports = { bulkImportCategories, bulkImportProducts, bulkImportSellers, confirmSellerOTP, getCatalog, addSingleSeller };
