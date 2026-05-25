const mongoose = require('mongoose');

const whatsAppLogSchema = new mongoose.Schema(
  {
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    phone: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    messageType: {
      type: String,
      enum: ['text', 'interactive', 'template', 'image', 'button_reply', 'unknown'],
      default: 'text',
    },
    message: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed', 'received'],
      default: 'sent',
    },
    waMessageId: { type: String },
  },
  { timestamps: true }
);

whatsAppLogSchema.index({ phone: 1, createdAt: -1 });
whatsAppLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('WhatsAppLog', whatsAppLogSchema);
