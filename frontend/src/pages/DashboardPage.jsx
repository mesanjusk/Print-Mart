import { Routes, Route, NavLink } from 'react-router-dom';
import {
  FiGrid, FiPackage, FiMessageSquare, FiHeart, FiUser,
  FiFileText, FiShoppingBag, FiImage, FiUsers, FiTag
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
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

const linkCls = ({ isActive }) =>
  `flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
    isActive ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-green-50 hover:text-green-700'
  }`;

export default function DashboardPage() {
  const { user } = useAuth();
  const isSeller = user?.role === 'seller';
  const isAdmin = user?.role === 'admin';
  const isBuyer = user?.role === 'buyer';

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-6">
      <div className="flex gap-6">
        {/* Desktop sidebar */}
        <aside className="w-56 flex-shrink-0 hidden md:block">
          <div className="card p-4 sticky top-20">
            <div className="text-center pb-4 border-b mb-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-2xl mx-auto mb-2">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <p className="font-semibold text-gray-800 text-sm">{user?.name}</p>
              <span className="badge bg-green-100 text-green-700 capitalize">{user?.role}</span>
            </div>
            <nav className="space-y-1">
              <NavLink to="/dashboard" end className={linkCls}><FiGrid /> Overview</NavLink>

              {isSeller && (
                <>
                  <NavLink to="/dashboard/products" className={linkCls}><FiPackage /> My Products</NavLink>
                  <NavLink to="/dashboard/offers" className={linkCls}><FiTag /> My Offers</NavLink>
                </>
              )}

              {isAdmin && (
                <NavLink to="/dashboard/products" className={linkCls}><FiPackage /> Products</NavLink>
              )}

              <NavLink to="/dashboard/inquiries" className={linkCls}><FiMessageSquare /> Inquiries</NavLink>
              <NavLink to="/dashboard/quotations" className={linkCls}><FiFileText /> Quotations</NavLink>
              <NavLink to="/dashboard/designs" className={linkCls}><FiImage /> My Designs</NavLink>

              {(isSeller || isAdmin) && (
                <NavLink to="/dashboard/orders" className={linkCls}><FiShoppingBag /> Manage Orders</NavLink>
              )}

              {isBuyer && (
                <NavLink to="/dashboard/my-orders" className={linkCls}><FiShoppingBag /> My Orders</NavLink>
              )}

              {!isSeller && !isAdmin && (
                <NavLink to="/dashboard/saved" className={linkCls}><FiHeart /> Saved</NavLink>
              )}

              <NavLink to="/dashboard/profile" className={linkCls}><FiUser /> Profile</NavLink>

              {isAdmin && (
                <>
                  <div className="pt-2 pb-1">
                    <p className="text-xs font-semibold text-gray-400 px-3 uppercase tracking-wide">Admin</p>
                  </div>
                  <NavLink to="/dashboard/admin/users" className={linkCls}><FiUsers /> Manage Users</NavLink>
                  <NavLink
                    to="/dashboard/whatsapp-admin"
                    className={linkCls}
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
                    </svg>
                    WhatsApp Admin
                  </NavLink>
                  <NavLink to="/dashboard/all-orders" className={linkCls}><FiShoppingBag /> All Orders</NavLink>
                  <NavLink to="/dashboard/bulk-import" className={linkCls}><FiUsers /> Bulk Import</NavLink>
                </>
              )}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-grow min-w-0">
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
                <Route path="whatsapp-admin" element={<WhatsAppAdmin />} />
                <Route path="all-orders" element={<ManageOrders />} />
                <Route path="bulk-import" element={<AdminBulk />} />
              </>
            )}
          </Routes>
        </div>
      </div>
    </div>
  );
}
