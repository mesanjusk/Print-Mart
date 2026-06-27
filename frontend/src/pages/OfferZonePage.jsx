import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Tag, ArrowRight, Zap, Package } from 'lucide-react';
import { offerAPI, categoryAPI } from '../services/api';
import Spinner from '../components/common/Spinner';
import toast from 'react-hot-toast';
import { Badge } from '../components/ui/badge';
import { Avatar } from '../components/ui/avatar';
import { cn } from '../lib/utils';

function useCountdown(expiresAt) {
  const calc = () => {
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return null;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { h, m, s, totalMs: diff };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return time;
}

function CountdownBadge({ expiresAt }) {
  const time = useCountdown(expiresAt);
  if (!time) return <span className="text-xs text-red-500 font-semibold">Expired</span>;
  const urgent = time.totalMs < 3 * 3600000;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg',
      urgent
        ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 animate-pulse-soft'
        : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
    )}>
      <Clock className="h-3 w-3" />
      {time.h > 0 ? `${time.h}h ${time.m}m` : `${time.m}m ${time.s}s`}
    </span>
  );
}

function OfferCard({ offer }) {
  const discountPct = offer.originalPrice
    ? Math.round(((offer.originalPrice - offer.offerPrice) / offer.originalPrice) * 100)
    : 0;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-border bg-card overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col"
    >
      {offer.images?.[0] ? (
        <img src={offer.images[0]} alt={offer.title} className="w-full h-36 object-cover" />
      ) : (
        <div className="w-full h-36 bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-950/30 dark:to-amber-950/30 flex items-center justify-center">
          <Tag className="h-10 w-10 text-orange-300 dark:text-orange-700" />
        </div>
      )}

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-2">{offer.title}</h3>
          {discountPct > 0 && (
            <Badge variant="destructive" className="flex-shrink-0 bg-red-600 text-white text-2xs">
              -{discountPct}%
            </Badge>
          )}
        </div>

        {offer.description && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{offer.description}</p>
        )}

        <div className="flex flex-wrap gap-1 mb-3">
          {offer.printSpecs?.paperWeight && (
            <Badge variant="ghost" className="text-2xs">{offer.printSpecs.paperWeight}gsm</Badge>
          )}
          {offer.printSpecs?.finish && (
            <Badge variant="ghost" className="text-2xs capitalize">{offer.printSpecs.finish}</Badge>
          )}
          {offer.printSpecs?.quantity && (
            <Badge variant="ghost" className="text-2xs">{offer.printSpecs.quantity} pcs</Badge>
          )}
          {offer.printSpecs?.deliveryDays && (
            <Badge variant="info" className="text-2xs">{offer.printSpecs.deliveryDays}d delivery</Badge>
          )}
        </div>

        <div className="flex items-end justify-between mt-auto">
          <div>
            <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
              ₹{offer.offerPrice?.toLocaleString()}
            </p>
            {offer.originalPrice && (
              <p className="text-xs text-muted-foreground line-through">₹{offer.originalPrice.toLocaleString()}</p>
            )}
            <p className="text-xs text-muted-foreground">per {offer.unit || 'piece'}</p>
          </div>
          <div className="text-right">
            <CountdownBadge expiresAt={offer.expiresAt} />
            {offer.maxSlots && (
              <p className="text-xs text-muted-foreground mt-1">
                {Math.max(0, offer.maxSlots - (offer.claimedCount || 0))} slots left
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar name={offer.seller?.businessName || offer.seller?.name} size="xs" />
            <span className="text-xs text-muted-foreground truncate max-w-[90px]">
              {offer.seller?.businessName || offer.seller?.name}
            </span>
          </div>
          <Link
            to={`/products?keyword=${encodeURIComponent(offer.title)}`}
            state={{ offerId: offer._id }}
            className="flex-shrink-0 flex items-center gap-1 text-xs bg-primary-600 hover:bg-primary-700 text-white px-2.5 py-1.5 rounded-lg transition-colors"
          >
            Grab Offer <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export default function OfferZonePage() {
  const [offers, setOffers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useSearchParams();
  const [catFilter, setCatFilter] = useState(params.get('category') || '');

  const load = useCallback(() => {
    setLoading(true);
    const p = {};
    if (catFilter) p.category = catFilter;
    offerAPI.getAll(p)
      .then((r) => setOffers(Array.isArray(r.data?.offers) ? r.data.offers : []))
      .catch(() => toast.error('Failed to load offers'))
      .finally(() => setLoading(false));
  }, [catFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    categoryAPI.getAll().then((r) => setCategories(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const expiringSoon = offers.filter(o => o.expiresAt && new Date(o.expiresAt) - new Date() < 3 * 3600000);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-br from-orange-600 via-red-600 to-rose-700 text-white py-14 px-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 text-sm mb-4">
              <Zap className="h-3.5 w-3.5 text-yellow-300" />
              <span>Club Printing Deals</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Offer Zone</h1>
            <p className="text-orange-100 text-base max-w-lg mx-auto">
              Time-limited print deals from verified sellers. Fill the press, save big.
            </p>
            {expiringSoon.length > 0 && (
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium"
              >
                <span className="animate-pulse-soft">⚡</span>
                {expiringSoon.length} offer{expiringSoon.length !== 1 ? 's' : ''} expiring in &lt;3 hours!
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Category filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
          {[{ _id: '', name: 'All Offers' }, ...categories].map((c) => (
            <button
              key={c._id}
              onClick={() => setCatFilter(catFilter === c._id ? '' : c._id)}
              className={cn(
                'flex-shrink-0 text-sm px-4 py-2 rounded-full border font-medium transition-all duration-150',
                catFilter === c._id || (c._id === '' && !catFilter)
                  ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                  : 'border-border text-muted-foreground hover:border-primary-400 hover:text-foreground bg-card'
              )}
            >
              {c.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20"><Spinner size="lg" /></div>
        ) : offers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Package className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No active offers right now</h3>
            <p className="text-muted-foreground text-sm">Check back soon — sellers post new deals daily</p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            {offers.map((o) => (
              <motion.div key={o._id} variants={itemVariants}>
                <OfferCard offer={o} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
