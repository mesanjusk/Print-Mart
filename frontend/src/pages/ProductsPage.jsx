import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FiFilter, FiX, FiChevronDown } from 'react-icons/fi';
import { productAPI, categoryAPI } from '../services/api';
import ProductCard from '../components/products/ProductCard';
import Spinner from '../components/common/Spinner';

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);

  const keyword = searchParams.get('keyword') || '';
  const category = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || '';
  const page = Number(searchParams.get('page')) || 1;
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await productAPI.getAll({ keyword, category, sort, page, minPrice, maxPrice });
      setProducts(Array.isArray(data.products) ? data.products : []);
      setPagination({ page: data.page || 1, pages: data.pages || 1, total: data.total || 0 });
    } finally {
      setLoading(false);
    }
  }, [keyword, category, sort, page, minPrice, maxPrice]);

  useEffect(() => {
    categoryAPI.getAll().then((r) => setCategories(Array.isArray(r.data) ? r.data : []));
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const updateFilter = (key, value) => {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value); else p.delete(key);
    p.delete('page');
    setSearchParams(p);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            {keyword ? `Results for "${keyword}"` : 'All Products'}
          </h1>
          <p className="text-sm text-gray-500">{pagination.total.toLocaleString()} products found</p>
        </div>
        <div className="flex gap-3 items-center">
          <select
            value={sort}
            onChange={(e) => updateFilter('sort', e.target.value)}
            className="input text-sm py-1.5 w-auto"
          >
            <option value="">Sort: Relevance</option>
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="popular">Most Popular</option>
          </select>
          <button onClick={() => setFilterOpen(!filterOpen)} className="md:hidden btn-secondary text-sm py-1.5 flex items-center gap-1">
            <FiFilter /> Filters
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Filters */}
        <aside className={`${filterOpen ? 'block' : 'hidden'} md:block w-56 flex-shrink-0`}>
          <div className="card p-4 sticky top-20">
            <h3 className="font-semibold text-gray-800 mb-3">Filters</h3>

            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Categories</h4>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                <button onClick={() => updateFilter('category', '')}
                  className={`block w-full text-left text-sm px-2 py-1 rounded ${!category ? 'text-orange-500 bg-orange-50' : 'text-gray-600 hover:bg-gray-50'}`}>
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button key={cat._id} onClick={() => updateFilter('category', cat._id)}
                    className={`block w-full text-left text-sm px-2 py-1 rounded ${category === cat._id ? 'text-orange-500 bg-orange-50' : 'text-gray-600 hover:bg-gray-50'}`}>
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Price Range (₹)</h4>
              <div className="flex gap-2">
                <input type="number" placeholder="Min" value={minPrice}
                  onChange={(e) => updateFilter('minPrice', e.target.value)}
                  className="input text-sm py-1 w-full" />
                <input type="number" placeholder="Max" value={maxPrice}
                  onChange={(e) => updateFilter('maxPrice', e.target.value)}
                  className="input text-sm py-1 w-full" />
              </div>
            </div>

            <button onClick={() => setSearchParams({})}
              className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1">
              <FiX size={14} /> Clear all filters
            </button>
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-grow">
          {loading ? (
            <div className="py-16"><Spinner size="lg" /></div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-2xl text-gray-300 mb-4">🔍</p>
              <h3 className="text-lg font-medium text-gray-600">No products found</h3>
              <p className="text-gray-400 text-sm mt-1">Try different keywords or filters</p>
              <button onClick={() => setSearchParams({})} className="btn-primary mt-4 text-sm">Clear filters</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((p) => <ProductCard key={p._id} product={p} />)}
              </div>

              {pagination.pages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                    <button key={p} onClick={() => updateFilter('page', p)}
                      className={`w-9 h-9 rounded text-sm font-medium ${p === pagination.page ? 'bg-orange-500 text-white' : 'bg-white border text-gray-600 hover:border-orange-400'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
