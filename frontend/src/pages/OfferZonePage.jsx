import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiClock, FiTag, FiArrowRight, FiFilter } from 'react-icons/fi';
import { offerAPI, categoryAPI } from '../services/api';
import Spinner from '../components/common/Spinner';
import toast from 'react-hot-toast';

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
  if (!time) return <span className="text-xs text-red-500 font-medium">Expired</span>;
  const urgent = time.totalMs < 3 * 3600000; // < 3 hours
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${urgent ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-orange-100 text-orange-600'}`}>
      <FiClock size={11} />
      {time.h > 0 ? `${time.h}h ${time.m}m` : `${time.m}m ${time.s}s`}
    </span>
  );
}

function OfferCard({ offer }) {
  const discountPct = offer.originalPrice
    ? Math.round(((offer.originalPrice - offer.offerPrice) / offer.originalPrice) * 100)
    : 0;

  return (
    <div className="card overflow-hidden hover:shadow-md transition-shadow">
      {offer.images?.[0] ? (
        <img src={offer.images[0]} alt={offer.title} className="w-full h-36 object-cover" />
      ) : (
        <div className="w-full h-36 bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
          <FiTag size={36} className="text-green-300" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-gray-800 text-sm leading-tight">{offer.title}</h3>
          {discountPct > 0 && (
            <span className="flex-shrink-0 text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-bold">
              -{discountPct}%
            </span>
          )}
        </div>

        {offer.description && (
          <p className="text-xs text-gray-500 mb-2 line-clamp-2">{offer.description}</p>
        )}

        <div className="flex flex-wrap gap-1 mb-3">
          {offer.printSpecs?.paperWeight && (
            <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{offer.printSpecs.paperWeight}gsm</span>
          )}
          {offer.printSpecs?.finish && (
            <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded capitalize">{offer.printSpecs.finish}</span>
          )}
          {offer.printSpecs?.quantity && (
            <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{offer.printSpecs.quantity} pcs</span>
          )}
          {offer.printSpecs?.deliveryDays && (
            <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{offer.printSpecs.deliveryDays}d delivery</span>
          )}
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-lg font-bold text-green-600">₹{offer.offerPrice?.toLocaleString()}</p>
            {offer.originalPrice && (
              <p className="text-xs text-gray-400 line-through">₹{offer.originalPrice.toLocaleString()}</p>
            )}
            <p className="text-xs text-gray-400">per {offer.unit || 'piece'}</p>
          </div>
          <div className="text-right">
            <CountdownBadge expiresAt={offer.expiresAt} />
            {offer.maxSlots && (
              <p className="text-xs text-gray-400 mt-0.5">
                {Math.max(0, offer.maxSlots - (offer.claimedCount || 0))} slots left
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 pt-3 border-t flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-xs">
              {(offer.seller?.businessName || offer.seller?.name || '?')[0].toUpperCase()}
            </div>
            <span className="text-xs text-gray-600 truncate max-w-[100px]">
              {offer.seller?.businessName || offer.seller?.name}
            </span>
          </div>
          <Link
            to={`/products?keyword=${encodeURIComponent(offer.title)}`}
            state={{ offerId: offer._id }}
            className="flex items-center gap-1 text-xs bg-green-600 text-white px-2.5 py-1.5 rounded hover:bg-green-700"
          >
            Grab Offer <FiArrowRight size={11} />
          </Link>
        </div>
      </div>
    </div>
  );
}

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
  useEffect(() => { categoryAPI.getAll().then((r) => setCategories(Array.isArray(r.data) ? r.data : [])).catch(() => {}); }, []);

  const expiringSoon = offers.filter(o => new Date(o.expiresAt) - new Date() < 3 * 3600000);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 mb-6 text-white">
        <h1 className="text-2xl md:text-3xl font-bold mb-1">🔥 Offer Zone</h1>
        <p className="text-orange-100 text-sm">
          Time-limited print deals from verified sellers. Like club printing — fill the press, save big.
        </p>
        {expiringSoon.length > 0 && (
          <p className="mt-2 text-xs bg-white/20 rounded-full inline-block px-3 py-1">
            ⚡ {expiringSoon.length} offer{expiringSoon.length !== 1 ? 's' : ''} expiring in &lt;3 hours!
          </p>
        )}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
        <button
          onClick={() => setCatFilter('')}
          className={`flex-shrink-0 text-sm px-4 py-1.5 rounded-full border transition-colors ${!catFilter ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-600 hover:border-green-500'}`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c._id}
            onClick={() => setCatFilter(catFilter === c._id ? '' : c._id)}
            className={`flex-shrink-0 text-sm px-4 py-1.5 rounded-full border transition-colors ${catFilter === c._id ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-600 hover:border-green-500'}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16"><Spinner size="lg" /></div>
      ) : offers.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">🏷️</p>
          <p className="font-medium text-gray-600">No active offers right now</p>
          <p className="text-sm mt-1">Check back soon — sellers post new deals daily</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {offers.map((o) => <OfferCard key={o._id} offer={o} />)}
        </div>
      )}
    </div>
  );
}
