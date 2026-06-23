/**
 * Run once to create the superadmin user:
 *   MONGO_URI=<your-uri> node seed-admin.js
 *
 * Or put MONGO_URI in .env and run:
 *   node seed-admin.js
 *
 * Prefer seed-superadmin.js for a cleaner, dedicated script.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ── Edit these ──────────────────────────────────────────
const ADMIN = {
  name:     'Super Admin',
  email:    'superadmin@printmart.in',
  password: 'SuperAdmin@123',
  phone:    '919000000000',         // with country code
};
// ────────────────────────────────────────────────────────

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const User = require('./src/models/User');

  const exists = await User.findOne({ email: ADMIN.email });
  if (exists) {
    exists.role = 'superadmin';
    exists.isVerified = true;
    exists.isActive = true;
    await exists.save();
    console.log(`✅ Existing user "${ADMIN.email}" promoted to superadmin.`);
  } else {
    await User.create({ ...ADMIN, role: 'superadmin', isVerified: true, isActive: true });
    console.log(`✅ Superadmin created: ${ADMIN.email} / ${ADMIN.password}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
