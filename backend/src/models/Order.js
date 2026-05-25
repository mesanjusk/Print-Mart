const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    description: String,
    quantity: Number,
    unit: String,
    unitPrice: Number,
    total: Number,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true },
    quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
    inquiry: { type: mongoose.Schema.Types.ObjectId, ref: 'Inquiry' },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    items: [orderItemSchema],
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending_payment', 'paid', 'processing', 'dispatched', 'delivered', 'cancelled'],
      default: 'pending_payment',
    },
    paymentMethod: { type: String, default: 'bank_transfer' },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending',
    },
    paymentConfirmedAt: Date,
    dispatchedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    trackingInfo: { type: String },
    cancelReason: { type: String },
    deliveryAddress: {
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
    notes: { type: String },
    createdViaWhatsapp: { type: Boolean, default: false },
  },
  { timestamps: true }
);

orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `PM-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
