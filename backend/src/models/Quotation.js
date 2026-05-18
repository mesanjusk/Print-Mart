const mongoose = require('mongoose');

const quotationItemSchema = new mongoose.Schema(
  {
    description: { type: String },
    quantity: { type: Number },
    unit: { type: String },
    unitPrice: { type: Number },
    total: { type: Number },
  },
  { _id: false }
);

const quotationSchema = new mongoose.Schema(
  {
    inquiry: { type: mongoose.Schema.Types.ObjectId, ref: 'Inquiry' },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    items: [quotationItemSchema],
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    validUntil: {
      type: Date,
      default: () => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d;
      },
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'],
      default: 'draft',
    },
    notes: { type: String },
    whatsappSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Quotation', quotationSchema);
