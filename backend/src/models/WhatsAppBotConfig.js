const mongoose = require('mongoose');

const WhatsAppBotConfigSchema = new mongoose.Schema({
  botEnabled: { type: Boolean, default: true },

  // Core bot messages (support {{name}}, {{clientUrl}} variables)
  welcomeBuyer: {
    type: String,
    default: `👋 Hello {{name}}! Welcome to *PrintMart*.\n\n📦 What can I help you with today?\n\n*ORDERS* – View your orders\n*QUOTES* – View quotations\n*STATUS* – Check status\n*HELP* – All available commands\n*STOP* – Unsubscribe from messages`,
  },
  welcomeSeller: {
    type: String,
    default: `👋 Hello {{name}}! Welcome to *PrintMart Seller Hub*.\n\n📊 What can I help you with?\n\n*ORDERS* – View your orders\n*STATUS* – Check pending inquiries & orders\n*HELP* – All seller commands\n*STOP* – Unsubscribe from messages`,
  },
  helpBuyer: {
    type: String,
    default: `📋 *PrintMart Buyer Commands*\n\n*HI / HELLO* – Show welcome menu\n*ORDERS* – Your recent orders\n*QUOTES* – Pending quotations\n*STATUS* – Quick overview\n*ACCEPT* – Accept latest quotation\n*REJECT* – Reject latest quotation\n*PAID [order#]* – Confirm payment\n*TRACK [order#]* – Track order\n*CANCEL [order#]* – Cancel order\n*STOP* – Unsubscribe from messages\n\n💡 You can also reply to any message to send it to the vendor.`,
  },
  helpSeller: {
    type: String,
    default: `📋 *PrintMart Seller Commands*\n\n*HI / HELLO* – Show welcome menu\n*ORDERS* – Your orders\n*STATUS* – Pending inquiries & orders\n*QUOTE [amount]* – Send quote to latest inquiry\n*QUOTE [INQ-xxx] [amount]* – Quote specific inquiry\n*DISPATCH [order#] [tracking]* – Mark order dispatched\n*DELIVER [order#]* – Mark order delivered\n*STOP* – Unsubscribe from messages\n\n💡 Reply to any message to send it to the buyer.`,
  },
  unknownUserGreeting: {
    type: String,
    default: `👋 Welcome to *PrintMart*!\n\nYou don't have an account yet.\n\n📝 Reply *REGISTER* to create a free account\n📩 Reply *INQUIRE* to send an inquiry without registering\n🌐 Or visit: {{clientUrl}}/register`,
  },
  fallbackMessage: {
    type: String,
    default: `Sorry, I didn't understand that. 🤔\n\nReply *HELP* to see all available commands.\nReply *MENU* to start over.`,
  },
  guestInquiryPrompt: {
    type: String,
    default: `📩 *Send an Inquiry – No Registration Needed!*\n\nJust type your request in this format:\n*Product name | Quantity | Your name*\n\nExample:\n_Business Cards | 500 pcs | Rahul_\n\nWe'll forward your inquiry to relevant sellers and they'll contact you here on WhatsApp! 📱\n\n💡 Register for free to track all your inquiries: reply *REGISTER*`,
  },
  optOutConfirmation: {
    type: String,
    default: `✅ You have been unsubscribed from PrintMart WhatsApp messages.\n\nYou will no longer receive marketing messages from us.\n\nReply *START* anytime to re-subscribe.`,
  },
  optInConfirmation: {
    type: String,
    default: `✅ Welcome back! You are now subscribed to PrintMart WhatsApp messages.\n\nReply *MENU* to get started.`,
  },

  // Custom commands (admin-defined keyword→response pairs)
  customCommands: [
    {
      keyword: { type: String, required: true, trim: true, lowercase: true },
      response: { type: String, required: true },
      matchType: { type: String, enum: ['exact', 'contains', 'starts_with'], default: 'exact' },
      roles: [{ type: String, enum: ['buyer', 'seller', 'all', 'unknown'] }],
      active: { type: Boolean, default: true },
    },
  ],

  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('WhatsAppBotConfig', WhatsAppBotConfigSchema);
