import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiStar, FiMapPin, FiTruck, FiFilter, FiArrowRight } from 'react-icons/fi';
import { compareAPI, categoryAPI } from '../services/api';
import Spinner from '../components/common/Spinner';
import toast from 'react-hot-toast';

const FINISH_OPTIONS = ['matte', 'glossy', 'uncoated', 'soft-touch', 'uv'];
const QTY_OPTIONS = [100, 250, 500, 1000, 2000, 5000];
const PAPER_OPTIONS = [90, 100, 130, 170, 250, 300, 350];

export default function ComparePage() {
  const [params, setParams] = useSearchParams();
  const [results, setResults] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    category: params.get('category') || '',
    quantity: params.get('quantity') || '',
    finish: params.get('finish') || '',
    paperWeight: params.get('paperWeight') || '',
  });

  useEffect(() => {
    categoryAPI.getAll().then((r) => setCategories(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const search = async () => {
    if (!filters.category) return toast.error('Please select a product category');
    setLoading(true);
    try {
      const p = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const r = await compareAPI.compare(p);
      setResults(Array.isArray(r.data) ? r.data : []);
      setParams(p);
    } catch {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (filters.category) search();
  }, []);

  const best = results[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Compare Prices</h1>
        <p className="text-gray-500 text-sm mt-1">Same product, different sellers. Find the best deal.</p>
      </div>

      {/* Filter bar */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="md:col-span-1">
            <label className="text-xs font-medium text-gray-500 block mb-1">Product Type *</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="input text-sm"
            >
              <option value="">Select...</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Quantity</label>
            <select
              value={filters.quantity}
              onChange={(e) => setFilters({ ...filters, quantity: e.target.value })}
              className="input text-sm"
            >
              <option value="">Any</option>
              {QTY_OPTIONS.map((q) => <option key={q} value={q}>{q} pcs</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Finish</label>
            <select
              value={filters.finish}
              onChange={(e) => setFilters({ ...filters, finish: e.target.value })}
              className="input text-sm capitalize"
            >
              <option value="">Any</option>
              {FINISH_OPTIONS.map((f) => <option key={f} value={f} className="capitalize">{f}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Paper Weight</label>
            <select
              value={filters.paperWeight}
              onChange={(e) => setFilters({ ...filters, paperWeight: e.target.value })}
              className="input text-sm"
            >
              <option value="">Any</option>
              {PAPER_OPTIONS.map((p) => <option key={p} value={p}>{p} gsm</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={search} className="btn-primary w-full flex items-center justify-center gap-1.5">
              <FiFilter size={15} /> Compare
            </button>
          </div>
        </div>
      </div>

      {loading && <div className="py-12"><Spinner size="lg" /></div>}

      {!loading && results.length === 0 && filters.category && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-4">🔍</p>
          <p className="font-medium text-gray-600">No matching products found</p>
          <p className="text-sm mt-1">Try relaxing some filters or a different category</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{results.length} seller{results.length !== 1 ? 's' : ''} found</p>
            {best && (
              <span className="text-xs bg-green-100 text-green-700 font-medium px-3 py-1 rounded-full">
                Best price: ₹{best.price?.min?.toLocaleString()} from {best.seller?.businessName || best.seller?.name}
              </span>
            )}
          </div>

          {/* Comparison table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 mb-6">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Seller</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Product</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Price</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Delivery</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Rating</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {results.map((p, i) => (
                  <tr key={p._id} className={i === 0 ? 'bg-green-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">
                          {(p.seller?.businessName || p.seller?.name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{p.seller?.businessName || p.seller?.name}</p>
                          {p.seller?.address?.city && (
                            <p className="text-xs text-gray-400 flex items-center gap-0.5">
                              <FiMapPin size={10} /> {p.seller.address.city}
                            </p>
                          )}
                        </div>
                      </div>
                      {i === 0 && (
                        <span className="inline-block mt-1 text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
                          Best Price
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{p.name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p.printSpecs?.paperWeight && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{p.printSpecs.paperWeight} gsm</span>
                        )}
                        {p.printSpecs?.finish && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded capitalize">{p.printSpecs.finish}</span>
                        )}
                        {p.printSpecs?.sides && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded capitalize">{p.printSpecs.sides}-sided</span>
                        )}
                        {p.printSpecs?.size && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{p.printSpecs.size}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <p className="text-lg font-bold text-green-600">
                        ₹{p.price?.min?.toLocaleString()}
                      </p>
                      {p.price?.max && (
                        <p className="text-xs text-gray-400">up to ₹{p.price.max.toLocaleString()}</p>
                      )}
                      <p className="text-xs text-gray-400">per {p.printSpecs?.quantity || p.minOrderQty} pcs</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.printSpecs?.deliveryDays ? (
                        <div className="flex items-center justify-center gap-1 text-gray-600">
                          <FiTruck size={14} />
                          <span>{p.printSpecs.deliveryDays} day{p.printSpecs.deliveryDays !== 1 ? 's' : ''}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.rating?.count > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          <FiStar size={14} className="text-yellow-400 fill-yellow-400" />
                          <span className="font-medium">{p.rating.average?.toFixed(1)}</span>
                          <span className="text-gray-400 text-xs">({p.rating.count})</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">No reviews</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        to={`/products/${p.slug}`}
                        className="inline-flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700"
                      >
                        Inquire <FiArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Card view for mobile */}
          <div className="md:hidden grid gap-4">
            {results.map((p, i) => (
              <div key={p._id} className={`card p-4 ${i === 0 ? 'border-green-400 border-2' : ''}`}>
                {i === 0 && (
                  <span className="inline-block mb-2 text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">Best Price</span>
                )}
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-800">{p.seller?.businessName || p.seller?.name}</p>
                    <p className="text-sm text-gray-600">{p.name}</p>
                  </div>
                  <p className="text-xl font-bold text-green-600">₹{p.price?.min?.toLocaleString()}</p>
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {p.printSpecs?.finish && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize">{p.printSpecs.finish}</span>}
                  {p.printSpecs?.paperWeight && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{p.printSpecs.paperWeight} gsm</span>}
                  {p.printSpecs?.deliveryDays && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{p.printSpecs.deliveryDays}-day delivery</span>}
                </div>
                <Link to={`/products/${p.slug}`} className="btn-primary w-full text-center text-sm mt-3 block">
                  Get Inquiry
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
