import { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiClock, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import { offerAPI, categoryAPI } from '../../services/api';
import Spinner from '../common/Spinner';
import toast from 'react-hot-toast';

const UNITS = ['piece', 'set', 'kg', 'meter', 'box', 'sheet'];
const FINISHES = ['matte', 'glossy', 'uncoated', 'soft-touch', 'uv', 'other'];
const QTY_OPTS = [100, 250, 500, 1000, 2000, 5000];
const PAPER_OPTS = [90, 100, 130, 170, 250, 300, 350];

function useCountdown(expiresAt) {
  const calc = () => {
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return null;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return { h, m };
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 60000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return t;
}

function TimeLeft({ expiresAt }) {
  const t = useCountdown(expiresAt);
  if (!t) return <span className="text-xs text-red-500">Expired</span>;
  return <span className="text-xs text-orange-600">{t.h > 0 ? `${t.h}h ${t.m}m left` : `${t.m}m left`}</span>;
}

function OfferForm({ categories, onSaved, onCancel }) {
  const [form, setForm] = useState({
    title: '', description: '', category: '', originalPrice: '',
    offerPrice: '', unit: 'piece', minOrderQty: 1, maxSlots: '', tags: '',
    expiryValue: 24, expiryUnit: 'hours',
  });
  const [printSpecs, setPrintSpecs] = useState({ paperWeight: '', size: '', finish: '', quantity: '', deliveryDays: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.offerPrice) return toast.error('Offer price is required');
    setLoading(true);
    const mult = form.expiryUnit === 'hours' ? 3600000 : 86400000;
    const expiresAt = new Date(Date.now() + Number(form.expiryValue) * mult);
    const ps = Object.fromEntries(Object.entries(printSpecs).filter(([, v]) => v));
    if (ps.paperWeight) ps.paperWeight = Number(ps.paperWeight);
    if (ps.quantity) ps.quantity = Number(ps.quantity);
    if (ps.deliveryDays) ps.deliveryDays = Number(ps.deliveryDays);
    try {
      await offerAPI.create({
        title: form.title,
        description: form.description,
        category: form.category || undefined,
        originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
        offerPrice: Number(form.offerPrice),
        unit: form.unit,
        minOrderQty: Number(form.minOrderQty),
        maxSlots: form.maxSlots ? Number(form.maxSlots) : undefined,
        tags: form.tags,
        printSpecs: Object.keys(ps).length ? ps : undefined,
        expiresAt,
      });
      toast.success('Offer posted! Buyers will be notified.');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post offer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-5 mb-6 bg-orange-50 border border-orange-200 space-y-4">
      <h2 className="font-bold text-gray-800 text-lg">Post New Offer</h2>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Offer Title *</label>
          <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required className="input" placeholder="e.g. 500 Matte Business Cards at ₹499 — 24h Deal!" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="input">
            <option value="">Any / General</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
          <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="input">
            {UNITS.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Original Price (₹)</label>
          <input type="number" value={form.originalPrice} onChange={e => setForm({...form, originalPrice: e.target.value})} className="input" placeholder="e.g. 799" min={0} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Offer Price (₹) *</label>
          <input type="number" value={form.offerPrice} onChange={e => setForm({...form, offerPrice: e.target.value})} required className="input" placeholder="e.g. 499" min={1} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Qty</label>
          <input type="number" value={form.minOrderQty} onChange={e => setForm({...form, minOrderQty: e.target.value})} className="input" min={1} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Slots <span className="text-gray-400">(leave blank = unlimited)</span></label>
          <input type="number" value={form.maxSlots} onChange={e => setForm({...form, maxSlots: e.target.value})} className="input" placeholder="e.g. 10" min={1} />
        </div>
      </div>

      {/* Expiry */}
      <div className="flex items-center gap-2">
        <label className="block text-sm font-medium text-gray-700 whitespace-nowrap">Expires in</label>
        <input type="number" value={form.expiryValue} onChange={e => setForm({...form, expiryValue: e.target.value})} className="input w-20" min={1} />
        <select value={form.expiryUnit} onChange={e => setForm({...form, expiryUnit: e.target.value})} className="input w-28">
          <option value="hours">Hours</option>
          <option value="days">Days</option>
        </select>
        <span className="text-xs text-gray-400">from now</span>
      </div>

      {/* Print Specs */}
      <details className="border border-gray-200 rounded-lg p-3">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 select-none">Print Specifications (optional — helps comparison)</summary>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <select value={printSpecs.quantity} onChange={e => setPrintSpecs({...printSpecs, quantity: e.target.value})} className="input text-sm">
              <option value="">Any</option>
              {QTY_OPTS.map(q => <option key={q} value={q}>{q} pcs</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paper Weight</label>
            <select value={printSpecs.paperWeight} onChange={e => setPrintSpecs({...printSpecs, paperWeight: e.target.value})} className="input text-sm">
              <option value="">Any</option>
              {PAPER_OPTS.map(p => <option key={p} value={p}>{p} gsm</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Finish</label>
            <select value={printSpecs.finish} onChange={e => setPrintSpecs({...printSpecs, finish: e.target.value})} className="input text-sm capitalize">
              <option value="">Any</option>
              {FINISHES.map(f => <option key={f} value={f} className="capitalize">{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
            <input value={printSpecs.size} onChange={e => setPrintSpecs({...printSpecs, size: e.target.value})} className="input text-sm" placeholder="e.g. 3.5×2in" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Days</label>
            <select value={printSpecs.deliveryDays} onChange={e => setPrintSpecs({...printSpecs, deliveryDays: e.target.value})} className="input text-sm">
              <option value="">Any</option>
              {[1,2,3,5,7].map(d => <option key={d} value={d}>{d}d</option>)}
            </select>
          </div>
        </div>
      </details>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input resize-none" rows={2} placeholder="What's included? Any conditions?" />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Posting...' : '🔥 Post Offer'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

export default function ManageOffers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [categories, setCategories] = useState([]);

  const fetchOffers = () => {
    offerAPI.getMy()
      .then(r => setOffers(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error('Failed to load offers'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOffers();
    categoryAPI.getAll().then(r => setCategories(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Remove this offer?')) return;
    try {
      await offerAPI.remove(id);
      toast.success('Offer removed');
      setOffers(prev => prev.filter(o => o._id !== id));
    } catch { toast.error('Failed to remove'); }
  };

  const handleToggle = async (offer) => {
    try {
      await offerAPI.update(offer._id, { isActive: !offer.isActive });
      toast.success(offer.isActive ? 'Offer paused' : 'Offer resumed');
      fetchOffers();
    } catch { toast.error('Failed to update'); }
  };

  const active = offers.filter(o => o.isActive && new Date(o.expiresAt) > new Date());
  const expired = offers.filter(o => !o.isActive || new Date(o.expiresAt) <= new Date());

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800">My Offers</h1>
          <p className="text-sm text-gray-500 mt-0.5">Time-limited deals. Fill your press. All buyers get push-notified when you post.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-1.5 text-sm">
          <FiPlus size={15} /> New Offer
        </button>
      </div>

      {showForm && <OfferForm categories={categories} onSaved={() => { setShowForm(false); fetchOffers(); }} onCancel={() => setShowForm(false)} />}

      {loading ? <Spinner /> : (
        <>
          {active.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-600 mb-3">Active ({active.length})</h2>
              <div className="space-y-3">
                {active.map(o => (
                  <div key={o._id} className="card p-4 border-l-4 border-green-400">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-gray-800 truncate">{o.title}</p>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          ₹{o.offerPrice?.toLocaleString()}
                          {o.originalPrice && <span className="line-through text-gray-400 ml-1 text-xs">₹{o.originalPrice.toLocaleString()}</span>}
                          {' '}/ {o.unit}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <TimeLeft expiresAt={o.expiresAt} />
                          {o.maxSlots && <span className="text-xs text-gray-400">{o.claimedCount || 0}/{o.maxSlots} claimed</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleToggle(o)} title="Pause offer" className="text-gray-400 hover:text-amber-500 p-1">
                          <FiToggleRight size={20} className="text-green-500" />
                        </button>
                        <button onClick={() => handleDelete(o._id)} title="Remove offer" className="text-gray-400 hover:text-red-500 p-1">
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {expired.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-400 mb-3">Expired / Paused ({expired.length})</h2>
              <div className="space-y-2">
                {expired.map(o => (
                  <div key={o._id} className="card p-3 opacity-60 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{o.title}</p>
                      <p className="text-xs text-gray-400">₹{o.offerPrice?.toLocaleString()} / {o.unit} • Expired {new Date(o.expiresAt).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => handleDelete(o._id)} className="text-gray-400 hover:text-red-500 p-1">
                      <FiTrash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {offers.length === 0 && !showForm && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-5xl mb-3">🔥</p>
              <p className="font-medium">No offers yet</p>
              <p className="text-sm mt-1">Post a time-limited deal to fill blank press space and get more orders.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
