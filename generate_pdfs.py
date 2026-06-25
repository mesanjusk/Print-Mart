from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT

W, H = A4
BRAND = colors.HexColor('#1A73E8')
DARK  = colors.HexColor('#1a1a2e')
GREEN = colors.HexColor('#2e7d32')
ORANGE= colors.HexColor('#e65100')
GRAY  = colors.HexColor('#757575')

def base_doc(filename):
    return SimpleDocTemplate(filename, pagesize=A4,
        leftMargin=1.5*cm, rightMargin=1.5*cm,
        topMargin=1.5*cm, bottomMargin=1.5*cm)

def styles():
    s = getSampleStyleSheet()
    s.add(ParagraphStyle('PM_Title', fontSize=20, textColor=BRAND, alignment=TA_CENTER, spaceAfter=4))
    s.add(ParagraphStyle('PM_Sub', fontSize=11, textColor=GRAY, alignment=TA_CENTER, spaceAfter=12))
    s.add(ParagraphStyle('PM_H1', fontSize=14, textColor=DARK, spaceBefore=10, spaceAfter=4, fontName='Helvetica-Bold'))
    s.add(ParagraphStyle('PM_H2', fontSize=11, textColor=BRAND, spaceBefore=6, spaceAfter=2, fontName='Helvetica-Bold'))
    s.add(ParagraphStyle('PM_Body', fontSize=9, textColor=colors.black, spaceAfter=3, leading=13))
    s.add(ParagraphStyle('PM_Code', fontSize=8.5, fontName='Courier', textColor=colors.HexColor('#333333'),
          backColor=colors.HexColor('#f5f5f5'), spaceAfter=2, leading=12, leftIndent=6))
    s.add(ParagraphStyle('PM_Small', fontSize=8, textColor=GRAY))
    return s

def tbl(data, col_widths, header_bg=BRAND):
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style = [
        ('BACKGROUND', (0,0), (-1,0), header_bg),
        ('TEXTCOLOR',  (0,0), (-1,0), colors.white),
        ('FONTNAME',   (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',   (0,0), (-1,-1), 8.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f0f4ff')]),
        ('GRID',       (0,0), (-1,-1), 0.4, colors.HexColor('#cccccc')),
        ('VALIGN',     (0,0), (-1,-1), 'TOP'),
        ('PADDING',    (0,0), (-1,-1), 4),
    ]
    t.setStyle(TableStyle(style))
    return t

# ═══════════════════════════════════════════════════════════════════════
# PDF 1 — Mock Data Reference
# ═══════════════════════════════════════════════════════════════════════
def pdf_mockdata():
    S = styles()
    doc = base_doc('/home/user/Print-Mart/PrintMart_MockData.pdf')
    story = []

    story.append(Paragraph('PrintMart – Mock Data Reference', S['PM_Title']))
    story.append(Paragraph('Team Testing Dataset · June 2026', S['PM_Sub']))
    story.append(HRFlowable(width='100%', thickness=1, color=BRAND))
    story.append(Spacer(1, 8))

    # ── USERS ─────────────────────────────────────────────────────────
    story.append(Paragraph('1. Team Users', S['PM_H1']))
    users_data = [
        ['Name', 'Role', 'Phone', 'Email', 'Password', 'Business'],
        ['Sanju', 'superadmin', '+919372333633', 'sanju@printmart.in', 'Sanju@123', 'PrintMart HQ'],
        ['Ashish', 'buyer', '+919373633633', 'ashish@printmart.in', 'Ashish@123', '—'],
        ['Khushi', 'seller (premium)', '+919579101534', 'khushi@printmart.in', 'Khushi@123', 'Khushi Print Works'],
        ['Priyanka', 'seller (premium)', '+917972116567', 'priyanka@printmart.in', 'Priyanka@123', 'Priyanka Digital Prints'],
    ]
    story.append(tbl(users_data, [2.4*cm, 2.8*cm, 3.4*cm, 4.2*cm, 2.4*cm, 4*cm]))
    story.append(Spacer(1, 4))
    story.append(Paragraph('All users: isVerified=true, morningDigestOptIn=true (Khushi & Priyanka), plan=premium (sellers)', S['PM_Small']))

    # ── CATEGORIES ────────────────────────────────────────────────────
    story.append(Spacer(1, 8))
    story.append(Paragraph('2. Categories (8 total)', S['PM_H1']))
    cats = [
        ['#', 'Name', 'Slug', 'Description'],
        ['1', 'Business Cards', 'business-cards', 'Standard and premium business cards'],
        ['2', 'Brochures & Leaflets', 'brochures-leaflets', 'Tri-fold, bi-fold, A4, A5 brochures'],
        ['3', 'Banners & Flex', 'banners-flex', 'Outdoor and indoor banners'],
        ['4', 'Stationery', 'stationery', 'Letterheads, envelopes, notepads'],
        ['5', 'Packaging', 'packaging', 'Boxes, bags, labels'],
        ['6', 'T-Shirts & Apparel', 't-shirts-apparel', 'Custom printed apparel'],
        ['7', 'Calendars', 'calendars', 'Wall and desk calendars'],
        ['8', 'Posters & Flyers', 'posters-flyers', 'A3/A4 posters and promotional flyers'],
    ]
    story.append(tbl(cats, [0.8*cm, 4.2*cm, 4*cm, 9.5*cm]))

    # ── PRODUCTS ──────────────────────────────────────────────────────
    story.append(Spacer(1, 8))
    story.append(Paragraph('3. Products (11 total)', S['PM_H1']))

    story.append(Paragraph('Khushi Print Works (6 products)', S['PM_H2']))
    k_prods = [
        ['Product', 'Category', 'Price Range', 'MOQ', 'Delivery'],
        ['Premium Business Cards 350gsm', 'Business Cards', '₹499–₹1,499 / 100 pcs', '100 pcs', '3 days'],
        ['A5 Glossy Brochure Printing', 'Brochures & Leaflets', '₹1,200–₹4,500 / 500 pcs', '500 pcs', '5 days'],
        ['6x4 ft Flex Banner', 'Banners & Flex', '₹350–₹800 / banner', '1 banner', '2 days'],
        ['A4 Letterhead Design & Print', 'Stationery', '₹800–₹2,500 / 500 pcs', '500 pcs', '4 days'],
        ['Custom Packaging Boxes', 'Packaging', '₹15–₹85 / box', '100 boxes', '—'],
        ['Wall Calendar 12-Month', 'Calendars', '₹120–₹350 / calendar', '50 pcs', '7 days'],
    ]
    story.append(tbl(k_prods, [5.5*cm, 3.8*cm, 4.2*cm, 2.2*cm, 2.5*cm]))

    story.append(Spacer(1, 4))
    story.append(Paragraph('Priyanka Digital Prints (5 products)', S['PM_H2']))
    p_prods = [
        ['Product', 'Category', 'Price Range', 'MOQ', 'Delivery'],
        ['UV Glossy Business Cards 300gsm', 'Business Cards', '₹699–₹1,999 / 100 pcs', '100 pcs', '4 days'],
        ['Round-Neck Custom T-Shirt', 'T-Shirts & Apparel', '₹299–₹599 / t-shirt', '10 pcs', '5 days'],
        ['A3 Poster / Flyer Printing', 'Posters & Flyers', '₹600–₹2,200 / 100 pcs', '100 pcs', '3 days'],
        ['2x8 ft Rollup Standee', 'Banners & Flex', '₹950–₹1,800 / standee', '1 standee', '3 days'],
        ['Product Label Stickers', 'Packaging', '₹300–₹1,200 / 500 pcs', '500 pcs', '—'],
    ]
    story.append(tbl(p_prods, [5.5*cm, 3.8*cm, 4.2*cm, 2.2*cm, 2.5*cm]))

    # ── INQUIRIES ─────────────────────────────────────────────────────
    story.append(Spacer(1, 8))
    story.append(Paragraph('4. Inquiries (4 total)', S['PM_H1']))
    inqs = [
        ['#', 'Buyer', 'Seller', 'Product', 'Qty', 'Status'],
        ['1', 'Ashish', 'Khushi', 'Premium Business Cards 350gsm', '500 pcs', 'responded'],
        ['2', 'Ashish', 'Priyanka', 'UV Glossy Business Cards 300gsm', '250 pcs', 'responded'],
        ['3', 'Ashish', 'Priyanka', 'Round-Neck Custom T-Shirt', '20 pcs', 'pending'],
        ['4', 'Ashish', 'Khushi', '6x4 ft Flex Banner', '2 banners', 'pending'],
    ]
    story.append(tbl(inqs, [0.8*cm, 2.4*cm, 2.8*cm, 6.5*cm, 2.2*cm, 3.5*cm]))

    story.append(Spacer(1, 4))
    story.append(Paragraph('Inquiry #1 replies: Khushi → "₹1,800 for 500 cards, 3-day delivery."  Ashish → "Yes, send quotation."', S['PM_Body']))
    story.append(Paragraph('Inquiry #2 replies: Priyanka → "250 spot UV = ₹1,499, 4-day delivery."', S['PM_Body']))

    # ── QUOTATIONS ────────────────────────────────────────────────────
    story.append(Spacer(1, 8))
    story.append(Paragraph('5. Quotations (2 total)', S['PM_H1']))
    quots = [
        ['#', 'Seller', 'Buyer', 'Product', 'Subtotal', 'GST 18%', 'Total', 'Status'],
        ['Q1', 'Khushi', 'Ashish', 'Premium Business Cards – 500 pcs', '₹1,800', '₹324', '₹2,124', 'sent'],
        ['Q2', 'Priyanka', 'Ashish', 'UV Glossy Business Cards – 250 pcs', '₹1,400', '₹252', '₹1,652', 'accepted'],
    ]
    story.append(tbl(quots, [0.8*cm, 2.4*cm, 2.4*cm, 5.8*cm, 2*cm, 2*cm, 1.8*cm, 2*cm]))
    story.append(Spacer(1, 2))
    story.append(Paragraph('Both quotations: whatsappSent=true, validUntil=30 days from seed date.', S['PM_Small']))

    # ── ORDERS ────────────────────────────────────────────────────────
    story.append(Spacer(1, 8))
    story.append(Paragraph('6. Orders (3 total)', S['PM_H1']))
    ords = [
        ['Order', 'Buyer↔Seller', 'Items', 'Total', 'Status', 'Payment', 'Tracking'],
        ['ORD-001', 'Ashish ← Priyanka', 'UV Business Cards 250 pcs', '₹1,652', 'pending_payment', 'pending', '—'],
        ['ORD-002', 'Ashish ← Khushi', 'A5 Glossy Brochure 1000 pcs', '₹3,776', 'paid', 'paid', '—'],
        ['ORD-003', 'Ashish ← Priyanka', 'A3 Poster 200 pcs', '₹1,888', 'dispatched', 'paid', 'DTDC-TRK-2026-77421'],
    ]
    story.append(tbl(ords, [1.8*cm, 3.6*cm, 4.5*cm, 1.8*cm, 3*cm, 2*cm, 3.5*cm]))
    story.append(Spacer(1, 2))
    story.append(Paragraph('ORD-002: paymentConfirmedAt = yesterday. ORD-003: dispatchedAt = 12h ago. createdViaWhatsapp=true on all.', S['PM_Small']))

    # ── HOW TO RUN SEED ───────────────────────────────────────────────
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width='100%', thickness=0.5, color=GRAY))
    story.append(Spacer(1, 4))
    story.append(Paragraph('How to Run the Seed Script', S['PM_H1']))
    story.append(Paragraph('Run this command from the project root (ensure MONGO_URI is set in backend/.env):', S['PM_Body']))
    story.append(Paragraph('node backend/src/scripts/seedMockData.js', S['PM_Code']))
    story.append(Paragraph('⚠ WARNING: The script deletes ALL existing users, products, categories, inquiries, quotations and orders before inserting mock data. Run only on a test/staging database.', S['PM_Body']))

    doc.build(story)
    print('✅ PrintMart_MockData.pdf generated')

# ═══════════════════════════════════════════════════════════════════════
# PDF 2 — WhatsApp Command Drill Guide
# ═══════════════════════════════════════════════════════════════════════
def cmd_row(cmd, desc, response, c=colors.white):
    return [cmd, desc, response]

def pdf_commands():
    S = styles()
    doc = base_doc('/home/user/Print-Mart/PrintMart_WhatsApp_Commands.pdf')
    story = []

    story.append(Paragraph('PrintMart – WhatsApp Command Drill Guide', S['PM_Title']))
    story.append(Paragraph('Team Test Reference · All Numbers Opted-In · June 2026', S['PM_Sub']))
    story.append(HRFlowable(width='100%', thickness=1, color=BRAND))
    story.append(Spacer(1, 6))

    story.append(Paragraph(
        'Send these commands to the WhatsApp Business number. Bot responds based on your role. '
        'Numbers used: Ashish (+919373633633 buyer), Khushi (+919579101534 seller), '
        'Priyanka (+917972116567 seller), Sanju (+919372333633 superadmin).',
        S['PM_Body']))
    story.append(Spacer(1, 6))

    # ── GENERAL / COMMON ──────────────────────────────────────────────
    story.append(Paragraph('1. General Commands (Any Role)', S['PM_H1']))
    gen = [
        ['Command', 'Description', 'Bot Response'],
        ['hi / hello / hey', 'Start / main menu', 'Personalised greeting + role-specific menu'],
        ['help', 'Show help menu', 'Full command list for your role'],
        ['menu', 'Show main menu', 'Role-specific menu options'],
        ['status', 'Account status', 'Name, role, plan, last activity'],
        ['register', 'Start registration (new users)', 'welcome_print template + Buyer / Seller buttons'],
        ['STOP / optout', 'Opt out of messages', 'Opt-out confirmation; no further messages sent'],
    ]
    story.append(tbl(gen, [4*cm, 4.5*cm, 10.5*cm]))

    # ── BUYER COMMANDS ────────────────────────────────────────────────
    story.append(Spacer(1, 8))
    story.append(Paragraph('2. Buyer Commands  (Ashish – +919373633633)', S['PM_H1']))
    story.append(Paragraph('Login: ashish@printmart.in / Ashish@123  |  Role: buyer', S['PM_Small']))
    story.append(Spacer(1, 4))

    buyer = [
        ['Command / Reply', 'What It Does', 'Bot Response'],
        ['hi', 'Buyer menu', '👋 Hi Ashish! Choose: 1 Browse Products  2 My Inquiries  3 My Orders  4 Track Order'],
        ['1  or  browse', 'Browse products', 'Lists categories. Reply with category number to see products'],
        ['2  or  inquiries', 'My inquiries', 'Lists open inquiries with status (pending/responded/quoted)'],
        ['3  or  orders', 'My orders', 'Lists all orders with status and total'],
        ['4  or  track', 'Track an order', 'Prompts for order number → shows tracking info'],
        ['[order number]', 'Track specific order', 'Status, items, payment, tracking code if dispatched'],
        ['quote [number]', 'View quotation details', 'Full quotation: items, subtotal, GST, total, validity'],
        ['accept [number]', 'Accept a quotation', 'Marks quotation accepted → creates order → payment link'],
        ['reject [number]', 'Reject a quotation', 'Marks quotation rejected; notifies seller'],
        ['search [keyword]', 'Search products', 'Lists matching products with price range'],
        ['product [number]', 'View product details', 'Full details: specs, price, MOQ, seller info'],
        ['inquire [number]', 'Send inquiry on product', 'Opens inquiry flow: confirm qty → message → sent'],
    ]
    story.append(tbl(buyer, [4.5*cm, 4*cm, 10.5*cm]))

    # ── SELLER COMMANDS ───────────────────────────────────────────────
    story.append(Spacer(1, 8))
    story.append(Paragraph('3. Seller Commands  (Khushi – +919579101534  |  Priyanka – +917972116567)', S['PM_H1']))
    story.append(Paragraph('Khushi login: khushi@printmart.in / Khushi@123   |   Priyanka login: priyanka@printmart.in / Priyanka@123  |  Both: role=seller, plan=premium', S['PM_Small']))
    story.append(Spacer(1, 4))

    seller = [
        ['Command / Reply', 'What It Does', 'Bot Response'],
        ['hi', 'Seller menu', '👋 Hi [Name]! Choose: 1 New Inquiries  2 My Quotations  3 My Orders  4 Digest'],
        ['1  or  inquiries', 'New / open inquiries', 'Lists pending inquiries with buyer name, product, qty'],
        ['2  or  quotations', 'My quotations', 'Lists sent quotations with status (sent / accepted / rejected)'],
        ['3  or  orders', 'My orders', 'Lists orders: status, payment, dispatch info'],
        ['4  or  digest', 'Morning digest (manual)', 'Sends daily summary: inquiries, orders, revenue today'],
        ['respond [number]', 'Reply to an inquiry', 'Starts reply flow → your message sent to buyer'],
        ['quote [number]', 'Create quotation for inquiry', 'Guided flow: items, price, GST → generates PDF quotation'],
        ['dispatch [number]', 'Mark order dispatched', 'Prompts tracking number → updates order → notifies buyer'],
        ['products', 'List my products', 'All your listed products with status and inquiry count'],
        ['leads', 'Premium: new buyer leads', 'Latest buyer inquiries broadcast (premium sellers only)'],
        ['broadcast [msg]', 'Send message to buyers', 'Sends to opted-in buyers (admin / premium feature)'],
    ]
    story.append(tbl(seller, [4.5*cm, 4*cm, 10.5*cm]))

    # ── REGISTRATION FLOW ─────────────────────────────────────────────
    story.append(Spacer(1, 8))
    story.append(Paragraph('4. New User Registration Flow (any unregistered number)', S['PM_H1']))
    reg_flow = [
        ['Step', 'Action', 'Bot Message'],
        ['1', 'Send "register" or "hi"', 'Sends welcome_print Meta template + interactive buttons: [Buyer] [Seller]'],
        ['2', 'Tap Buyer or Seller button (or type 1/BUYER or 2/SELLER)', '"Great! You chose Buyer/Seller. Please enter your full name:"'],
        ['3', 'Type your name (e.g. "Ashish Kumar")', '"✅ Account Created! Name: Ashish Kumar  |  Mobile: +91XXXXXXXXXX  |  Temp password: XXXXXX  |  Login: https://shop.instify.in"'],
        ['4', 'Login at shop.instify.in', 'Use phone number + temp password to log in and set a new password'],
    ]
    story.append(tbl(reg_flow, [1.2*cm, 6.5*cm, 11.5*cm]))

    # ── SUPERADMIN COMMANDS ───────────────────────────────────────────
    story.append(Spacer(1, 8))
    story.append(Paragraph('5. Superadmin Commands  (Sanju – +919372333633)', S['PM_H1']))
    story.append(Paragraph('Sanju login: sanju@printmart.in / Sanju@123  |  Role: superadmin', S['PM_Small']))
    story.append(Spacer(1, 4))

    admin = [
        ['Command', 'What It Does', 'Bot Response'],
        ['hi', 'Admin menu', '👋 Hi Sanju! Admin panel: 1 Stats  2 Users  3 Broadcast  4 Pending Orders'],
        ['stats', 'Platform statistics', 'Total users, products, inquiries, orders, revenue'],
        ['users', 'User list', 'Recent signups with role and phone'],
        ['broadcast [msg]', 'Broadcast to all opted-in buyers', 'Sends WhatsApp message to all opted-in buyers'],
        ['pending orders', 'Pending payment orders', 'Lists orders awaiting payment'],
        ['seller leads', 'Broadcast leads to premium sellers', 'Sends latest buyer inquiries to premium sellers'],
    ]
    story.append(tbl(admin, [4*cm, 4.5*cm, 10.5*cm]))

    # ── TEST DRILL CHECKLIST ──────────────────────────────────────────
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width='100%', thickness=0.5, color=GRAY))
    story.append(Spacer(1, 4))
    story.append(Paragraph('6. Team Drill Checklist', S['PM_H1']))
    checklist = [
        ('Ashish (buyer)',  [
            '[ ] Send "hi" → verify buyer menu appears',
            '[ ] Send "browse" → pick a category → view product',
            '[ ] Send "inquiries" → see 4 inquiries (2 responded, 2 pending)',
            '[ ] Send "orders" → see 3 orders (pending_payment, paid, dispatched)',
            '[ ] Send "track" → enter ORD-003 number → get DTDC-TRK-2026-77421',
            '[ ] Send "quote 1" → view Q1 from Khushi (₹2,124)',
            '[ ] Send "accept 1" → accept Q1 → verify order created',
        ]),
        ('Khushi (seller)', [
            '[ ] Send "hi" → verify seller menu appears',
            '[ ] Send "inquiries" → see 2 inquiries (1 responded, 1 pending)',
            '[ ] Send "quotations" → see Q1 (sent, ₹2,124)',
            '[ ] Send "orders" → see ORD-002 (paid, ₹3,776)',
            '[ ] Send "products" → see 6 products listed',
            '[ ] Send "digest" → get morning summary',
        ]),
        ('Priyanka (seller)', [
            '[ ] Send "hi" → verify seller menu',
            '[ ] Send "inquiries" → see 2 inquiries (1 responded, 1 pending)',
            '[ ] Send "quotations" → see Q2 (accepted, ₹1,652)',
            '[ ] Send "orders" → see ORD-001 (pending_payment) and ORD-003 (dispatched)',
            '[ ] Send "dispatch [ORD-001 number]" → enter tracking → verify buyer notified',
            '[ ] Send "leads" → verify premium lead broadcast received',
        ]),
        ('Sanju (superadmin)', [
            '[ ] Send "hi" → verify admin menu',
            '[ ] Send "stats" → see platform totals',
            '[ ] Send "broadcast Hello team!" → verify opted-in buyers receive it',
        ]),
    ]
    for role, items in checklist:
        story.append(Paragraph(role, S['PM_H2']))
        for item in items:
            story.append(Paragraph(item, S['PM_Body']))
        story.append(Spacer(1, 4))

    # ── QUICK REFERENCE ───────────────────────────────────────────────
    story.append(HRFlowable(width='100%', thickness=0.5, color=GRAY))
    story.append(Spacer(1, 4))
    story.append(Paragraph('Quick Reference: Test Data IDs', S['PM_H1']))
    story.append(Paragraph('After seeding, the bot will show real order numbers. Use those for track/dispatch commands.', S['PM_Body']))
    ref = [
        ['Item', 'Value'],
        ['Buyer number', 'Ashish: +919373633633'],
        ['Seller numbers', 'Khushi: +919579101534  |  Priyanka: +917972116567'],
        ['Admin number', 'Sanju: +919372333633'],
        ['Active quotation', 'Q2 (Priyanka → Ashish) – status: accepted → ORD-001'],
        ['Dispatched order tracking', 'DTDC-TRK-2026-77421  (ORD-003, A3 Posters)'],
        ['WhatsApp Business number', 'Set in WHATSAPP_PHONE_NUMBER_ID env var on Render'],
        ['Login URL', 'https://shop.instify.in'],
        ['Seed script path', 'backend/src/scripts/seedMockData.js'],
    ]
    story.append(tbl(ref, [5*cm, 14.2*cm]))

    doc.build(story)
    print('✅ PrintMart_WhatsApp_Commands.pdf generated')

pdf_mockdata()
pdf_commands()
