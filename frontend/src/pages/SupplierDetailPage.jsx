import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Calendar, BadgeCheck, Package, ArrowLeft } from 'lucide-react';
import { supplierAPI } from '../services/api';
import { Avatar } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import ProductCard from '../components/products/ProductCard';
import Spinner from '../components/common/Spinner';

export default function SupplierDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supplierAPI.getById(id)
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="py-20 flex justify-center"><Spinner size="lg" /></div>;
  if (!data) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <Package className="h-16 w-16 text-muted-foreground/30 mb-4" />
      <h2 className="text-xl font-semibold text-foreground mb-2">Supplier not found</h2>
      <Link to="/suppliers" className="text-primary-600 dark:text-primary-400 text-sm hover:underline">← Back to suppliers</Link>
    </div>
  );

  const { supplier, products } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-gray-950 to-gray-900 text-white py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <Link to="/suppliers" className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> All Suppliers
          </Link>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row gap-5 items-start"
          >
            <Avatar name={supplier.businessName || supplier.name} size="2xl" className="flex-shrink-0" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{supplier.businessName || supplier.name}</h1>
                {supplier.isVerified !== false && (
                  <Badge variant="success" className="gap-1 text-xs">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified
                  </Badge>
                )}
                {supplier.plan === 'premium' && (
                  <Badge className="text-xs bg-amber-100 text-amber-700 border-0">PRO Seller</Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                {supplier.address?.city && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {supplier.address.city}{supplier.address.state ? `, ${supplier.address.state}` : ''}
                  </span>
                )}
                {supplier.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> {supplier.phone}
                  </span>
                )}
                {supplier.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> {supplier.email}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Member since {new Date(supplier.createdAt).getFullYear()}
                </span>
              </div>
              {supplier.gstin && (
                <p className="text-sm text-gray-500 mt-2">GSTIN: {supplier.gstin}</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xl font-bold text-foreground">Products</h2>
          <Badge variant="secondary">{products.length}</Badge>
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Package className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No products listed yet</h3>
            <p className="text-muted-foreground text-sm">This supplier hasn't added any products.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
