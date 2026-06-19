const mongoose = require('mongoose');

const whatsAppOptOutSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reason: { type: String, default: 'user_request' },
  optedOutAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('WhatsAppOptOut', whatsAppOptOutSchema);
