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
      /\.onrender\.com$/.test(origin) ||
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

// ── TEMPORARY superadmin setup page — DELETE after use ──────────────────────
const SETUP_PATH = '/setup/pm-root-4f8d2a1c';

app.get(SETUP_PATH, (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>PrintMart — Superadmin Setup</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;
         background:#0f172a;font-family:system-ui,sans-serif;color:#f1f5f9}
    .card{background:#1e293b;border:1px solid #334155;border-radius:12px;
          padding:36px 40px;width:100%;max-width:420px;box-shadow:0 20px 60px #0008}
    h1{font-size:1.4rem;font-weight:700;margin-bottom:6px;color:#f8fafc}
    p.sub{font-size:.85rem;color:#94a3b8;margin-bottom:28px}
    label{display:block;font-size:.8rem;color:#94a3b8;margin-bottom:4px;margin-top:16px;font-weight:500;text-transform:uppercase;letter-spacing:.05em}
    input{width:100%;padding:10px 14px;background:#0f172a;border:1px solid #334155;
          border-radius:8px;color:#f1f5f9;font-size:.95rem;outline:none;transition:border .2s}
    input:focus{border-color:#6366f1}
    button{margin-top:24px;width:100%;padding:12px;background:#6366f1;border:none;
           border-radius:8px;color:#fff;font-size:1rem;font-weight:600;cursor:pointer;transition:background .2s}
    button:hover{background:#4f46e5}
    button:disabled{background:#334155;cursor:not-allowed}
    #msg{margin-top:16px;padding:12px 14px;border-radius:8px;font-size:.9rem;display:none}
    .success{background:#14532d44;border:1px solid #16a34a;color:#86efac}
    .error{background:#7f1d1d44;border:1px solid #dc2626;color:#fca5a5}
    .creds{margin-top:12px;background:#0f172a;border:1px solid #334155;border-radius:8px;
           padding:12px 14px;font-size:.85rem;line-height:1.8}
    .creds span{color:#818cf8;font-weight:600}
  </style>
</head>
<body>
<div class="card">
  <h1>Superadmin Setup</h1>
  <p class="sub">One-time bootstrap — create the root admin account.</p>
  <form id="form">
    <label>Full Name</label>
    <input id="name" type="text" placeholder="Super Admin" value="Super Admin" required/>
    <label>Email</label>
    <input id="email" type="email" placeholder="admin@printmart.in" required/>
    <label>Password</label>
    <input id="password" type="password" placeholder="Min 6 characters" required/>
    <label>Phone (with country code)</label>
    <input id="phone" type="text" placeholder="919XXXXXXXXX"/>
    <button type="submit" id="btn">Create Superadmin</button>
  </form>
  <div id="msg"></div>
</div>
<script>
  document.getElementById('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn');
    const msg = document.getElementById('msg');
    btn.disabled = true; btn.textContent = 'Creating…';
    msg.style.display = 'none';
    try {
      const r = await fetch('/api/seed-admin', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          name: document.getElementById('name').value.trim(),
          email: document.getElementById('email').value.trim(),
          password: document.getElementById('password').value,
          phone: document.getElementById('phone').value.trim(),
        })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Failed');
      msg.className = 'success'; msg.style.display = 'block';
      msg.innerHTML = '✅ ' + data.message +
        '<div class="creds">Email: <span>' + data.email + '</span><br>Role: <span>' + data.role + '</span></div>';
      document.getElementById('form').style.display = 'none';
    } catch(err) {
      msg.className = 'error'; msg.style.display = 'block';
      msg.textContent = '❌ ' + err.message;
      btn.disabled = false; btn.textContent = 'Create Superadmin';
    }
  });
</script>
</body>
</html>`);
});
// ── END TEMPORARY ────────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
