const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true },
  description: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  images: [{ type: String }],
  price: {
    min: { type: Number, required: true },
    max: { type: Number },
    unit: { type: String, default: 'piece' },
  },
  minOrderQty: { type: Number, default: 1 },
  specifications: [{ key: String, value: String }],
  tags: [{ type: String }],
  brand: { type: String },
  inStock: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
  inquiries: { type: Number, default: 0 },
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
  },
  isActive: { type: Boolean, default: true },
  // Structured print specs for price comparison
  printSpecs: {
    paperWeight: { type: Number },           // gsm: 130, 250, 300, 350
    size: { type: String },                  // 'standard', 'A4', 'A5', '12x18ft', custom
    finish: { type: String, enum: ['matte', 'glossy', 'uncoated', 'soft-touch', 'uv', 'other'] },
    quantity: { type: Number },              // standard: 100, 250, 500, 1000, 5000
    sides: { type: String, enum: ['single', 'double', 'na'] },
    deliveryDays: { type: Number },          // 1, 2, 3, 5, 7
    material: { type: String },              // for banners/gifts: flex, vinyl, plastic, metal
  },
}, { timestamps: true });

productSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = slugify(`${this.name}-${Date.now()}`, { lower: true });
  }
  next();
});

productSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema);
