import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package, MessageSquare, Heart, ArrowRight,
  ShoppingBag, FileText, MessageCircle, TrendingUp,
  Plus, Activity, Zap
} from 'lucide-react';
import { productAPI, inquiryAPI, supplierAPI, orderAPI, waAdminAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { StatCard } from '../ui/stat-card';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import PremiumBanner from './PremiumBanner';
import NotificationSetup from './NotificationSetup';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function DashboardHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ products: 0, inquiries: 0, saved: 0, orders: 0, waMessages: 0 });
  const [loading, setLoading] = useState(true);

  const isSeller = user?.role === 'seller';
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
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

  const firstName = user?.name?.split(' ')[0] || 'there';

  const statCards = isAdmin
    ? [
        { title: 'All Orders', value: stats.orders, icon: ShoppingBag, to: '/dashboard/all-orders', iconColor: 'text-purple-600', iconBg: 'bg-purple-50 dark:bg-purple-900/20' },
        { title: 'Inquiries', value: stats.inquiries, icon: MessageSquare, to: '/dashboard/inquiries', iconColor: 'text-green-600', iconBg: 'bg-green-50 dark:bg-green-900/20' },
        { title: 'WA Messages', value: stats.waMessages, icon: MessageCircle, to: '/dashboard/whatsapp-admin', iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50 dark:bg-emerald-900/20' },
        { title: 'Quotations', value: '—', icon: FileText, to: '/dashboard/quotations', iconColor: 'text-blue-600', iconBg: 'bg-blue-50 dark:bg-blue-900/20' },
      ]
    : isSeller
    ? [
        { title: 'My Products', value: stats.products, icon: Package, to: '/dashboard/products', iconColor: 'text-blue-600', iconBg: 'bg-blue-50 dark:bg-blue-900/20' },
        { title: 'Inquiries', value: stats.inquiries, icon: MessageSquare, to: '/dashboard/inquiries', iconColor: 'text-green-600', iconBg: 'bg-green-50 dark:bg-green-900/20' },
        { title: 'Quotations', value: '—', icon: FileText, to: '/dashboard/quotations', iconColor: 'text-orange-600', iconBg: 'bg-orange-50 dark:bg-orange-900/20' },
        { title: 'Orders', value: stats.orders, icon: ShoppingBag, to: '/dashboard/orders', iconColor: 'text-purple-600', iconBg: 'bg-purple-50 dark:bg-purple-900/20' },
      ]
    : [
        { title: 'My Inquiries', value: stats.inquiries, icon: MessageSquare, to: '/dashboard/inquiries', iconColor: 'text-green-600', iconBg: 'bg-green-50 dark:bg-green-900/20' },
        { title: 'Quotations', value: '—', icon: FileText, to: '/dashboard/quotations', iconColor: 'text-blue-600', iconBg: 'bg-blue-50 dark:bg-blue-900/20' },
        { title: 'My Orders', value: stats.orders, icon: ShoppingBag, to: '/dashboard/my-orders', iconColor: 'text-purple-600', iconBg: 'bg-purple-50 dark:bg-purple-900/20' },
        { title: 'Saved', value: stats.saved, icon: Heart, to: '/dashboard/saved', iconColor: 'text-red-600', iconBg: 'bg-red-50 dark:bg-red-900/20' },
      ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isAdmin ? 'Admin Overview' : `Welcome back, ${firstName} 👋`}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isAdmin ? 'Here\'s what\'s happening on your platform.' : 'Here\'s a summary of your activity.'}
          </p>
        </div>
        {isSeller && (
          <Link to="/dashboard/products/new">
            <Button size="sm" className="flex-shrink-0">
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          </Link>
        )}
      </div>

      {/* Banners */}
      <PremiumBanner />
      {isSeller && <NotificationSetup />}

      {/* Stats */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-6">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {statCards.map((card) => (
            <motion.div key={card.title} variants={itemVariants}>
              <Link to={card.to} className="block group">
                <StatCard
                  title={card.title}
                  value={card.value}
                  icon={card.icon}
                  iconColor={card.iconColor}
                  iconBg={card.iconBg}
                  className="hover:shadow-card-hover hover:border-primary-200 dark:hover:border-primary-800 cursor-pointer transition-all"
                />
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* WhatsApp info */}
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 p-5">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="h-5 w-5 text-white fill-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground mb-1">Manage via WhatsApp</h3>
            {isBuyer && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                Reply to inquiry notifications,{' '}
                <code className="bg-white dark:bg-gray-900 rounded px-1.5 py-0.5 text-green-700 dark:text-green-400 text-xs font-mono">ACCEPT</code>{' '}
                quotations, and{' '}
                <code className="bg-white dark:bg-gray-900 rounded px-1.5 py-0.5 text-green-700 dark:text-green-400 text-xs font-mono">TRACK PM-xxxx</code>{' '}
                to track orders — all from WhatsApp.
              </p>
            )}
            {isSeller && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                Reply to inquiries, send{' '}
                <code className="bg-white dark:bg-gray-900 rounded px-1.5 py-0.5 text-green-700 dark:text-green-400 text-xs font-mono">QUOTE 5000</code>{' '}
                to create quotations, and{' '}
                <code className="bg-white dark:bg-gray-900 rounded px-1.5 py-0.5 text-green-700 dark:text-green-400 text-xs font-mono">DISPATCH PM-xxxx TRK123</code>{' '}
                when dispatched.
              </p>
            )}
            {isAdmin && (
              <p className="text-sm text-muted-foreground">
                Manage conversations, send broadcasts, and view bot analytics from the{' '}
                <Link to="/dashboard/whatsapp-admin" className="text-primary-600 dark:text-primary-400 underline font-medium">
                  WhatsApp Admin
                </Link>{' '}
                panel.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      {(isSeller || isAdmin) && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary-600" /> Quick Actions
          </h2>
          <div className="flex flex-wrap gap-2">
            {isSeller && (
              <Link to="/dashboard/products/new">
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5" /> Add Product
                </Button>
              </Link>
            )}
            <Link to="/dashboard/inquiries">
              <Button variant="outline" size="sm">View Inquiries</Button>
            </Link>
            <Link to={isSeller ? '/dashboard/orders' : '/dashboard/all-orders'}>
              <Button variant="outline" size="sm">View Orders</Button>
            </Link>
            {isAdmin && (
              <Link to="/dashboard/whatsapp-admin">
                <Button variant="outline" size="sm">WhatsApp Admin</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
