const BotCommand = require('../models/BotCommand');

const CLIENT_URL = process.env.CLIENT_URL || 'https://shop.instify.in';

const DEFAULT_COMMANDS = [
  {
    key: 'main_menu',
    label: 'Main Menu (Guest)',
    description: 'Default greeting shown to unknown/unregistered users',
    role: 'guest',
    triggers: ['hi', 'hello', 'hey', 'start', 'menu'],
    response: {
      type: 'button',
      text: `👋 Hello! Welcome to *PrintMart* 🖨️\n\nIndia's WhatsApp-first print marketplace.\n\nHow can we help you today?`,
      buttons: [
        { id: 'INQUIRE', title: 'Get a Quote' },
        { id: 'REGISTER', title: 'Register' },
        { id: 'HELP', title: 'Help' },
      ],
    },
    isActive: true,
    isSystem: true,
  },
  {
    key: 'guest_inquire_prompt',
    label: 'Guest Inquiry - Start',
    description: 'First message when a guest starts a product inquiry',
    role: 'guest',
    triggers: ['inquire', 'inquiry', 'enquire', 'enquiry', 'quote', 'price', 'buy', 'get a quote'],
    response: {
      type: 'text',
      text: `📦 *What product are you looking for?*\n\nPlease type the product name:\n_(e.g., Business Cards, Flyers, Banners, T-Shirts)_`,
      buttons: [],
    },
    isActive: true,
    isSystem: true,
  },
  {
    key: 'guest_register_prompt',
    label: 'Guest Registration - Start',
    description: 'Shown when a guest types REGISTER — prompts account type selection',
    role: 'guest',
    triggers: ['register', 'join', 'signup', 'new account', 'sell', 'seller'],
    response: {
      type: 'button',
      text: `✅ Let's get you set up!\n\nAre you joining as a:`,
      buttons: [
        { id: 'BUYER', title: 'Buyer' },
        { id: 'SELLER', title: 'Seller' },
      ],
    },
    isActive: true,
    isSystem: true,
  },
  {
    key: 'guest_help',
    label: 'Guest Help',
    description: 'Help menu shown to unregistered users',
    role: 'guest',
    triggers: ['help', '?', 'commands'],
    response: {
      type: 'button',
      text: `*How can we help?*\n\n• Tap *Get a Quote* to send a requirement to sellers\n• Tap *Register* to create a free account\n\n🌐 Website: ${CLIENT_URL}\n📞 Support: +91 93701 95000`,
      buttons: [
        { id: 'INQUIRE', title: 'Get a Quote' },
        { id: 'REGISTER', title: 'Register' },
      ],
    },
    isActive: true,
    isSystem: true,
  },
  {
    key: 'buyer_welcome',
    label: 'Buyer Welcome',
    description: 'Shown when a registered buyer says hi/hello or taps MENU. Use {name} for their name.',
    role: 'buyer',
    triggers: ['hi', 'hello', 'hey', 'start', 'menu', 'home'],
    response: {
      type: 'button',
      text: `👋 Welcome back, *{name}*!\n\nWhat would you like to do?`,
      buttons: [
        { id: 'STATUS', title: 'My Inquiries' },
        { id: 'ORDERS', title: 'My Orders' },
        { id: 'HELP', title: 'Help' },
      ],
    },
    isActive: true,
    isSystem: true,
  },
  {
    key: 'buyer_help',
    label: 'Buyer Help',
    description: 'Help menu for registered buyers',
    role: 'buyer',
    triggers: ['help', '?', 'commands'],
    response: {
      type: 'button',
      text: `*PrintMart Help – Buyer*\n\n• *QUOTES* – View pending quotations\n• *ACCEPT / REJECT* – Respond to a quote\n• *PAID [order]* – Confirm payment\n• *TRACK [order]* – Track an order\n• *CANCEL [order]* – Cancel an order\n• *SELLER* – Upgrade to Seller account\n• *RESET* – Get a new login link\n• *MENU* – Back to main menu`,
      buttons: [
        { id: 'STATUS', title: 'My Inquiries' },
        { id: 'ORDERS', title: 'My Orders' },
        { id: 'LIST_QUOTES', title: 'My Quotes' },
      ],
    },
    isActive: true,
    isSystem: true,
  },
  {
    key: 'seller_welcome',
    label: 'Seller Welcome',
    description: 'Shown when a registered seller says hi/hello or taps MENU. Use {name} for their name.',
    role: 'seller',
    triggers: ['hi', 'hello', 'hey', 'start', 'menu', 'home'],
    response: {
      type: 'button',
      text: `👋 Welcome back, *{name}*!\n\nWhat would you like to do?`,
      buttons: [
        { id: 'STATUS', title: 'Pending Inquiries' },
        { id: 'ORDERS', title: 'My Orders' },
        { id: 'HELP', title: 'Help' },
      ],
    },
    isActive: true,
    isSystem: true,
  },
  {
    key: 'seller_help',
    label: 'Seller Help',
    description: 'Help menu for registered sellers/vendors',
    role: 'seller',
    triggers: ['help', '?', 'commands'],
    response: {
      type: 'button',
      text: `*PrintMart Help – Vendor*\n\n• *QUOTE [amount]* – Send quotation (e.g. QUOTE 5000)\n• *DISPATCH [order] [tracking]* – Mark dispatched\n• *DELIVER [order]* – Mark as delivered\n• *ORDERS* – View all orders\n• *RESET* – Get a new login link\n• *MENU* – Back to main menu\n\nOr just reply here to respond to an inquiry.`,
      buttons: [
        { id: 'STATUS', title: 'Pending Inquiries' },
        { id: 'ORDERS', title: 'My Orders' },
      ],
    },
    isActive: true,
    isSystem: true,
  },
  {
    key: 'opt_out',
    label: 'Opt-Out Confirmation',
    description: 'Sent when a user opts out with STOP/UNSUBSCRIBE',
    role: 'any',
    triggers: ['stop', 'unsubscribe', 'optout', 'opt out'],
    response: {
      type: 'text',
      text: `✅ You've been unsubscribed from PrintMart WhatsApp messages.\n\nTo opt back in, reply *START* anytime.`,
      buttons: [],
    },
    isActive: true,
    isSystem: true,
  },
];

const ensureSeeded = async () => {
  const count = await BotCommand.countDocuments();
  if (count === 0) {
    await BotCommand.insertMany(DEFAULT_COMMANDS);
  }
};

exports.getCommands = async (req, res) => {
  try {
    await ensureSeeded();
    const commands = await BotCommand.find().sort({ role: 1, priority: 1, key: 1 });
    res.json(commands);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createCommand = async (req, res) => {
  try {
    const { key, label, description, role, triggers, response, isActive } = req.body;
    if (await BotCommand.exists({ key })) {
      return res.status(400).json({ message: 'A command with this key already exists' });
    }
    const cmd = await BotCommand.create({
      key, label,
      description: description || '',
      role: role || 'any',
      triggers: triggers || [],
      response: {
        type: response?.type || 'text',
        text: response?.text || '',
        buttons: response?.buttons || [],
      },
      isActive: isActive !== undefined ? isActive : true,
      isSystem: false,
    });
    res.status(201).json(cmd);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateCommand = async (req, res) => {
  try {
    const { label, description, role, triggers, response, isActive } = req.body;
    const cmd = await BotCommand.findById(req.params.id);
    if (!cmd) return res.status(404).json({ message: 'Command not found' });

    if (label !== undefined) cmd.label = label;
    if (description !== undefined) cmd.description = description;
    if (role !== undefined) cmd.role = role;
    if (triggers !== undefined) cmd.triggers = triggers;
    if (isActive !== undefined) cmd.isActive = isActive;
    if (response !== undefined) {
      if (response.type !== undefined) cmd.response.type = response.type;
      if (response.text !== undefined) cmd.response.text = response.text;
      if (response.buttons !== undefined) cmd.response.buttons = response.buttons;
    }

    await cmd.save();
    res.json(cmd);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteCommand = async (req, res) => {
  try {
    const cmd = await BotCommand.findById(req.params.id);
    if (!cmd) return res.status(404).json({ message: 'Command not found' });
    if (cmd.isSystem) return res.status(403).json({ message: 'System commands cannot be deleted. Use Reset to restore defaults.' });
    await cmd.deleteOne();
    res.json({ message: 'Command deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.resetToDefault = async (req, res) => {
  try {
    const cmd = await BotCommand.findById(req.params.id);
    if (!cmd) return res.status(404).json({ message: 'Command not found' });
    const defaults = DEFAULT_COMMANDS.find((d) => d.key === cmd.key);
    if (!defaults) return res.status(400).json({ message: 'No default configuration found for this command key' });

    cmd.label = defaults.label;
    cmd.description = defaults.description;
    cmd.role = defaults.role;
    cmd.triggers = defaults.triggers;
    cmd.response = defaults.response;
    cmd.isActive = defaults.isActive;
    await cmd.save();
    res.json(cmd);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.reorderCommands = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ message: 'orderedIds must be an array' });
    await Promise.all(orderedIds.map((id, idx) =>
      BotCommand.findByIdAndUpdate(id, { priority: idx * 10 })
    ));
    res.json({ message: 'Order saved' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.DEFAULT_COMMANDS = DEFAULT_COMMANDS;
