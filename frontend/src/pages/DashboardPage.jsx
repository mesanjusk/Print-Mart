import { useState } from 'react';
import { Routes, Route, NavLink, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Package, Tag, MessageSquare, FileText,
  ShoppingBag, Image, Users, List, User, Heart, Menu, X,
  ChevronRight, Settings, LogOut, MessageCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { Avatar } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import DashboardHome from '../components/dashboard/DashboardHome';
import ManageProducts from '../components/dashboard/ManageProducts';
import ManageOffers from '../components/dashboard/ManageOffers';
import Inquiries from '../components/dashboard/Inquiries';
import SavedProducts from '../components/dashboard/SavedProducts';
import ProfileSettings from '../components/dashboard/ProfileSettings';
import Quotations from '../components/dashboard/Quotations';
import ManageOrders from '../components/dashboard/ManageOrders';
import MyOrders from '../components/dashboard/MyOrders';
import WhatsAppAdmin from '../components/dashboard/WhatsAppAdmin';
import DesignLibrary from '../components/dashboard/DesignLibrary';
import AdminUsers from '../components/dashboard/AdminUsers';
import AdminBulk from '../components/dashboard/AdminBulk';
import ManageCategories from '../components/dashboard/ManageCategories';

function SidebarLink({ to, end, icon: Icon, label, badge }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
          isActive
            ? 'bg-primary-600 text-white shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
        )
      }
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <Badge variant="secondary" size="sm" className="text-2xs ml-auto">
          {badge}
        </Badge>
      )}
    </NavLink>
  );
}

function SidebarSection({ label, children }) {
  return (
    <div>
      <p className="px-3 mb-1 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Sidebar({ user, onClose }) {
  const { logout } = useAuth();
  const isSeller = user?.role === 'seller';
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isBuyer = user?.role === 'buyer';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2 mb-4" onClick={onClose}>
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">PM</span>
          </div>
          <span className="font-bold text-foreground">PrintMart</span>
        </Link>

        {/* User info */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
          <Avatar name={user?.name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
          {user?.plan === 'premium' && (
            <Badge className="text-2xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex-shrink-0">
              PRO
            </Badge>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        <SidebarSection label="Main">
          <SidebarLink to="/dashboard" end icon={LayoutDashboard} label="Overview" />
        </SidebarSection>

        {(isSeller || isAdmin) && (
          <SidebarSection label="Seller">
            <SidebarLink to="/dashboard/products" icon={Package} label="Products" />
            {isSeller && <SidebarLink to="/dashboard/offers" icon={Tag} label="My Offers" />}
            <SidebarLink to="/dashboard/orders" icon={ShoppingBag} label="Orders" />
          </SidebarSection>
        )}

        <SidebarSection label="Activity">
          <SidebarLink to="/dashboard/inquiries" icon={MessageSquare} label="Inquiries" />
          <SidebarLink to="/dashboard/quotations" icon={FileText} label="Quotations" />
          <SidebarLink to="/dashboard/designs" icon={Image} label="Design Library" />
          {isBuyer && <SidebarLink to="/dashboard/my-orders" icon={ShoppingBag} label="My Orders" />}
          {!isAdmin && <SidebarLink to="/dashboard/saved" icon={Heart} label="Saved Products" />}
        </SidebarSection>

        {isAdmin && (
          <SidebarSection label="Admin">
            <SidebarLink to="/dashboard/admin/users" icon={Users} label="Users" />
            <SidebarLink to="/dashboard/admin/categories" icon={List} label="Categories" />
            <SidebarLink to="/dashboard/whatsapp-admin" icon={MessageCircle} label="WhatsApp Admin" />
            <SidebarLink to="/dashboard/all-orders" icon={ShoppingBag} label="All Orders" />
            <SidebarLink to="/dashboard/bulk-import" icon={Users} label="Bulk Import" />
          </SidebarSection>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border space-y-0.5">
        <SidebarLink to="/dashboard/profile" icon={Settings} label="Settings" />
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isSeller = user?.role === 'seller';
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isBuyer = user?.role === 'buyer';

  return (
    <div className="flex h-[calc(100vh-var(--navbar-height,0px))] bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-border bg-background flex-shrink-0 sticky top-[var(--navbar-height,0px)] h-[calc(100vh-57px)] overflow-hidden">
        <Sidebar user={user} onClose={() => {}} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-background z-50 md:hidden shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <span className="font-bold text-foreground">Menu</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <Sidebar user={user} onClose={() => setSidebarOpen(false)} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="md:hidden sticky top-0 z-30 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-foreground">Dashboard</span>
        </div>

        <div className="p-4 md:p-6 lg:p-8 min-h-full">
          <Routes>
            <Route index element={<DashboardHome />} />
            {(isSeller || isAdmin) && <Route path="products/*" element={<ManageProducts />} />}
            {isSeller && <Route path="offers" element={<ManageOffers />} />}
            <Route path="inquiries" element={<Inquiries />} />
            <Route path="quotations" element={<Quotations />} />
            <Route path="designs" element={<DesignLibrary />} />
            {(isSeller || isAdmin) && <Route path="orders" element={<ManageOrders />} />}
            {isBuyer && <Route path="my-orders" element={<MyOrders />} />}
            <Route path="saved" element={<SavedProducts />} />
            <Route path="profile" element={<ProfileSettings />} />
            {isAdmin && (
              <>
                <Route path="admin/users" element={<AdminUsers />} />
                <Route path="admin/categories" element={<ManageCategories />} />
                <Route path="whatsapp-admin" element={<WhatsAppAdmin />} />
                <Route path="all-orders" element={<ManageOrders />} />
                <Route path="bulk-import" element={<AdminBulk />} />
              </>
            )}
          </Routes>
        </div>
      </main>
    </div>
  );
}
