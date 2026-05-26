const asyncHandler = require('express-async-handler');
const Offer = require('../models/Offer');
const User = require('../models/User');
const { sendPushToMany } = require('../services/pushNotification');

const createOffer = asyncHandler(async (req, res) => {
  const { title, description, category, printSpecs, originalPrice, offerPrice,
          unit, minOrderQty, maxSlots, tags, expiresAt, images } = req.body;

  if (!expiresAt || new Date(expiresAt) <= new Date()) {
    res.status(400); throw new Error('expiresAt must be a future date');
  }

  const offer = await Offer.create({
    seller: req.user._id,
    title, description, category, printSpecs,
    originalPrice, offerPrice, unit, minOrderQty, maxSlots,
    tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []),
    expiresAt, images: images || [],
  });

  // Push notification to all buyers who have push enabled
  try {
    const buyers = await User.find({
      role: { $in: ['buyer', 'seller'] },
      pushEnabled: true,
      _id: { $ne: req.user._id },
    }).select('pushSubscription pushEnabled').limit(500);

    const hoursLeft = Math.round((new Date(expiresAt) - new Date()) / 3600000);
    const timeLabel = hoursLeft < 24 ? `${hoursLeft}h left!` : `${Math.round(hoursLeft/24)} days left!`;

    await sendPushToMany(buyers, {
      title: `🔥 New Offer — ${title}`,
      body: `₹${offerPrice}/${unit} • ${timeLabel} Tap to grab it.`,
      url: '/offers',
      tag: `offer-${offer._id}`,
    }, (expiredId) => User.findByIdAndUpdate(expiredId, { pushEnabled: false }).catch(() => {}));
  } catch (err) {
    console.error('[Push] Offer notification failed:', err.message);
  }

  res.status(201).json(offer);
});

const getActiveOffers = asyncHandler(async (req, res) => {
  const { category, page = 1, limit = 20 } = req.query;
  const query = { isActive: true, expiresAt: { $gt: new Date() } };
  if (category) query.category = category;

  const total = await Offer.countDocuments(query);
  const offers = await Offer.find(query)
    .populate('seller', 'name businessName avatar')
    .populate('category', 'name slug')
    .sort({ expiresAt: 1 })       // soonest-expiring first
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean();

  res.json({ offers, total, page: Number(page), pages: Math.ceil(total / limit) });
});

const getSellerOffers = asyncHandler(async (req, res) => {
  const offers = await Offer.find({ seller: req.user._id })
    .populate('category', 'name')
    .sort({ createdAt: -1 });
  res.json(offers);
});

const updateOffer = asyncHandler(async (req, res) => {
  const offer = await Offer.findOne({ _id: req.params.id, seller: req.user._id });
  if (!offer) { res.status(404); throw new Error('Offer not found'); }
  Object.assign(offer, req.body);
  if (req.body.tags && !Array.isArray(req.body.tags)) {
    offer.tags = req.body.tags.split(',').map(t => t.trim());
  }
  await offer.save();
  res.json(offer);
});

const deleteOffer = asyncHandler(async (req, res) => {
  await Offer.findOneAndUpdate(
    { _id: req.params.id, seller: req.user._id },
    { isActive: false }
  );
  res.json({ message: 'Offer removed' });
});

module.exports = { createOffer, getActiveOffers, getSellerOffers, updateOffer, deleteOffer };
