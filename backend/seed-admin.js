/**
 * Run once to create the super admin:
 *   node seed-admin.js
 *
 * Set these before running (or put in .env):
 *   MONGO_URI=your-mongodb-uri
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ── Edit these ──────────────────────────────────────────
const ADMIN = {
  name:     'Super Admin',
  email:    'admin@printmart.in',   // change this
  password: 'Admin@1234',           // change this
  phone:    '919876543210',         // change this (with country code)
};
// ────────────────────────────────────────────────────────

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const User = require('./src/models/User');

  const exists = await User.findOne({ email: ADMIN.email });
  if (exists) {
    exists.role = 'admin';
    await exists.save();
    console.log(`✅ Existing user "${ADMIN.email}" promoted to admin.`);
  } else {
    await User.create({ ...ADMIN, role: 'admin' });
    console.log(`✅ Admin created: ${ADMIN.email} / ${ADMIN.password}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
