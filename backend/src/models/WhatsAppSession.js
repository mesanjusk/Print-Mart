const mongoose = require('mongoose');

const whatsAppSessionSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    role: { type: String, enum: ['buyer', 'seller', 'admin', 'unknown'], default: 'unknown' },
    state: { type: String, default: 'idle' },
    context: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastActivity: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WhatsAppSession', whatsAppSessionSchema);
