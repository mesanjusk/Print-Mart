/**
 * Creates a superadmin user in the database.
 *
 * Usage:
 *   MONGO_URI=<your-uri> node seed-superadmin.js
 *
 * Or put MONGO_URI in your .env file and run:
 *   node seed-superadmin.js
 *
 * Safe to re-run — if the email already exists the user is promoted
 * to superadmin without duplicating the record.
 */
require('dotenv').config();
const mongoose = require('mongoose');

const SUPERADMIN = {
  name:     'Super Admin',
  email:    'superadmin@printmart.in',
  password: 'SuperAdmin@123',
  phone:    '919000000000',
};

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌  MONGO_URI is not set. Add it to .env or pass it as an env variable.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  const User = require('./src/models/User');

  const existing = await User.findOne({ email: SUPERADMIN.email });

  if (existing) {
    existing.role = 'superadmin';
    existing.isVerified = true;
    existing.isActive = true;
    await existing.save();
    console.log(`✅ Existing user "${SUPERADMIN.email}" promoted to superadmin.`);
  } else {
    await User.create({ ...SUPERADMIN, role: 'superadmin', isVerified: true, isActive: true });
    console.log('✅ Superadmin created successfully.');
    console.log('');
    console.log('  Email   :', SUPERADMIN.email);
    console.log('  Password:', SUPERADMIN.password);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
