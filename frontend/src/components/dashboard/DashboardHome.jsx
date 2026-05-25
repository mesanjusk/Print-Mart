import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiPackage, FiMessageSquare, FiHeart, FiArrowRight,
  FiShoppingBag, FiFileText, FiActivity
} from 'react-icons/fi';
import { productAPI, inquiryAPI, supplierAPI, orderAPI, waAdminAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../common/Spinner';

export default function DashboardHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ products: 0, inquiries: 0, saved: 0, orders: 0, waMessages: 0 });
  const [loading, setLoading] = useState(true);

  const isSeller = user?.role === 'seller';
  const isAdmin = user?.role === 'admin';
  const isBuyer = user?.role === 'buyer';

  useEffect(() => {
    const fetches = [
      inquiryAPI.getBuyerInquiries().catch(() => ({ data: [] })),
      supplierAPI.getSaved().catch(() => ({ data: [] })),
    ];
    if (isSeller) fetches.push(productAPI.getMine().catch(() => ({ data: [] })));
    if (isSeller || isAdmin) fetches.push(orderAPI.getVendorOrders({ limit: 1 }).catch(() => ({ data: { total: 0 } })));
    if (isBuyer) fetches.push(orderAPI.getMyOrders({ limit: 1 }).catch(() => ({ data: { total: 0 } })));
    if (isAdmin) fetches.push(waAdminAPI.getStats().catch(() => ({ data: null })));

    Promise.all(fetches).then((results) => {
      const [inqRes, savedRes, ...rest] = results;
      const prodRes = isSeller ? rest[0] : null;
      const orderRes = (isSeller || isAdmin || isBuyer) ? rest[isSeller ? 1 : 0] : null;
      const waRes = isAdmin ? rest[rest.length - 1] : null;

      setStats({
        products: prodRes?.data?.length || 0,
        inquiries: inqRes?.data?.length || 0,
        saved: savedRes?.data?.length || 0,
        orders: orderRes?.data?.total || 0,
        waMessages: waRes?.data?.totalMessages || 0,
      });
      setLoading(false);
    });
  }, [user, isSeller, isAdmin, isBuyer]);

  if (loading) return <Spinner />;

  const buyerCards = [
    { icon: <FiMessageSquare size={22} />, count: stats.inquiries, label: 'My Inquiries', to: '/dashboard/inquiries', color: 'green' },
    { icon: <FiFileText size={22} />, count: '–', label: 'Quotations', to: '/dashboard/quotations', color: 'blue' },
    { icon: <FiShoppingBag size={22} />, count: stats.orders, label: 'My Orders', to: '/dashboard/my-orders', color: 'purple' },
    { icon: <FiHeart size={22} />, count: stats.saved, label: 'Saved', to: '/dashboard/saved', color: 'red' },
  ];

  const sellerCards = [
    { icon: <FiPackage size={22} />, count: stats.products, label: 'My Products', to: '/dashboard/products', color: 'blue' },
    { icon: <FiMessageSquare size={22} />, count: stats.inquiries, label: 'Inquiries', to: '/dashboard/inquiries', color: 'green' },
    { icon: <FiFileText size={22} />, count: '–', label: 'Quotations', to: '/dashboard/quotations', color: 'orange' },
    { icon: <FiShoppingBag size={22} />, count: stats.orders, label: 'Orders', to: '/dashboard/orders', color: 'purple' },
  ];

  const adminCards = [
    { icon: <FiShoppingBag size={22} />, count: stats.orders, label: 'All Orders', to: '/dashboard/all-orders', color: 'purple' },
    { icon: <FiMessageSquare size={22} />, count: stats.inquiries, label: 'Inquiries', to: '/dashboard/inquiries', color: 'green' },
    { icon: <FiActivity size={22} />, count: stats.waMessages, label: 'WA Messages', to: '/dashboard/whatsapp-admin', color: 'green' },
    { icon: <FiFileText size={22} />, count: '–', label: 'Quotations', to: '/dashboard/quotations', color: 'blue' },
  ];

  const cards = isAdmin ? adminCards : isSeller ? sellerCards : buyerCards;

  const colorMap = {
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">
        {isAdmin ? 'Admin Dashboard' : `Welcome, ${user?.name?.split(' ')[0]}`}
      </h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className="card p-5 hover:border-green-400 border transition-colors flex items-center gap-4"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${colorMap[card.color] || colorMap.green}`}>
              {card.icon}
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-gray-800">{card.count}</p>
              <p className="text-sm text-gray-500 truncate">{card.label}</p>
            </div>
            <FiArrowRight className="ml-auto text-gray-300 flex-shrink-0" />
          </Link>
        ))}
      </div>

      {/* WhatsApp Bot Info Banner */}
      <div className="card p-5 mb-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">
              Manage Everything via WhatsApp
            </h3>
            {isBuyer && (
              <p className="text-sm text-gray-600">
                Reply to inquiry notifications, <code className="bg-white rounded px-1 text-green-700 text-xs">ACCEPT</code> quotations,{' '}
                <code className="bg-white rounded px-1 text-green-700 text-xs">PAID PM-xxxx</code> to confirm payment,{' '}
                and <code className="bg-white rounded px-1 text-green-700 text-xs">TRACK PM-xxxx</code> to track orders — all from WhatsApp.
              </p>
            )}
            {isSeller && (
              <p className="text-sm text-gray-600">
                Reply to inquiries, send <code className="bg-white rounded px-1 text-green-700 text-xs">QUOTE 5000</code> to create a quotation,{' '}
                <code className="bg-white rounded px-1 text-green-700 text-xs">DISPATCH PM-xxxx TRK123</code> to mark dispatched,{' '}
                <code className="bg-white rounded px-1 text-green-700 text-xs">DELIVER PM-xxxx</code> when delivered — all from WhatsApp.
              </p>
            )}
            {isAdmin && (
              <p className="text-sm text-gray-600">
                Manage all WhatsApp conversations, send broadcasts, view analytics, and monitor the bot flow from the{' '}
                <Link to="/dashboard/whatsapp-admin" className="text-green-600 underline">WhatsApp Admin panel</Link>.
              </p>
            )}
          </div>
        </div>
      </div>

      {(isSeller || isAdmin) && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Quick Actions</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {isSeller && <Link to="/dashboard/products/new" className="btn-primary text-sm py-2">+ Add Product</Link>}
            <Link to="/dashboard/inquiries" className="btn-secondary text-sm py-2">View Inquiries</Link>
            <Link to={isSeller ? '/dashboard/orders' : '/dashboard/all-orders'} className="btn-secondary text-sm py-2">View Orders</Link>
            {isAdmin && <Link to="/dashboard/whatsapp-admin" className="btn-secondary text-sm py-2">WhatsApp Admin</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
