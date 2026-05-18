import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiSearch, FiArrowRight, FiTruck, FiShield, FiAward, FiUsers } from 'react-icons/fi';
import { categoryAPI, productAPI } from '../services/api';
import ProductCard from '../components/products/ProductCard';
import Spinner from '../components/common/Spinner';

const CATEGORY_ICONS = {
  Electronics: '⚡',
  Textiles: '👔',
  Industrial: '🏭',
  Chemicals: '🧪',
  Furniture: '🪑',
  Agriculture: '🌾',
  Automotive: '🚗',
  Healthcare: '🏥',
  'Food & Beverages': '🍽️',
  Construction: '🏗️',
};

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([categoryAPI.getAll(), productAPI.getFeatured()])
      .then(([catRes, prodRes]) => {
        const cats = Array.isArray(catRes.data) ? catRes.data : [];
        const prods = Array.isArray(prodRes.data) ? prodRes.data : [];
        setCategories(cats.slice(0, 10));
        setFeatured(prods);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/products?keyword=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-orange-500 to-orange-600 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            India's Largest B2B Marketplace
          </h1>
          <p className="text-lg md:text-xl opacity-90 mb-8">
            Connect with millions of verified suppliers and buyers across India
          </p>
          <form onSubmit={handleSearch} className="flex max-w-2xl mx-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for products or suppliers..."
              className="flex-grow px-5 py-3 text-gray-800 rounded-l-lg outline-none text-base"
            />
            <button type="submit" className="bg-gray-900 hover:bg-gray-800 px-6 py-3 rounded-r-lg flex items-center gap-2 font-semibold transition-colors">
              <FiSearch /> Search
            </button>
          </form>
          <div className="flex flex-wrap justify-center gap-2 mt-4 text-sm opacity-80">
            {['Electronics', 'Textiles', 'Industrial Machinery', 'Chemicals', 'Furniture'].map((t) => (
              <Link key={t} to={`/products?keyword=${t}`} className="hover:opacity-100 underline">{t}</Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: <FiUsers size={24} />, count: '10M+', label: 'Registered Users' },
            { icon: <FiAward size={24} />, count: '5M+', label: 'Products Listed' },
            { icon: <FiTruck size={24} />, count: '99%', label: 'On-time Delivery' },
            { icon: <FiShield size={24} />, count: '100%', label: 'Verified Sellers' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-2">
              <div className="text-orange-500">{stat.icon}</div>
              <p className="text-2xl font-bold text-gray-800">{stat.count}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Browse by Category</h2>
            <Link to="/products" className="text-orange-500 hover:text-orange-600 flex items-center gap-1 text-sm font-medium">
              View All <FiArrowRight />
            </Link>
          </div>
          {loading ? (
            <Spinner />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {categories.map((cat) => (
                <Link
                  key={cat._id}
                  to={`/products?category=${cat._id}`}
                  className="card p-4 text-center hover:border-orange-300 border transition-colors"
                >
                  <div className="text-3xl mb-2">{CATEGORY_ICONS[cat.name] || '📦'}</div>
                  <p className="text-sm font-medium text-gray-700">{cat.name}</p>
                  {cat.subcategories?.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">{cat.subcategories.length} sub-categories</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Products */}
      {featured.length > 0 && (
        <section className="py-10 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Featured Products</h2>
              <Link to="/products?sort=popular" className="text-orange-500 hover:text-orange-600 flex items-center gap-1 text-sm font-medium">
                See All <FiArrowRight />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {featured.slice(0, 12).map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-12 px-4 bg-orange-500 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Start Selling on IndiaMart Today</h2>
          <p className="text-lg opacity-90 mb-6">Join 5 million+ suppliers and reach crores of buyers across India</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register?role=seller" className="bg-white text-orange-500 font-bold py-3 px-8 rounded-lg hover:bg-orange-50 transition-colors">
              Register as Seller
            </Link>
            <Link to="/suppliers" className="bg-transparent border-2 border-white text-white font-bold py-3 px-8 rounded-lg hover:bg-orange-600 transition-colors">
              Find Suppliers
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
