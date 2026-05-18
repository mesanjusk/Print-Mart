import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPackage, FiMessageSquare, FiHeart, FiArrowRight } from 'react-icons/fi';
import { productAPI, inquiryAPI, supplierAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../common/Spinner';
import PremiumBanner from './PremiumBanner';
import NotificationSetup from './NotificationSetup';

export default function DashboardHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ products: 0, inquiries: 0, saved: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetches = [
      inquiryAPI.getBuyerInquiries().catch(() => ({ data: [] })),
      supplierAPI.getSaved().catch(() => ({ data: [] })),
    ];
    if (user?.role === 'seller') fetches.push(productAPI.getMine().catch(() => ({ data: [] })));

    Promise.all(fetches).then(([inqRes, savedRes, prodRes]) => {
      setStats({
        products: prodRes?.data?.length || 0,
        inquiries: inqRes?.data?.length || 0,
        saved: savedRes?.data?.length || 0,
      });
      setLoading(false);
    });
  }, [user]);

  if (loading) return <Spinner />;

  const cards = [
    ...(user?.role === 'seller' ? [{ icon: <FiPackage size={24} />, count: stats.products, label: 'My Products', to: '/dashboard/products', color: 'blue' }] : []),
    { icon: <FiMessageSquare size={24} />, count: stats.inquiries, label: 'Inquiries', to: '/dashboard/inquiries', color: 'green' },
    { icon: <FiHeart size={24} />, count: stats.saved, label: 'Saved Products', to: '/dashboard/saved', color: 'red' },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">Dashboard</h1>
      <PremiumBanner />
      {user?.role === 'seller' && <NotificationSetup />}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map((card) => (
          <Link key={card.label} to={card.to} className="card p-5 hover:border-green-400 border transition-colors flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${card.color === 'green' ? 'bg-green-100 text-green-700' : card.color === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
              {card.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{card.count}</p>
              <p className="text-sm text-gray-500">{card.label}</p>
            </div>
            <FiArrowRight className="ml-auto text-gray-300" />
          </Link>
        ))}
      </div>

      {user?.role === 'seller' && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Quick Actions</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/dashboard/products/new" className="btn-primary text-sm py-2">+ Add Product</Link>
            <Link to="/dashboard/inquiries" className="btn-secondary text-sm py-2">View Inquiries</Link>
          </div>
        </div>
      )}
    </div>
  );
}
