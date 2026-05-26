const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  code: { type: String, required: true }, // hashed
  purpose: { type: String, enum: ['registration', 'reset'], required: true },
  email: { type: String }, // used for reset purpose lookup
  createdAt: { type: Date, default: Date.now, expires: 600 }, // auto-delete after 10 min
});

otpSchema.index({ phone: 1, purpose: 1 });

module.exports = mongoose.model('OTP', otpSchema);
