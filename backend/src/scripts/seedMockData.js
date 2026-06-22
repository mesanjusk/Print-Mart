/**
 * PrintMart Mock Data Seed Script
 * Run: node backend/src/scripts/seedMockData.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const User      = require('../models/User');
const Category  = require('../models/Category');
const Product   = require('../models/Product');
const Inquiry   = require('../models/Inquiry');
const Quotation = require('../models/Quotation');
const Order     = require('../models/Order');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('MONGO_URI not set in .env'); process.exit(1); }

async function hash(pw) { return bcrypt.hash(pw, 10); }

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // ── 0. Clear existing data ──────────────────────────────────────────────────
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Inquiry.deleteMany({}),
    Quotation.deleteMany({}),
    Order.deleteMany({}),
  ]);
  console.log('Cleared existing data');

  // ── 1. Users ─────────────────────────────────────────────────────────────────
  const users = await User.insertMany([
    {
      name: 'Sanju',
      email: 'sanju@printmart.in',
      password: await hash('Sanju@123'),
      phone: '+919372333633',
      role: 'superadmin',
      isVerified: true,
      businessName: 'PrintMart HQ',
    },
    {
      name: 'Ashish',
      email: 'ashish@printmart.in',
      password: await hash('Ashish@123'),
      phone: '+919373633633',
      role: 'buyer',
      isVerified: true,
    },
    {
      name: 'Khushi',
      email: 'khushi@printmart.in',
      password: await hash('Khushi@123'),
      phone: '+919579101534',
      role: 'seller',
      isVerified: true,
      businessName: 'Khushi Print Works',
      plan: 'premium',
      morningDigestOptIn: true,
    },
    {
      name: 'Priyanka',
      email: 'priyanka@printmart.in',
      password: await hash('Priyanka@123'),
      phone: '+917972116567',
      role: 'seller',
      isVerified: true,
      businessName: 'Priyanka Digital Prints',
      plan: 'premium',
      morningDigestOptIn: true,
    },
  ]);

  const [sanju, ashish, khushi, priyanka] = users;
  console.log('Users created:', users.map(u => `${u.name}(${u.role})`).join(', '));

  // ── 2. Categories ─────────────────────────────────────────────────────────────
  const cats = await Category.insertMany([
    { name: 'Business Cards',      slug: 'business-cards',      description: 'Standard and premium business cards', order: 1 },
    { name: 'Brochures & Leaflets',slug: 'brochures-leaflets',   description: 'Tri-fold, bi-fold, A4, A5 brochures',  order: 2 },
    { name: 'Banners & Flex',      slug: 'banners-flex',         description: 'Outdoor and indoor banners',           order: 3 },
    { name: 'Stationery',          slug: 'stationery',           description: 'Letterheads, envelopes, notepads',     order: 4 },
    { name: 'Packaging',           slug: 'packaging',            description: 'Boxes, bags, labels',                  order: 5 },
    { name: 'T-Shirts & Apparel',  slug: 't-shirts-apparel',     description: 'Custom printed apparel',               order: 6 },
    { name: 'Calendars',           slug: 'calendars',            description: 'Wall and desk calendars',              order: 7 },
    { name: 'Posters & Flyers',    slug: 'posters-flyers',       description: 'A3/A4 posters and promotional flyers', order: 8 },
  ]);
  const catMap = Object.fromEntries(cats.map(c => [c.slug, c]));
  console.log('Categories created:', cats.length);

  // ── 3. Products (Khushi – 6, Priyanka – 5) ──────────────────────────────────
  const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
  const prodData = [
    // Khushi products
    {
      name: 'Premium Business Cards 350gsm', seller: khushi._id,
      category: catMap['business-cards']._id,
      description: 'Full colour double-sided business cards on 350gsm matt laminated card. Perfect for professionals.',
      price: { min: 499, max: 1499, unit: 'per 100 pcs' }, minOrderQty: 100,
      tags: ['business card','visiting card','350gsm','matt'],
      printSpecs: { paperWeight: 350, size: 'standard', finish: 'matte', quantity: 100, sides: 'double', deliveryDays: 3 },
      featured: true,
    },
    {
      name: 'A5 Glossy Brochure Printing', seller: khushi._id,
      category: catMap['brochures-leaflets']._id,
      description: 'A5 full colour brochures on 130gsm glossy paper. Ideal for promotions and product catalogues.',
      price: { min: 1200, max: 4500, unit: 'per 500 pcs' }, minOrderQty: 500,
      tags: ['brochure','leaflet','A5','glossy'],
      printSpecs: { paperWeight: 130, size: 'A5', finish: 'glossy', quantity: 500, sides: 'double', deliveryDays: 5 },
      featured: true,
    },
    {
      name: '6x4 ft Flex Banner', seller: khushi._id,
      category: catMap['banners-flex']._id,
      description: '6x4 ft full colour flex banner with grommets for outdoor display.',
      price: { min: 350, max: 800, unit: 'per banner' }, minOrderQty: 1,
      tags: ['banner','flex','outdoor','6x4'],
      printSpecs: { size: '6x4ft', finish: 'other', quantity: 1, sides: 'single', deliveryDays: 2, material: 'flex' },
    },
    {
      name: 'A4 Letterhead Design & Print', seller: khushi._id,
      category: catMap['stationery']._id,
      description: 'Custom A4 letterheads on 90gsm bond paper. Professional corporate look.',
      price: { min: 800, max: 2500, unit: 'per 500 pcs' }, minOrderQty: 500,
      tags: ['letterhead','stationery','A4'],
      printSpecs: { paperWeight: 90, size: 'A4', finish: 'uncoated', quantity: 500, sides: 'single', deliveryDays: 4 },
    },
    {
      name: 'Custom Packaging Boxes', seller: khushi._id,
      category: catMap['packaging']._id,
      description: 'Custom printed corrugated or rigid gift boxes. Any size, full CMYK print.',
      price: { min: 15, max: 85, unit: 'per box' }, minOrderQty: 100,
      tags: ['packaging','box','gift box','custom'],
    },
    {
      name: 'Wall Calendar 12-Month', seller: khushi._id,
      category: catMap['calendars']._id,
      description: '12-month wall calendar with custom photos. A3 size, spiral bound.',
      price: { min: 120, max: 350, unit: 'per calendar' }, minOrderQty: 50,
      tags: ['calendar','wall calendar','A3','2026'],
      printSpecs: { size: 'A3', finish: 'glossy', quantity: 50, sides: 'single', deliveryDays: 7 },
    },
    // Priyanka products
    {
      name: 'UV Glossy Business Cards 300gsm', seller: priyanka._id,
      category: catMap['business-cards']._id,
      description: 'Spot UV coated premium business cards on 300gsm card. Luxury finish for high-impact impressions.',
      price: { min: 699, max: 1999, unit: 'per 100 pcs' }, minOrderQty: 100,
      tags: ['business card','UV','300gsm','spot UV'],
      printSpecs: { paperWeight: 300, size: 'standard', finish: 'uv', quantity: 100, sides: 'double', deliveryDays: 4 },
      featured: true,
    },
    {
      name: 'Round-Neck Custom T-Shirt', seller: priyanka._id,
      category: catMap['t-shirts-apparel']._id,
      description: 'Full colour DTF printed round-neck T-shirts. Available S to 3XL. Min 10 pcs per design.',
      price: { min: 299, max: 599, unit: 'per t-shirt' }, minOrderQty: 10,
      tags: ['t-shirt','custom print','DTF','apparel'],
      printSpecs: { finish: 'other', quantity: 10, sides: 'single', deliveryDays: 5 },
      featured: true,
    },
    {
      name: 'A3 Poster / Flyer Printing', seller: priyanka._id,
      category: catMap['posters-flyers']._id,
      description: 'Full colour A3 posters and flyers on 130gsm glossy paper. Perfect for events and promotions.',
      price: { min: 600, max: 2200, unit: 'per 100 pcs' }, minOrderQty: 100,
      tags: ['poster','flyer','A3','event'],
      printSpecs: { paperWeight: 130, size: 'A3', finish: 'glossy', quantity: 100, sides: 'single', deliveryDays: 3 },
    },
    {
      name: '2x8 ft Rollup Standee', seller: priyanka._id,
      category: catMap['banners-flex']._id,
      description: 'Rollup standee 2x8 ft with aluminium base and carry bag. High-res print.',
      price: { min: 950, max: 1800, unit: 'per standee' }, minOrderQty: 1,
      tags: ['standee','rollup','2x8','exhibition'],
      printSpecs: { size: '2x8ft', finish: 'other', quantity: 1, sides: 'single', deliveryDays: 3, material: 'vinyl' },
    },
    {
      name: 'Product Label Stickers', seller: priyanka._id,
      category: catMap['packaging']._id,
      description: 'Custom printed product labels on vinyl or paper. Waterproof options available.',
      price: { min: 300, max: 1200, unit: 'per 500 pcs' }, minOrderQty: 500,
      tags: ['label','sticker','product label','vinyl'],
    },
  ];

  const prods = [];
  for (const p of prodData) {
    const doc = new Product({ ...p, slug: slugify(p.name) });
    await doc.save();
    prods.push(doc);
  }
  console.log('Products created:', prods.length);

  // ── 4. Inquiries (Ashish → both sellers) ─────────────────────────────────────
  const inquiries = await Inquiry.insertMany([
    {
      product: prods[0]._id,   // Premium Business Cards (Khushi)
      buyer: ashish._id, seller: khushi._id,
      message: 'Need 500 business cards for my team. 350gsm matt finish. Can you share your best price?',
      quantity: 500, unit: 'pieces', status: 'responded',
      replies: [
        { sender: khushi._id,  message: 'Hi Ashish! For 500 cards on 350gsm matt, price is ₹1,800 with 3-day delivery. Shall I send a formal quotation?', createdAt: new Date(Date.now() - 3600000*2) },
        { sender: ashish._id,  message: 'Yes please, go ahead with the quotation.', createdAt: new Date(Date.now() - 3600000) },
      ],
    },
    {
      product: prods[6]._id,   // UV Business Cards (Priyanka)
      buyer: ashish._id, seller: priyanka._id,
      message: 'Looking for spot UV business cards for our startup. 300gsm. Quantity 250 pcs.',
      quantity: 250, unit: 'pieces', status: 'responded',
      replies: [
        { sender: priyanka._id, message: 'Hello Ashish! 250 spot UV cards on 300gsm = ₹1,499. Delivery in 4 days. Interested?', createdAt: new Date(Date.now() - 7200000) },
      ],
    },
    {
      product: prods[7]._id,   // T-Shirts (Priyanka)
      buyer: ashish._id, seller: priyanka._id,
      message: 'I need 20 custom T-shirts for our company event. Full front logo print. Mix of M, L, XL.',
      quantity: 20, unit: 'pieces', status: 'pending',
    },
    {
      product: prods[2]._id,   // Flex Banner (Khushi)
      buyer: ashish._id, seller: khushi._id,
      message: 'Need a 6x4 ft banner for our shop opening next week. Can you deliver in 2 days?',
      quantity: 2, unit: 'pieces', status: 'pending',
    },
  ]);
  console.log('Inquiries created:', inquiries.length);

  // ── 5. Quotations ─────────────────────────────────────────────────────────────
  const validDate = new Date(); validDate.setDate(validDate.getDate() + 30);

  const quot1 = await Quotation.create({
    inquiry: inquiries[0]._id, seller: khushi._id, buyer: ashish._id, product: prods[0]._id,
    items: [{ description: 'Premium Business Cards 350gsm Matt – 500 pcs', quantity: 500, unit: 'pcs', unitPrice: 3.6, total: 1800 }],
    subtotal: 1800, tax: 18, taxAmount: 324, total: 2124,
    status: 'sent', notes: 'Price includes design & delivery. Valid 30 days.', whatsappSent: true,
    validUntil: validDate,
  });

  const quot2 = await Quotation.create({
    inquiry: inquiries[1]._id, seller: priyanka._id, buyer: ashish._id, product: prods[6]._id,
    items: [{ description: 'UV Glossy Business Cards 300gsm – 250 pcs', quantity: 250, unit: 'pcs', unitPrice: 5.6, total: 1400 }],
    subtotal: 1400, tax: 18, taxAmount: 252, total: 1652,
    status: 'accepted', notes: 'Spot UV both sides. Price includes shipping.', whatsappSent: true,
    validUntil: validDate,
  });
  console.log('Quotations created: 2');

  // ── 6. Orders ─────────────────────────────────────────────────────────────────
  // Order 1: accepted quotation → pending payment
  const order1 = new Order({
    quotation: quot2._id, inquiry: inquiries[1]._id,
    buyer: ashish._id, seller: priyanka._id, product: prods[6]._id,
    items: [{ description: 'UV Glossy Business Cards 300gsm – 250 pcs', quantity: 250, unit: 'pcs', unitPrice: 5.6, total: 1400 }],
    subtotal: 1400, tax: 18, taxAmount: 252, total: 1652,
    status: 'pending_payment', paymentStatus: 'pending', createdViaWhatsapp: true,
  });
  await order1.save();

  // Order 2: paid → processing
  const order2 = new Order({
    buyer: ashish._id, seller: khushi._id, product: prods[1]._id,
    items: [{ description: 'A5 Glossy Brochure – 1000 pcs', quantity: 1000, unit: 'pcs', unitPrice: 3.2, total: 3200 }],
    subtotal: 3200, tax: 18, taxAmount: 576, total: 3776,
    status: 'paid', paymentStatus: 'paid', paymentConfirmedAt: new Date(Date.now() - 86400000),
    createdViaWhatsapp: true,
  });
  await order2.save();

  // Order 3: dispatched
  const order3 = new Order({
    buyer: ashish._id, seller: priyanka._id, product: prods[8]._id,
    items: [{ description: 'A3 Poster Printing – 200 pcs', quantity: 200, unit: 'pcs', unitPrice: 8, total: 1600 }],
    subtotal: 1600, tax: 18, taxAmount: 288, total: 1888,
    status: 'dispatched', paymentStatus: 'paid', paymentConfirmedAt: new Date(Date.now() - 172800000),
    dispatchedAt: new Date(Date.now() - 43200000), trackingInfo: 'DTDC-TRK-2026-77421',
    createdViaWhatsapp: true,
  });
  await order3.save();

  console.log('Orders created: 3 —', [order1, order2, order3].map(o => o.orderNumber).join(', '));

  // ── 7. Summary ────────────────────────────────────────────────────────────────
  console.log('\n✅ MOCK DATA SEEDED SUCCESSFULLY\n');
  console.log('─────────────────────────────────────────────────────────');
  console.log('USERS');
  console.log(`  Sanju (superadmin)  +919372333633  pw: Sanju@123`);
  console.log(`  Ashish (buyer)      +919373633633  pw: Ashish@123`);
  console.log(`  Khushi (seller)     +919579101534  pw: Khushi@123`);
  console.log(`  Priyanka (seller)   +917972116567  pw: Priyanka@123`);
  console.log('PRODUCTS     :', prods.length, '(6 Khushi, 5 Priyanka)');
  console.log('CATEGORIES   :', cats.length);
  console.log('INQUIRIES    :', inquiries.length, '(2 responded, 2 pending)');
  console.log('QUOTATIONS   : 2 (1 sent, 1 accepted)');
  console.log('ORDERS       : 3 (pending_payment, paid, dispatched)');
  console.log(`  ${order1.orderNumber}  pending_payment  ₹1,652  Ashish←Priyanka`);
  console.log(`  ${order2.orderNumber}  paid             ₹3,776  Ashish←Khushi`);
  console.log(`  ${order3.orderNumber}  dispatched       ₹1,888  Ashish←Priyanka  TRK: DTDC-TRK-2026-77421`);
  console.log('─────────────────────────────────────────────────────────');

  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
