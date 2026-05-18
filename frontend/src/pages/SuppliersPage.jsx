import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiSearch, FiMapPin, FiPackage } from 'react-icons/fi';
import { supplierAPI } from '../services/api';
import Spinner from '../components/common/Spinner';

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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Find Suppliers</h1>

      <form onSubmit={handleSearch} className="flex gap-3 mb-8 max-w-lg">
        <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search by company or product..." className="input flex-grow" />
        <button type="submit" className="btn-primary px-6">Search</button>
      </form>

      <p className="text-sm text-gray-500 mb-4">{pagination.total} suppliers found</p>

      {loading ? (
        <div className="py-16"><Spinner size="lg" /></div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-4">🏭</p>
          <p className="text-lg">No suppliers found</p>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {suppliers.map((s) => (
              <Link key={s._id} to={`/suppliers/${s._id}`} className="card p-5 hover:border-orange-300 border transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-xl flex-shrink-0">
                    {(s.businessName || s.name)?.[0]?.toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-gray-800 truncate">{s.businessName || s.name}</h3>
                    <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">Verified</span>
                  </div>
                </div>
                {s.address?.city && (
                  <p className="text-sm text-gray-500 flex items-center gap-1 mb-2">
                    <FiMapPin size={13} /> {s.address.city}, {s.address.state}
                  </p>
                )}
                {s.gstin && (
                  <p className="text-xs text-gray-400 mb-2">GSTIN: {s.gstin}</p>
                )}
                <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-gray-400">
                  <span>Member since {new Date(s.createdAt).getFullYear()}</span>
                  <span className="text-orange-500 font-medium">View Profile →</span>
                </div>
              </Link>
            ))}
          </div>

          {pagination.pages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => { const sp = new URLSearchParams(searchParams); sp.set('page', p); setSearchParams(sp); }}
                  className={`w-9 h-9 rounded text-sm font-medium ${p === pagination.page ? 'bg-orange-500 text-white' : 'bg-white border text-gray-600 hover:border-orange-400'}`}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
