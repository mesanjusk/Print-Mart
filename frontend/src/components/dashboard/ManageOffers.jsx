import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Clock, ToggleLeft, ToggleRight, Flame, X } from 'lucide-react';
import { offerAPI, categoryAPI } from '../../services/api';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
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
  if (!t) return <span className="text-xs text-destructive font-medium">Expired</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
      <Clock className="h-3 w-3" />
      {t.h > 0 ? `${t.h}h ${t.m}m left` : `${t.m}m left`}
    </span>
  );
}

function OfferForm({ categories, onSaved, onCancel }) {
  const [form, setForm] = useState({
    title: '', description: '', category: '', originalPrice: '',
    offerPrice: '', unit: 'piece', minOrderQty: 1, maxSlots: '',
    expiryValue: 24, expiryUnit: 'hours',
  });
  const [printSpecs, setPrintSpecs] = useState({ paperWeight: '', size: '', finish: '', quantity: '', deliveryDays: '' });
  const [loading, setLoading] = useState(false);
  const [showSpecs, setShowSpecs] = useState(false);

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
    <form onSubmit={handleSubmit} className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20 p-5 mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-foreground">Post New Offer</h2>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-sm font-medium text-foreground">Offer Title *</label>
          <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required className="input" placeholder="e.g. 500 Matte Business Cards at ₹499 — 24h Deal!" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Category</label>
          <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="input">
            <option value="">Any / General</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Unit</label>
          <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="input">
            {UNITS.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Original Price (₹)</label>
          <input type="number" value={form.originalPrice} onChange={e => setForm({...form, originalPrice: e.target.value})} className="input" placeholder="e.g. 799" min={0} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Offer Price (₹) *</label>
          <input type="number" value={form.offerPrice} onChange={e => setForm({...form, offerPrice: e.target.value})} required className="input" placeholder="e.g. 499" min={1} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Min Order Qty</label>
          <input type="number" value={form.minOrderQty} onChange={e => setForm({...form, minOrderQty: e.target.value})} className="input" min={1} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Max Slots <span className="text-muted-foreground font-normal">(blank = unlimited)</span></label>
          <input type="number" value={form.maxSlots} onChange={e => setForm({...form, maxSlots: e.target.value})} className="input" placeholder="e.g. 10" min={1} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-foreground whitespace-nowrap">Expires in</label>
        <input type="number" value={form.expiryValue} onChange={e => setForm({...form, expiryValue: e.target.value})} className="input w-20" min={1} />
        <select value={form.expiryUnit} onChange={e => setForm({...form, expiryUnit: e.target.value})} className="input w-28">
          <option value="hours">Hours</option>
          <option value="days">Days</option>
        </select>
        <span className="text-xs text-muted-foreground">from now</span>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSpecs(!showSpecs)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          Print Specifications <span className="text-xs text-muted-foreground">(optional)</span>
          <span className="text-xs text-primary-600 dark:text-primary-400">{showSpecs ? 'Hide' : 'Show'}</span>
        </button>
        <AnimatePresence>
          {showSpecs && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4">
                {[
                  { label: 'Quantity', key: 'quantity', opts: QTY_OPTS, format: q => `${q} pcs` },
                  { label: 'Paper Weight', key: 'paperWeight', opts: PAPER_OPTS, format: p => `${p} gsm` },
                ].map(({ label, key, opts, format }) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">{label}</label>
                    <select value={printSpecs[key]} onChange={e => setPrintSpecs({...printSpecs, [key]: e.target.value})} className="input text-sm">
                      <option value="">Any</option>
                      {opts.map(v => <option key={v} value={v}>{format(v)}</option>)}
                    </select>
                  </div>
                ))}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Finish</label>
                  <select value={printSpecs.finish} onChange={e => setPrintSpecs({...printSpecs, finish: e.target.value})} className="input text-sm capitalize">
                    <option value="">Any</option>
                    {FINISHES.map(f => <option key={f} value={f} className="capitalize">{f}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Size</label>
                  <input value={printSpecs.size} onChange={e => setPrintSpecs({...printSpecs, size: e.target.value})} className="input text-sm" placeholder="e.g. 3.5×2in" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Delivery Days</label>
                  <select value={printSpecs.deliveryDays} onChange={e => setPrintSpecs({...printSpecs, deliveryDays: e.target.value})} className="input text-sm">
                    <option value="">Any</option>
                    {[1,2,3,5,7].map(d => <option key={d} value={d}>{d}d</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Description</label>
        <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input resize-none" rows={2} placeholder="What's included? Any conditions?" />
      </div>

      <Button type="submit" loading={loading} className="gap-1.5">
        {!loading && <><Flame className="h-4 w-4" /> Post Offer</>}
      </Button>
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
          <h1 className="text-xl font-bold text-foreground">My Offers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Time-limited deals. All buyers get notified when you post.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5">
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'New Offer'}
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <OfferForm categories={categories} onSaved={() => { setShowForm(false); fetchOffers(); }} onCancel={() => setShowForm(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="py-16 flex justify-center"><Spinner size="lg" /></div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-semibold text-foreground mb-3">Active ({active.length})</p>
              <div className="space-y-3">
                {active.map(o => (
                  <motion.div key={o._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border-l-4 border-l-emerald-500 border-y border-r border-border bg-card p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-foreground truncate">{o.title}</p>
                          <Badge variant="success" className="text-2xs">Active</Badge>
                        </div>
                        <p className="text-sm text-foreground">
                          ₹{o.offerPrice?.toLocaleString()}
                          {o.originalPrice && <span className="line-through text-muted-foreground ml-1.5 text-xs">₹{o.originalPrice.toLocaleString()}</span>}
                          <span className="text-muted-foreground"> / {o.unit}</span>
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <TimeLeft expiresAt={o.expiresAt} />
                          {o.maxSlots && <span className="text-xs text-muted-foreground">{o.claimedCount || 0}/{o.maxSlots} claimed</span>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => handleToggle(o)} title="Pause offer" className="text-muted-foreground hover:text-amber-500">
                          <ToggleRight className="h-5 w-5 text-emerald-500" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(o._id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {expired.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-3">Expired / Paused ({expired.length})</p>
              <div className="space-y-2">
                {expired.map(o => (
                  <div key={o._id} className="rounded-xl border border-border bg-card p-3 opacity-60 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{o.title}</p>
                      <p className="text-xs text-muted-foreground">₹{o.offerPrice?.toLocaleString()} / {o.unit} · Expired {new Date(o.expiresAt).toLocaleDateString()}</p>
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(o._id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {offers.length === 0 && !showForm && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Flame className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">No offers yet</h3>
              <p className="text-muted-foreground text-sm">Post a time-limited deal to fill blank press space and get more orders.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
