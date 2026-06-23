import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiPlus, FiEye, FiX } from 'react-icons/fi';
import { productAPI, categoryAPI } from '../../services/api';
import Spinner from '../common/Spinner';
import toast from 'react-hot-toast';

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = () => {
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">My Products</h1>
        <Link to="/dashboard/products/new" className="btn-primary text-sm py-1.5 flex items-center gap-1">
          <FiPlus /> Add Product
        </Link>
      </div>
      {loading ? <Spinner /> : products.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📦</p>
          <p className="mb-4">No products yet</p>
          <Link to="/dashboard/products/new" className="btn-primary text-sm">Add your first product</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <div key={p._id} className="card p-4 flex items-center gap-4">
              <img src={p.images?.[0] || 'https://placehold.co/60x60?text=No+Img'} alt={p.name}
                className="w-14 h-14 object-cover rounded flex-shrink-0" />
              <div className="flex-grow min-w-0">
                <h3 className="font-medium text-gray-800 truncate">{p.name}</h3>
                <p className="text-green-600 text-sm font-semibold">₹{p.price?.min?.toLocaleString()} / {p.price?.unit}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`badge ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs text-gray-400">{p.views} views · {p.inquiries} inquiries</span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Link to={`/products/${p.slug}`} className="p-2 text-gray-400 hover:text-blue-500 rounded hover:bg-blue-50"><FiEye size={16} /></Link>
                <Link to={`/dashboard/products/edit/${p._id}`} className="p-2 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"><FiEdit2 size={16} /></Link>
                <button onClick={() => handleDelete(p._id)} className="p-2 text-gray-400 hover:text-red-500 rounded hover:bg-red-50"><FiTrash2 size={16} /></button>
              </div>
            </div>
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="card p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Add New Category</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiX size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="e.g. Business Cards" autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSave()} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400">(optional)</span></label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className="input" placeholder="Brief description" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Icon <span className="text-gray-400">(emoji, optional)</span></label>
            <input value={icon} onChange={(e) => setIcon(e.target.value)} className="input" placeholder="e.g. 🖨️" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Adding...' : 'Add Category'}
          </button>
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
        </div>
      </div>
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
    // Build printSpecs — only include non-empty values
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
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Link to="/dashboard/products" className="text-sm text-gray-500 hover:text-green-600">← Back</Link>
        <h1 className="text-xl font-bold text-gray-800">{editId ? 'Edit Product' : 'Add New Product'}</h1>
      </div>
      <div className="card p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="input" placeholder="e.g. Industrial Steel Pipe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <div className="flex gap-2">
              <select name="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required className="input flex-1">
                <option value="">Select category</option>
                {sortedCategories.map((c) => (
                  <option key={c._id} value={c._id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>
                ))}
              </select>
              <button type="button" onClick={() => setShowCatModal(true)}
                className="px-3 py-2 border border-green-500 text-green-600 rounded-lg text-sm font-medium hover:bg-green-50 whitespace-nowrap">
                + New
              </button>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea name="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required rows={4} className="input resize-none" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Price (₹) *</label>
              <input type="number" value={form.priceMin} onChange={(e) => setForm({ ...form, priceMin: e.target.value })} required min={0} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Price (₹)</label>
              <input type="number" value={form.priceMax} onChange={(e) => setForm({ ...form, priceMax: e.target.value })} min={0} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select value={form.priceUnit} onChange={(e) => setForm({ ...form, priceUnit: e.target.value })} className="input">
                {['piece', 'kg', 'ton', 'liter', 'meter', 'box', 'set', 'unit'].map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Qty</label>
              <input type="number" name="minOrderQty" value={form.minOrderQty} onChange={(e) => setForm({ ...form, minOrderQty: e.target.value })} min={1} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <input type="text" name="brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="input" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags <span className="text-gray-400">(comma separated)</span></label>
            <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="input" placeholder="steel, pipe, industrial" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Specifications</label>
            {specRows.map((row, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input placeholder="Key" value={row.key} onChange={(e) => { const rows = [...specRows]; rows[i].key = e.target.value; setSpecRows(rows); }} className="input flex-1" />
                <input placeholder="Value" value={row.value} onChange={(e) => { const rows = [...specRows]; rows[i].value = e.target.value; setSpecRows(rows); }} className="input flex-1" />
                <button type="button" onClick={() => setSpecRows(specRows.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 px-2">✕</button>
              </div>
            ))}
            <button type="button" onClick={() => setSpecRows([...specRows, { key: '', value: '' }])} className="text-sm text-green-600 hover:text-green-700">+ Add Spec</button>
          </div>
          {/* Print Specs — for price comparison feature */}
          <div className="border border-green-200 rounded-lg p-4 bg-green-50">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Print Specifications <span className="text-gray-400 font-normal">(enables price comparison)</span></h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quantity (pcs)</label>
                <select value={printSpecs.quantity} onChange={(e) => setPrintSpecs({ ...printSpecs, quantity: e.target.value })} className="input text-sm">
                  <option value="">Select</option>
                  {[100, 250, 500, 1000, 2000, 5000, 10000].map((q) => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Paper Weight (gsm)</label>
                <select value={printSpecs.paperWeight} onChange={(e) => setPrintSpecs({ ...printSpecs, paperWeight: e.target.value })} className="input text-sm">
                  <option value="">Select</option>
                  {[90, 100, 130, 170, 250, 300, 350].map((g) => <option key={g} value={g}>{g} gsm</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Finish</label>
                <select value={printSpecs.finish} onChange={(e) => setPrintSpecs({ ...printSpecs, finish: e.target.value })} className="input text-sm capitalize">
                  <option value="">Select</option>
                  {['matte', 'glossy', 'uncoated', 'soft-touch', 'uv', 'other'].map((f) => <option key={f} value={f} className="capitalize">{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sides</label>
                <select value={printSpecs.sides} onChange={(e) => setPrintSpecs({ ...printSpecs, sides: e.target.value })} className="input text-sm">
                  <option value="">Select</option>
                  <option value="single">Single-sided</option>
                  <option value="double">Double-sided</option>
                  <option value="na">N/A</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Size / Dimensions</label>
                <input value={printSpecs.size} onChange={(e) => setPrintSpecs({ ...printSpecs, size: e.target.value })} className="input text-sm" placeholder="e.g. 3.5x2 in, A4, 12x18ft" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Delivery Days</label>
                <select value={printSpecs.deliveryDays} onChange={(e) => setPrintSpecs({ ...printSpecs, deliveryDays: e.target.value })} className="input text-sm">
                  <option value="">Select</option>
                  {[1, 2, 3, 5, 7, 10, 14].map((d) => <option key={d} value={d}>{d} day{d !== 1 ? 's' : ''}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Material <span className="text-gray-400">(for banners, gifts)</span></label>
                <input value={printSpecs.material} onChange={(e) => setPrintSpecs({ ...printSpecs, material: e.target.value })} className="input text-sm" placeholder="e.g. flex, vinyl, plastic, metal, wood" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Images</label>
            <input type="file" name="images" multiple accept="image/*" className="input py-1.5 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="featured" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} name="featured" className="w-4 h-4 accent-green-600" />
            <label htmlFor="featured" className="text-sm text-gray-700">Mark as Featured</label>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? 'Saving...' : editId ? 'Update Product' : 'Add Product'}
          </button>
        </form>
      </div>
    </div>
  );
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

function ProductFormWrapper() {
  const { id } = useParams();
  return <ProductForm editId={id} />;
}
