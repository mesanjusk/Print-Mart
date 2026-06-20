const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');

dotenv.config();

connectDB();

const app = express();

const ALLOWED_ORIGINS = [
  'https://app.instify.in',
  'https://shop.instify.in',
  'https://appinstifyin.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

if (process.env.CLIENT_URL) {
  process.env.CLIENT_URL.split(',').forEach((u) => {
    const trimmed = u.trim();
    if (!ALLOWED_ORIGINS.includes(trimmed)) ALLOWED_ORIGINS.push(trimmed);
  });
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      ALLOWED_ORIGINS.includes(origin) ||
      /\.vercel\.app$/.test(origin) ||
      /^http:\/\/localhost(:\d+)?$/.test(origin)
    ) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/products', require('./src/routes/productRoutes'));
app.use('/api/categories', require('./src/routes/categoryRoutes'));
app.use('/api/inquiries', require('./src/routes/inquiryRoutes'));
app.use('/api/suppliers', require('./src/routes/supplierRoutes'));
app.use('/api/quotations', require('./src/routes/quotationRoutes'));
app.use('/api/orders', require('./src/routes/orderRoutes'));
app.use('/api/whatsapp', require('./src/routes/whatsappRoutes'));
app.use('/api/admin/whatsapp', require('./src/routes/whatsappAdminRoutes'));
app.use('/api/admin/bulk', require('./src/routes/bulkRoutes'));
app.use('/api/designs', require('./src/routes/designRoutes'));
app.use('/api/offers', require('./src/routes/offerRoutes'));
app.use('/api/push', require('./src/routes/pushRoutes'));

app.get('/', (req, res) => {
  res.json({ message: 'PrintMart API is running', status: 'ok' });
});

// One-time campaign seed
app.post('/api/seed-campaign', async (req, res) => {
  try {
    const WhatsAppCampaign = require('./src/models/WhatsAppCampaign');
    const { keyword = 'hi', reply = 'test', name = 'Hi Auto-Reply' } = req.body;
    const existing = await WhatsAppCampaign.findOne({ name });
    if (existing) return res.json({ message: 'Campaign already exists', campaign: existing });
    const campaign = await WhatsAppCampaign.create({
      name,
      type: 'auto_reply',
      status: 'active',
      trigger: { keywords: [keyword.toLowerCase()], matchType: 'exact', roles: ['any'] },
      response: { messageType: 'text', content: reply },
      respectOptOut: true,
    });
    res.json({ message: 'Campaign created', campaign });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// One-time admin bootstrap
// If no admin exists yet → allowed without secret (first-run mode)
// If admin already exists → requires ADMIN_SEED_SECRET env var
app.get('/api/seed-admin/status', async (req, res) => {
  try {
    const User = require('./src/models/User');
    const superadminExists = await User.exists({ role: 'superadmin' });
    res.json({
      adminExists: !!superadminExists,
      secretConfigured: !!process.env.ADMIN_SEED_SECRET,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/seed-admin', async (req, res) => {
  const { secret, name, email, password, phone } = req.body;
  try {
    const User = require('./src/models/User');
    const generateToken = require('./src/utils/generateToken');
    const superadminExists = await User.exists({ role: 'superadmin' });

    if (superadminExists) {
      const SEED_SECRET = process.env.ADMIN_SEED_SECRET;
      if (!SEED_SECRET || secret !== SEED_SECRET) {
        return res.status(403).json({ message: 'A superadmin already exists. Provide the correct ADMIN_SEED_SECRET.' });
      }
    }

    let user = await User.findOne({ email });
    if (user) {
      user.role = 'superadmin';
      user.isVerified = true;
      await user.save();
      return res.json({ message: 'Existing user promoted to superadmin', email: user.email, role: user.role });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    user = await User.create({ name: name || 'Super Admin', email, password, phone, role: 'superadmin', isVerified: true });
    res.status(201).json({
      message: 'Superadmin created successfully',
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
