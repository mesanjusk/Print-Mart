import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MapPin, BadgeCheck, ArrowRight, Store } from 'lucide-react';
import { supplierAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar } from '../components/ui/avatar';
import { SkeletonCard } from '../components/ui/skeleton';
import { cn } from '../lib/utils';

function SupplierCard({ supplier }) {
  return (
    <Link to={`/suppliers/${supplier._id}`}>
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-card-hover hover:border-primary-200 dark:hover:border-primary-800 transition-all duration-200 h-full flex flex-col"
      >
        <div className="flex items-start gap-3 mb-4">
          <Avatar name={supplier.businessName || supplier.name} size="lg" />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground truncate">{supplier.businessName || supplier.name}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              {supplier.isVerified !== false && (
                <Badge variant="success" className="text-2xs gap-1">
                  <BadgeCheck className="h-3 w-3" /> Verified
                </Badge>
              )}
              {supplier.plan === 'premium' && (
                <Badge className="text-2xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">PRO</Badge>
              )}
            </div>
          </div>
        </div>

        {supplier.address?.city && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-2">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            {supplier.address.city}{supplier.address.state ? `, ${supplier.address.state}` : ''}
          </p>
        )}

        {supplier.gstin && (
          <p className="text-xs text-muted-foreground/70 mb-3">GST: {supplier.gstin}</p>
        )}

        {supplier.productCount > 0 && (
          <p className="text-xs text-muted-foreground mb-3">{supplier.productCount} products listed</p>
        )}

        <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Since {new Date(supplier.createdAt).getFullYear()}
          </span>
          <span className="text-xs font-medium text-primary-600 dark:text-primary-400 flex items-center gap-1 group-hover:gap-2 transition-all">
            View Profile <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </motion.div>
    </Link>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');

  const page = Number(searchParams.get('page')) || 1;
  const search = searchParams.get('keyword') || '';

  useEffect(() => {
    setLoading(true);
    supplierAPI.getAll({ keyword: search, page })
      .then((r) => {
        setSuppliers(Array.isArray(r.data.suppliers) ? r.data.suppliers : []);
        setPagination({ page: r.data.page || 1, pages: r.data.pages || 1, total: r.data.total || 0 });
      })
      .catch(() => setSuppliers([]))
      .finally(() => setLoading(false));
  }, [search, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (keyword) p.set('keyword', keyword);
    setSearchParams(p);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-950 to-gray-900 text-white py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-3">
              Find Verified Print Suppliers
            </h1>
            <p className="text-gray-400 text-lg mb-8">
              Connect with {pagination.total || '1,000+'}+ verified printing suppliers across India
            </p>
            <form onSubmit={handleSearch} className="flex gap-2 max-w-lg mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Search by company name or product..."
                  className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 px-6 flex-shrink-0">
                Search
              </Button>
            </form>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading…' : `${pagination.total.toLocaleString()} suppliers found`}
          </p>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="flex gap-3">
                  <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : suppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Store className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No suppliers found</h3>
            <p className="text-muted-foreground text-sm">Try adjusting your search terms.</p>
          </div>
        ) : (
          <>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {suppliers.map((s) => (
                <motion.div key={s._id} variants={itemVariants}>
                  <SupplierCard supplier={s} />
                </motion.div>
              ))}
            </motion.div>

            {pagination.pages > 1 && (
              <div className="flex justify-center gap-1.5 mt-10">
                {Array.from({ length: Math.min(pagination.pages, 10) }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      const sp = new URLSearchParams(searchParams);
                      sp.set('page', p);
                      setSearchParams(sp);
                    }}
                    className={cn(
                      'h-9 w-9 rounded-lg text-sm font-medium transition-all',
                      p === pagination.page
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-card border border-border text-muted-foreground hover:border-primary-400'
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
  );
}
