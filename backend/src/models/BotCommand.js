const mongoose = require('mongoose');

const buttonSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true, maxlength: 20 },
}, { _id: false });

const botCommandSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  description: { type: String, default: '' },
  role: { type: String, enum: ['guest', 'buyer', 'seller', 'any'], default: 'any' },
  triggers: [{ type: String }],
  response: {
    type: { type: String, enum: ['text', 'button'], default: 'button' },
    text: { type: String, default: '' },
    buttons: {
      type: [buttonSchema],
      validate: { validator: (v) => v.length <= 3, message: 'Maximum 3 buttons allowed' },
      default: [],
    },
  },
  isActive: { type: Boolean, default: true },
  isSystem: { type: Boolean, default: false },
  priority: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('BotCommand', botCommandSchema);
