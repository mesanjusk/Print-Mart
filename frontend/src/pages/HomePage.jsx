import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, ArrowRight, Truck, Shield, Award, Users, Clock,
  Zap, Star, CheckCircle2, ChevronRight, TrendingUp,
  Package, Printer, Layers, Gift, Tag, BookOpen
} from 'lucide-react';
import { categoryAPI, productAPI, offerAPI } from '../services/api';
import ProductCard from '../components/products/ProductCard';
import { SkeletonCard } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { cn, formatPrice } from '../lib/utils';

const CATEGORY_ICONS = {
  'Business Cards': Printer,
  'Flex & Banners': Layers,
  'Brochures & Flyers': BookOpen,
  'Stationery': Package,
  'Packaging': Package,
  'Corporate Gifts': Gift,
  'Promotional Items': Tag,
  'Large Format': Layers,
  'Labels & Stickers': Tag,
  'Books & Calendars': BookOpen,
};

const CATEGORY_COLORS = [
  'from-blue-500/10 to-blue-600/5 border-blue-200/60 dark:border-blue-800/40',
  'from-emerald-500/10 to-emerald-600/5 border-emerald-200/60 dark:border-emerald-800/40',
  'from-violet-500/10 to-violet-600/5 border-violet-200/60 dark:border-violet-800/40',
  'from-orange-500/10 to-orange-600/5 border-orange-200/60 dark:border-orange-800/40',
  'from-pink-500/10 to-pink-600/5 border-pink-200/60 dark:border-pink-800/40',
  'from-teal-500/10 to-teal-600/5 border-teal-200/60 dark:border-teal-800/40',
  'from-amber-500/10 to-amber-600/5 border-amber-200/60 dark:border-amber-800/40',
  'from-cyan-500/10 to-cyan-600/5 border-cyan-200/60 dark:border-cyan-800/40',
  'from-rose-500/10 to-rose-600/5 border-rose-200/60 dark:border-rose-800/40',
  'from-indigo-500/10 to-indigo-600/5 border-indigo-200/60 dark:border-indigo-800/40',
];

const ICON_COLORS = [
  'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30',
  'text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-900/30',
  'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
  'text-pink-600 bg-pink-100 dark:text-pink-400 dark:bg-pink-900/30',
  'text-teal-600 bg-teal-100 dark:text-teal-400 dark:bg-teal-900/30',
  'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30',
  'text-cyan-600 bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-900/30',
  'text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-900/30',
  'text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30',
];

const STATS = [
  { icon: Users, count: '50K+', label: 'Print Orders', color: 'text-blue-600' },
  { icon: Award, count: '5,000+', label: 'Products', color: 'text-violet-600' },
  { icon: Truck, count: 'Same Day', label: 'Dispatch', color: 'text-emerald-600' },
  { icon: Shield, count: 'Pan India', label: 'Delivery', color: 'text-orange-600' },
];

const FEATURES = [
  { icon: CheckCircle2, title: 'Verified Suppliers', desc: 'Every supplier is GST-verified and quality-checked.' },
  { icon: TrendingUp, title: 'Competitive Pricing', desc: 'Compare quotes from multiple suppliers instantly.' },
  { icon: Truck, title: 'Fast Delivery', desc: 'Same-day dispatch available for bulk orders.' },
  { icon: Shield, title: 'Secure Transactions', desc: 'Your payments and data are always protected.' },
];

const POPULAR_SEARCHES = ['Business Cards', 'Flex Banner', 'Visiting Cards', 'Corporate Gifts', 'Brochures'];

function OfferCard({ offer }) {
  const discountPct = offer.originalPrice
    ? Math.round(((offer.originalPrice - offer.offerPrice) / offer.originalPrice) * 100)
    : 0;
  const minsLeft = Math.max(0, Math.floor((new Date(offer.expiresAt) - new Date()) / 60000));
  const hoursLeft = Math.floor(minsLeft / 60);

  return (
    <Link to="/offers">
      <motion.div
        whileHover={{ y: -2 }}
        className="rounded-xl border border-border bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 p-4 hover:shadow-card-hover transition-all duration-200 border-l-4 border-l-orange-400"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-2">{offer.title}</h3>
          {discountPct > 0 && (
            <Badge variant="destructive" className="flex-shrink-0 bg-red-600 text-white">
              -{discountPct}%
            </Badge>
          )}
        </div>
        <p className="text-xl font-bold text-primary-600 dark:text-primary-400">
          ₹{offer.offerPrice?.toLocaleString()}
        </p>
        {offer.originalPrice && (
          <p className="text-xs text-muted-foreground line-through">₹{offer.originalPrice.toLocaleString()}</p>
        )}
        <p className="text-xs text-muted-foreground">per {offer.unit || 'piece'}</p>
        {offer.expiresAt && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 font-medium">
            <Clock className="h-3.5 w-3.5" />
            {hoursLeft > 0 ? `${hoursLeft}h ${minsLeft % 60}m left` : `${minsLeft}m left`}
          </div>
        )}
      </motion.div>
    </Link>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [hotOffers, setHotOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([categoryAPI.getAll(), productAPI.getFeatured()])
      .then(([catRes, prodRes]) => {
        setCategories(Array.isArray(catRes.data) ? catRes.data.slice(0, 10) : []);
        setFeatured(Array.isArray(prodRes.data) ? prodRes.data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    offerAPI.getAll({ limit: 4 })
      .then((r) => setHotOffers(Array.isArray(r.data?.offers) ? r.data.offers.slice(0, 4) : []))
      .catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/products?keyword=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <div className="min-h-screen">
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-emerald-600/8 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-0 w-64 h-64 bg-teal-600/8 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6"
            >
              <Zap className="h-3.5 w-3.5 text-yellow-400" />
              <span className="text-white/90">India&apos;s #1 B2B Print Marketplace</span>
              <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
            </motion.div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight mb-6">
              Print anything.{' '}
              <span className="bg-gradient-to-r from-primary-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Delivered fast.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Connect with 10,000+ verified printing suppliers across India.
              From business cards to large format banners — quality guaranteed.
            </p>

            {/* Search */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-6">
              <div className="flex items-center bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-white/10">
                <Search className="ml-4 h-5 w-5 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search business cards, banners, brochures…"
                  className="flex-1 px-4 py-4 bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 outline-none text-base"
                />
                <button
                  type="submit"
                  className="m-1.5 bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-700 hover:to-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-all duration-200 whitespace-nowrap text-sm"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Popular searches */}
            <div className="flex flex-wrap justify-center gap-2">
              <span className="text-gray-500 text-sm">Trending:</span>
              {POPULAR_SEARCHES.map((term) => (
                <Link
                  key={term}
                  to={`/products?keyword=${encodeURIComponent(term)}`}
                  className="text-sm text-gray-300 hover:text-primary-400 hover:underline transition-colors"
                >
                  {term}
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="flex flex-col sm:flex-row items-center sm:items-start gap-3 py-6 px-4 sm:px-8"
              >
                <div className={cn('p-2.5 rounded-xl bg-muted flex-shrink-0')}>
                  <stat.icon className={cn('h-5 w-5', stat.color)} />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xl font-bold text-foreground">{stat.count}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Categories ─── */}
      <section className="py-16 md:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-sm font-medium text-primary-600 dark:text-primary-400 mb-1">Explore</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Browse by Category</h2>
            </div>
            <Link
              to="/products"
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
            >
              View all
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-muted animate-pulse h-28" />
              ))}
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4"
            >
              {categories.map((cat, i) => {
                const CatIcon = CATEGORY_ICONS[cat.name] || Package;
                return (
                  <motion.div key={cat._id} variants={itemVariants}>
                    <Link
                      to={`/products?category=${cat._id}`}
                      className={cn(
                        'group flex flex-col items-center gap-3 p-4 rounded-xl border bg-gradient-to-br text-center transition-all duration-200 hover:shadow-card-hover hover:scale-[1.02]',
                        CATEGORY_COLORS[i % CATEGORY_COLORS.length]
                      )}
                    >
                      <div className={cn('p-3 rounded-xl transition-all duration-200 group-hover:scale-110', ICON_COLORS[i % ICON_COLORS.length])}>
                        <CatIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground leading-snug">{cat.name}</p>
                        {cat.productCount > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">{cat.productCount} products</p>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          <div className="mt-4 sm:hidden text-center">
            <Link to="/products" className="text-sm font-medium text-primary-600 hover:underline flex items-center justify-center gap-1">
              View all categories <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Hot Offers ─── */}
      {hotOffers.length > 0 && (
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-1 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" /> Limited Time
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Hot Offers</h2>
                <p className="text-sm text-muted-foreground mt-1">Time-limited deals from verified sellers</p>
              </div>
              <Link
                to="/offers"
                className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
              >
                View all <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {hotOffers.map((o) => <OfferCard key={o._id} offer={o} />)}
            </div>
          </div>
        </section>
      )}

      {/* ─── Featured Products ─── */}
      {(featured.length > 0 || loading) && (
        <section className="py-16 md:py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-sm font-medium text-primary-600 dark:text-primary-400 mb-1">Handpicked</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Featured Products</h2>
              </div>
              <Link
                to="/products?sort=popular"
                className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
              >
                See all <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
              >
                {featured.slice(0, 12).map((p) => (
                  <motion.div key={p._id} variants={itemVariants}>
                    <ProductCard product={p} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </section>
      )}

      {/* ─── Features / Why PrintMart ─── */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-primary-600 dark:text-primary-400 mb-2">Why choose us</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">The smarter way to print</h2>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
              PrintMart is built for businesses that demand quality, speed, and reliability from their print partners.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="rounded-xl border border-border bg-card p-6 hover:shadow-card-hover transition-all duration-200"
              >
                <div className="h-10 w-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="font-semibold text-foreground mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-16 md:py-20 bg-gradient-to-br from-primary-600 via-primary-700 to-emerald-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
              Ready to grow your print business?
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
              Join 10,000+ suppliers on PrintMart and reach buyers across India.
              Free to get started.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register?role=seller">
                <Button size="lg" className="bg-white text-primary-700 hover:bg-gray-50 shadow-elevated font-bold w-full sm:w-auto">
                  Start Selling Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/suppliers">
                <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 w-full sm:w-auto">
                  Browse Suppliers
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-white/50">No credit card required • Free forever plan available</p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
