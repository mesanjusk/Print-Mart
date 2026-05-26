const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  printSpecs: {
    paperWeight: Number,
    size: String,
    finish: String,
    quantity: Number,
    sides: String,
    deliveryDays: Number,
    material: String,
  },
  images: [String],
  originalPrice: { type: Number },
  offerPrice: { type: Number, required: true },
  unit: { type: String, default: 'piece' },
  minOrderQty: { type: Number, default: 1 },
  maxSlots: { type: Number },        // club printing: limited slots
  claimedCount: { type: Number, default: 0 },
  tags: [String],
  expiresAt: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Virtual: discountPct
offerSchema.virtual('discountPct').get(function () {
  if (!this.originalPrice || !this.offerPrice) return 0;
  return Math.round(((this.originalPrice - this.offerPrice) / this.originalPrice) * 100);
});

offerSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Offer', offerSchema);
