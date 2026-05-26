const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  phone: { type: String },
  role: { type: String, enum: ['buyer', 'seller', 'admin'], default: 'buyer' },
  avatar: { type: String, default: '' },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' },
  },
  businessName: { type: String },
  gstin: { type: String },
  savedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  // Seller plan: only 'premium' sellers receive lead broadcasts
  plan: { type: String, enum: ['free', 'premium'], default: 'free' },
  planActivatedAt: { type: Date },
  lastSeenAt: { type: Date },
  morningDigestOptIn: { type: Boolean, default: false },
  // PWA push notification subscription
  pushSubscription: {
    endpoint: { type: String },
    keys: {
      p256dh: { type: String },
      auth: { type: String },
    },
  },
  pushEnabled: { type: Boolean, default: false },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
