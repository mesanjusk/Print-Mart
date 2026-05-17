import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiMapPin, FiPhone, FiMail, FiCalendar } from 'react-icons/fi';
import { supplierAPI } from '../services/api';
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

  if (loading) return <div className="py-20"><Spinner size="lg" /></div>;
  if (!data) return <div className="text-center py-20 text-gray-500">Supplier not found</div>;

  const { supplier, products } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="card p-6 mb-8">
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-3xl flex-shrink-0">
            {(supplier.businessName || supplier.name)?.[0]?.toUpperCase()}
          </div>
          <div className="flex-grow">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-800">{supplier.businessName || supplier.name}</h1>
              <span className="badge bg-green-100 text-green-700">Verified Supplier</span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              {supplier.address?.city && (
                <span className="flex items-center gap-1"><FiMapPin size={14} /> {supplier.address.city}, {supplier.address.state}</span>
              )}
              {supplier.phone && (
                <span className="flex items-center gap-1"><FiPhone size={14} /> {supplier.phone}</span>
              )}
              {supplier.email && (
                <span className="flex items-center gap-1"><FiMail size={14} /> {supplier.email}</span>
              )}
              <span className="flex items-center gap-1">
                <FiCalendar size={14} /> Member since {new Date(supplier.createdAt).getFullYear()}
              </span>
            </div>
            {supplier.gstin && (
              <p className="text-sm text-gray-500 mt-2">GSTIN: {supplier.gstin}</p>
            )}
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-800 mb-4">Products by this Supplier ({products.length})</h2>
      {products.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-3">📦</p>
          <p>No products listed yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {products.map((p) => <ProductCard key={p._id} product={p} />)}
        </div>
      )}
    </div>
  );
}
