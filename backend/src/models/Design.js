const mongoose = require('mongoose');

const designSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  fileUrl: { type: String, required: true },
  thumbnailUrl: { type: String },
  fileType: { type: String },           // pdf, png, jpg
  category: { type: String },           // visiting-card, banner, brochure, etc.
  description: { type: String },
  usedCount: { type: Number, default: 0 },
  lastUsedProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Design', designSchema);
