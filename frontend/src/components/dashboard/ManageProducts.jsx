import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, Edit2, Trash2, Plus, X, Package, ChevronLeft } from 'lucide-react';
import { productAPI, categoryAPI } from '../../services/api';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import Spinner from '../common/Spinner';
import toast from 'react-hot-toast';

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = () => {
    setLoading(true);
    productAPI.getMine().then((r) => setProducts(Array.isArray(r.data) ? r.data : [])).finally(() => setLoading(false));
  };

  useEffect(fetchProducts, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await productAPI.remove(id);
      toast.success('Product deleted');
      fetchProducts();
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">My Products</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{products.length} product{products.length !== 1 ? 's' : ''} listed</p>
        </div>
        <Link to="/dashboard/products/new">
          <Button size="sm">
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><Spinner size="lg" /></div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Package className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No products yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Add your first product to start receiving inquiries</p>
          <Link to="/dashboard/products/new">
            <Button>Add your first product</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <motion.div
              key={p._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card p-4 flex items-center gap-4 hover:border-primary-200 dark:hover:border-primary-800 transition-colors"
            >
              <img
                src={p.images?.[0] || 'https://placehold.co/56x56?text=No+Img'}
                alt={p.name}
                className="w-14 h-14 object-cover rounded-lg flex-shrink-0 border border-border"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">{p.name}</h3>
                <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold">
                  ₹{p.price?.min?.toLocaleString()} / {p.price?.unit}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={p.isActive ? 'success' : 'secondary'} className="text-2xs">
                    {p.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{p.views || 0} views · {p.inquiries || 0} inquiries</span>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Link to={`/products/${p.slug}`}>
                  <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to={`/dashboard/products/edit/${p._id}`}>
                  <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-primary-600">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(p._id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddCategoryModal({ onClose, onAdded }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Category name is required'); return; }
    setSaving(true);
    try {
      const res = await categoryAPI.create({ name: name.trim(), description: description.trim(), icon: icon.trim() });
      toast.success(`Category "${res.data.name}" added`);
      onAdded(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-border bg-card shadow-elevated p-6 max-w-sm w-full"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-foreground">Add New Category</h3>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="e.g. Business Cards" autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSave()} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className="input" placeholder="Brief description" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Icon <span className="text-muted-foreground font-normal">(emoji, optional)</span></label>
            <input value={icon} onChange={(e) => setIcon(e.target.value)} className="input" placeholder="e.g. 🖨️" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button onClick={handleSave} loading={saving} className="flex-1">
            {!saving && 'Add Category'}
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </motion.div>
    </div>
  );
}

function ProductForm({ editId }) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', category: '', brand: '',
    priceMin: '', priceMax: '', priceUnit: 'piece', minOrderQty: 1,
    tags: '', featured: false,
  });
  const [specRows, setSpecRows] = useState([{ key: '', value: '' }]);
  const [printSpecs, setPrintSpecs] = useState({
    paperWeight: '', size: '', finish: '', quantity: '', sides: '', deliveryDays: '', material: '',
  });

  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    categoryAPI.getAll().then((r) => setCategories(r.data));
    if (editId) {
      productAPI.getMine().then((r) => {
        const p = r.data.find((x) => x._id === editId);
        if (p) {
          setForm({
            name: p.name, description: p.description, category: p.category?._id || p.category,
            brand: p.brand || '', priceMin: p.price?.min || '', priceMax: p.price?.max || '',
            priceUnit: p.price?.unit || 'piece', minOrderQty: p.minOrderQty || 1,
            tags: p.tags?.join(', ') || '', featured: p.featured || false,
          });
          if (p.specifications?.length) setSpecRows(p.specifications);
          if (p.printSpecs) {
            setPrintSpecs({
              paperWeight: p.printSpecs.paperWeight || '',
              size: p.printSpecs.size || '',
              finish: p.printSpecs.finish || '',
              quantity: p.printSpecs.quantity || '',
              sides: p.printSpecs.sides || '',
              deliveryDays: p.printSpecs.deliveryDays || '',
              material: p.printSpecs.material || '',
            });
          }
        }
      });
    }
  }, [editId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.target);
    fd.set('price', JSON.stringify({ min: Number(form.priceMin), max: form.priceMax ? Number(form.priceMax) : undefined, unit: form.priceUnit }));
    fd.set('tags', JSON.stringify(form.tags.split(',').map((t) => t.trim()).filter(Boolean)));
    fd.set('specifications', JSON.stringify(specRows.filter((r) => r.key && r.value)));
    fd.delete('priceMin'); fd.delete('priceMax'); fd.delete('priceUnit');
    const ps = {};
    if (printSpecs.paperWeight) ps.paperWeight = Number(printSpecs.paperWeight);
    if (printSpecs.size) ps.size = printSpecs.size;
    if (printSpecs.finish) ps.finish = printSpecs.finish;
    if (printSpecs.quantity) ps.quantity = Number(printSpecs.quantity);
    if (printSpecs.sides) ps.sides = printSpecs.sides;
    if (printSpecs.deliveryDays) ps.deliveryDays = Number(printSpecs.deliveryDays);
    if (printSpecs.material) ps.material = printSpecs.material;
    if (Object.keys(ps).length > 0) fd.set('printSpecs', JSON.stringify(ps));
    try {
      if (editId) await productAPI.update(editId, fd);
      else await productAPI.create(fd);
      toast.success(editId ? 'Product updated!' : 'Product created!');
      navigate('/dashboard/products');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/dashboard/products">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-foreground">{editId ? 'Edit Product' : 'Add New Product'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <p className="text-sm font-semibold text-foreground">Basic Information</p>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Product Name *</label>
            <input name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="input" placeholder="e.g. Business Cards 500 pcs" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Category *</label>
            <div className="flex gap-2">
              <select name="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required className="input flex-1">
                <option value="">Select category</option>
                {sortedCategories.map((c) => (
                  <option key={c._id} value={c._id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>
                ))}
              </select>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCatModal(true)} className="whitespace-nowrap">
                <Plus className="h-3.5 w-3.5" /> New
              </Button>
            </div>
          </div>
          {showCatModal && (
            <AddCategoryModal
              onClose={() => setShowCatModal(false)}
              onAdded={(newCat) => {
                setCategories((prev) => [...prev, newCat]);
                setForm((f) => ({ ...f, category: newCat._id }));
              }}
            />
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Description *</label>
            <textarea name="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required rows={4} className="input resize-none" />
          </div>
        </div>

        {/* Pricing */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <p className="text-sm font-semibold text-foreground">Pricing</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Min Price (₹) *</label>
              <input type="number" value={form.priceMin} onChange={(e) => setForm({ ...form, priceMin: e.target.value })} required min={0} className="input" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Max Price (₹)</label>
              <input type="number" value={form.priceMax} onChange={(e) => setForm({ ...form, priceMax: e.target.value })} min={0} className="input" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Unit</label>
              <select value={form.priceUnit} onChange={(e) => setForm({ ...form, priceUnit: e.target.value })} className="input">
                {['piece', 'kg', 'ton', 'liter', 'meter', 'box', 'set', 'unit'].map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Min Order Qty</label>
              <input type="number" name="minOrderQty" value={form.minOrderQty} onChange={(e) => setForm({ ...form, minOrderQty: e.target.value })} min={1} className="input" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Brand</label>
              <input type="text" name="brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="input" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Tags <span className="text-muted-foreground font-normal">(comma separated)</span></label>
            <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="input" placeholder="business cards, glossy, 500 pcs" />
          </div>
        </div>

        {/* Specifications */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <p className="text-sm font-semibold text-foreground">Specifications</p>
          {specRows.map((row, i) => (
            <div key={i} className="flex gap-2">
              <input placeholder="Key (e.g. Material)" value={row.key} onChange={(e) => { const rows = [...specRows]; rows[i].key = e.target.value; setSpecRows(rows); }} className="input flex-1" />
              <input placeholder="Value" value={row.value} onChange={(e) => { const rows = [...specRows]; rows[i].value = e.target.value; setSpecRows(rows); }} className="input flex-1" />
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setSpecRows(specRows.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <button type="button" onClick={() => setSpecRows([...specRows, { key: '', value: '' }])} className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
            + Add Specification
          </button>
        </div>

        {/* Print Specs */}
        <div className="rounded-xl border border-primary-200 dark:border-primary-800/40 bg-primary-50/50 dark:bg-primary-950/20 p-6 space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Print Specifications</p>
            <p className="text-xs text-muted-foreground">Enables price comparison listing feature</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Quantity (pcs)</label>
              <select value={printSpecs.quantity} onChange={(e) => setPrintSpecs({ ...printSpecs, quantity: e.target.value })} className="input text-sm">
                <option value="">Select</option>
                {[100, 250, 500, 1000, 2000, 5000, 10000].map((q) => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Paper Weight (gsm)</label>
              <select value={printSpecs.paperWeight} onChange={(e) => setPrintSpecs({ ...printSpecs, paperWeight: e.target.value })} className="input text-sm">
                <option value="">Select</option>
                {[90, 100, 130, 170, 250, 300, 350].map((g) => <option key={g} value={g}>{g} gsm</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Finish</label>
              <select value={printSpecs.finish} onChange={(e) => setPrintSpecs({ ...printSpecs, finish: e.target.value })} className="input text-sm capitalize">
                <option value="">Select</option>
                {['matte', 'glossy', 'uncoated', 'soft-touch', 'uv', 'other'].map((f) => <option key={f} value={f} className="capitalize">{f}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Sides</label>
              <select value={printSpecs.sides} onChange={(e) => setPrintSpecs({ ...printSpecs, sides: e.target.value })} className="input text-sm">
                <option value="">Select</option>
                <option value="single">Single-sided</option>
                <option value="double">Double-sided</option>
                <option value="na">N/A</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Size / Dimensions</label>
              <input value={printSpecs.size} onChange={(e) => setPrintSpecs({ ...printSpecs, size: e.target.value })} className="input text-sm" placeholder="e.g. 3.5x2 in, A4" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Delivery Days</label>
              <select value={printSpecs.deliveryDays} onChange={(e) => setPrintSpecs({ ...printSpecs, deliveryDays: e.target.value })} className="input text-sm">
                <option value="">Select</option>
                {[1, 2, 3, 5, 7, 10, 14].map((d) => <option key={d} value={d}>{d} day{d !== 1 ? 's' : ''}</option>)}
              </select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-foreground">Material <span className="text-muted-foreground font-normal">(for banners, gifts)</span></label>
              <input value={printSpecs.material} onChange={(e) => setPrintSpecs({ ...printSpecs, material: e.target.value })} className="input text-sm" placeholder="e.g. flex, vinyl, plastic, metal" />
            </div>
          </div>
        </div>

        {/* Images & Options */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <p className="text-sm font-semibold text-foreground">Images & Options</p>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Product Images</label>
            <input type="file" name="images" multiple accept="image/*" className="input py-1.5 text-sm" />
          </div>
          <div className="flex items-center gap-2.5">
            <input type="checkbox" id="featured" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} name="featured" className="w-4 h-4 accent-primary-600 rounded" />
            <label htmlFor="featured" className="text-sm text-foreground cursor-pointer">Mark as Featured</label>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={loading} size="lg">
            {!loading && (editId ? 'Update Product' : 'Add Product')}
          </Button>
        </div>
      </form>
    </div>
  );
}

function ProductFormWrapper() {
  const { id } = useParams();
  return <ProductForm editId={id} />;
}

export default function ManageProducts() {
  return (
    <Routes>
      <Route index element={<ProductList />} />
      <Route path="new" element={<ProductForm />} />
      <Route path="edit/:id" element={<ProductFormWrapper />} />
    </Routes>
  );
}
