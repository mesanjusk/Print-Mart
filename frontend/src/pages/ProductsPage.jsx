import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, ChevronDown, Search, SlidersHorizontal, Package } from 'lucide-react';
import { productAPI, categoryAPI } from '../services/api';
import ProductCard from '../components/products/ProductCard';
import { SkeletonCard } from '../components/ui/skeleton';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';

const SORT_OPTIONS = [
  { value: '', label: 'Relevance' },
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'popular', label: 'Most Popular' },
];

function FilterSidebar({ categories, category, minPrice, maxPrice, onUpdate, onClear }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Categories</p>
        <div className="space-y-0.5 max-h-64 overflow-y-auto no-scrollbar">
          <button
            onClick={() => onUpdate('category', '')}
            className={cn(
              'flex items-center justify-between w-full text-left text-sm px-3 py-2 rounded-lg transition-colors',
              !category
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400 font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            All Categories
            {!category && <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => onUpdate('category', cat._id)}
              className={cn(
                'flex items-center justify-between w-full text-left text-sm px-3 py-2 rounded-lg transition-colors',
                category === cat._id
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400 font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <span className="truncate">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Price Range (₹)</p>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => onUpdate('minPrice', e.target.value)}
            className="input text-sm h-9 w-full"
          />
          <input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => onUpdate('maxPrice', e.target.value)}
            className="input text-sm h-9 w-full"
          />
        </div>
      </div>

      <button
        onClick={onClear}
        className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 dark:text-red-400 transition-colors"
      >
        <X className="h-3.5 w-3.5" /> Clear all filters
      </button>
    </div>
  );
}

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

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const updateFilter = (key, value) => {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value); else p.delete(key);
    p.delete('page');
    setSearchParams(p);
  };

  const activeFilters = [
    category && categories.find((c) => c._id === category)?.name,
    minPrice && `Min ₹${minPrice}`,
    maxPrice && `Max ₹${maxPrice}`,
  ].filter(Boolean);

  const activeSort = SORT_OPTIONS.find((o) => o.value === sort);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background sticky top-[var(--navbar-height,57px)] z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <h1 className="text-base font-bold text-foreground truncate">
                {keyword ? `"${keyword}"` : 'All Products'}
              </h1>
              {!loading && (
                <span className="text-sm text-muted-foreground flex-shrink-0">
                  {pagination.total.toLocaleString()} products
                </span>
              )}
              {activeFilters.map((f) => (
                <Badge key={f} variant="secondary" className="hidden sm:flex flex-shrink-0 text-xs">
                  {f}
                </Badge>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <select
                value={sort}
                onChange={(e) => updateFilter('sort', e.target.value)}
                className="h-9 px-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring hidden sm:block"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterOpen(!filterOpen)}
                className="md:hidden gap-1.5"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filter
                {activeFilters.length > 0 && (
                  <Badge className="h-4 w-4 p-0 flex items-center justify-center text-2xs bg-primary-600 text-white">
                    {activeFilters.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-6">
          {/* Desktop sidebar */}
          <aside className="hidden md:block w-56 flex-shrink-0">
            <div className="rounded-xl border border-border bg-card p-4 sticky top-[110px]">
              <div className="flex items-center gap-2 mb-5">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Filters</span>
              </div>
              <FilterSidebar
                categories={categories}
                category={category}
                minPrice={minPrice}
                maxPrice={maxPrice}
                onUpdate={updateFilter}
                onClear={() => setSearchParams({})}
              />
            </div>
          </aside>

          {/* Mobile filter drawer */}
          <AnimatePresence>
            {filterOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/40 z-40 md:hidden"
                  onClick={() => setFilterOpen(false)}
                />
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="fixed left-0 top-0 bottom-0 w-72 bg-background z-50 shadow-2xl md:hidden p-4 overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-5">
                    <span className="font-semibold text-foreground">Filters</span>
                    <button onClick={() => setFilterOpen(false)} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <FilterSidebar
                    categories={categories}
                    category={category}
                    minPrice={minPrice}
                    maxPrice={maxPrice}
                    onUpdate={(k, v) => { updateFilter(k, v); setFilterOpen(false); }}
                    onClear={() => { setSearchParams({}); setFilterOpen(false); }}
                  />
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Products */}
          <div className="flex-grow min-w-0">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : products.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-24 text-center"
              >
                <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Package className="h-10 w-10 text-muted-foreground/40" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">No products found</h3>
                <p className="text-muted-foreground text-sm max-w-xs">
                  Try adjusting your search or filters to find what you&apos;re looking for.
                </p>
                <Button onClick={() => setSearchParams({})} variant="outline" size="sm" className="mt-4">
                  Clear all filters
                </Button>
              </motion.div>
            ) : (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
                >
                  {products.map((p, i) => (
                    <motion.div
                      key={p._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.25 }}
                    >
                      <ProductCard product={p} />
                    </motion.div>
                  ))}
                </motion.div>

                {pagination.pages > 1 && (
                  <div className="flex justify-center gap-1.5 mt-8">
                    {Array.from({ length: Math.min(pagination.pages, 10) }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => updateFilter('page', p)}
                        className={cn(
                          'h-9 w-9 rounded-lg text-sm font-medium transition-all',
                          p === pagination.page
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'bg-card border border-border text-muted-foreground hover:border-primary-400 hover:text-foreground'
                        )}
                      >
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
    </div>
  );
}
