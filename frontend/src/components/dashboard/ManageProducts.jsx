import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiPlus, FiEye } from 'react-icons/fi';
import { productAPI, categoryAPI } from '../../services/api';
import Spinner from '../common/Spinner';
import toast from 'react-hot-toast';

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = () => {
    productAPI.getMine().then((r) => setProducts(r.data)).finally(() => setLoading(false));
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
                <p className="text-orange-500 text-sm font-semibold">₹{p.price?.min?.toLocaleString()} / {p.price?.unit}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`badge ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs text-gray-400">{p.views} views · {p.inquiries} inquiries</span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Link to={`/products/${p.slug}`} className="p-2 text-gray-400 hover:text-blue-500 rounded hover:bg-blue-50"><FiEye size={16} /></Link>
                <Link to={`/dashboard/products/edit/${p._id}`} className="p-2 text-gray-400 hover:text-orange-500 rounded hover:bg-orange-50"><FiEdit2 size={16} /></Link>
                <button onClick={() => handleDelete(p._id)} className="p-2 text-gray-400 hover:text-red-500 rounded hover:bg-red-50"><FiTrash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductForm({ editId }) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', category: '', brand: '',
    priceMin: '', priceMax: '', priceUnit: 'piece', minOrderQty: 1,
    tags: '', featured: false,
  });
  const [specRows, setSpecRows] = useState([{ key: '', value: '' }]);

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
        <Link to="/dashboard/products" className="text-sm text-gray-500 hover:text-orange-500">← Back</Link>
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
            <select name="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required className="input">
              <option value="">Select category</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
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
            <button type="button" onClick={() => setSpecRows([...specRows, { key: '', value: '' }])} className="text-sm text-orange-500 hover:text-orange-600">+ Add Spec</button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Images</label>
            <input type="file" name="images" multiple accept="image/*" className="input py-1.5 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="featured" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} name="featured" className="w-4 h-4 accent-orange-500" />
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
