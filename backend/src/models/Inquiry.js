const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // For unmatched / guest inquiries where FK is not available
  productName: { type: String },
  buyerPhone: { type: String },
  buyerName: { type: String },
  isUnmatched: { type: Boolean, default: false },
  message: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  unit: { type: String, default: 'pieces' },
  status: {
    type: String,
    enum: ['pending', 'responded', 'closed'],
    default: 'pending',
  },
  replies: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: { type: String },
    createdAt: { type: Date, default: Date.now },
  }],
  // Design file uploaded by buyer
  design: { type: mongoose.Schema.Types.ObjectId, ref: 'Design' },
  designFileUrl: { type: String },
  // Sellers notified via push about this inquiry
  broadcastedSellers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Sellers who accepted and are ready to fulfil (buyer can WhatsApp them directly)
  sellerInterests: [{
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sellerName: { type: String },
    sellerBusiness: { type: String },
    sellerPhone: { type: String },
    acceptedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

module.exports = mongoose.model('Inquiry', inquirySchema);
