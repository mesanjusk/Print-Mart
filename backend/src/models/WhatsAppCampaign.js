const mongoose = require('mongoose');

const whatsAppCampaignSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['auto_reply', 'broadcast_campaign'],
    required: true,
  },

  // Auto-reply trigger (only for auto_reply type)
  trigger: {
    keywords: [{ type: String, lowercase: true, trim: true }],
    matchType: { type: String, enum: ['exact', 'contains', 'starts_with'], default: 'contains' },
    roles: [{ type: String, enum: ['buyer', 'seller', 'unknown', 'any'] }], // who triggers it
  },

  // Message to send
  response: {
    messageType: { type: String, enum: ['text', 'template', 'interactive'], default: 'text' },
    content: { type: String }, // plain text content
    templateName: { type: String }, // Meta template name
    templateLanguage: { type: String, default: 'en' },
    templateParams: [{ type: String }], // {{1}}, {{2}} values
    buttons: [{ id: String, title: String }], // for interactive type
  },

  // Broadcast audience (only for broadcast_campaign)
  audience: {
    roles: [{ type: String, enum: ['buyer', 'seller', 'admin', 'all'] }],
    phones: [{ type: String }], // specific phone list
    premiumOnly: { type: Boolean, default: false },
  },

  // Schedule (for broadcast_campaign)
  schedule: {
    type: { type: String, enum: ['immediate', 'scheduled'], default: 'immediate' },
    scheduledAt: { type: Date },
  },

  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'draft'],
    default: 'draft',
  },

  // Opt-out respect
  respectOptOut: { type: Boolean, default: true },

  stats: {
    sent: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    read: { type: Number, default: 0 },
  },

  lastRunAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('WhatsAppCampaign', whatsAppCampaignSchema);
