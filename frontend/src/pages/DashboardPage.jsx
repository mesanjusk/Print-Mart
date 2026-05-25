import { Routes, Route, NavLink } from 'react-router-dom';
import {
  FiGrid, FiPackage, FiMessageSquare, FiHeart, FiUser,
  FiFileText, FiShoppingBag, FiMessageCircle
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import DashboardHome from '../components/dashboard/DashboardHome';
import ManageProducts from '../components/dashboard/ManageProducts';
import Inquiries from '../components/dashboard/Inquiries';
import SavedProducts from '../components/dashboard/SavedProducts';
import ProfileSettings from '../components/dashboard/ProfileSettings';
import Quotations from '../components/dashboard/Quotations';
import ManageOrders from '../components/dashboard/ManageOrders';
import MyOrders from '../components/dashboard/MyOrders';
import WhatsAppAdmin from '../components/dashboard/WhatsAppAdmin';

const NavItem = ({ to, icon, label, exact }) => (
  <NavLink
    to={to}
    end={exact}
    className={({ isActive }) =>
      `flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
        isActive ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-green-50 hover:text-green-700'
      }`
    }
  >
    {icon} {label}
  </NavLink>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const isSeller = user?.role === 'seller';
  const isAdmin = user?.role === 'admin';

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex gap-6">
        {/* Sidebar */}
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
              <NavItem to="/dashboard" icon={<FiGrid />} label="Overview" exact />

              {(isSeller || isAdmin) && (
                <NavItem to="/dashboard/products" icon={<FiPackage />} label="My Products" />
              )}

              <NavItem to="/dashboard/inquiries" icon={<FiMessageSquare />} label="Inquiries" />
              <NavItem to="/dashboard/quotations" icon={<FiFileText />} label="Quotations" />

              {(isSeller || isAdmin) && (
                <NavItem to="/dashboard/orders" icon={<FiShoppingBag />} label="Manage Orders" />
              )}

              {!(isSeller || isAdmin) && (
                <NavItem to="/dashboard/my-orders" icon={<FiShoppingBag />} label="My Orders" />
              )}

              {!isSeller && !isAdmin && (
                <NavItem to="/dashboard/saved" icon={<FiHeart />} label="Saved" />
              )}

              <NavItem to="/dashboard/profile" icon={<FiUser />} label="Profile" />

              {isAdmin && (
                <>
                  <div className="pt-2 pb-1">
                    <p className="text-xs font-semibold text-gray-400 px-3 uppercase tracking-wide">Admin</p>
                  </div>
                  <NavItem
                    to="/dashboard/whatsapp-admin"
                    icon={
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
                      </svg>
                    }
                    label="WhatsApp Admin"
                  />
                  <NavItem to="/dashboard/all-orders" icon={<FiShoppingBag />} label="All Orders" />
                </>
              )}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-grow min-w-0">
          <Routes>
            <Route index element={<DashboardHome />} />

            {(isSeller || isAdmin) && (
              <Route path="products/*" element={<ManageProducts />} />
            )}

            <Route path="inquiries" element={<Inquiries />} />
            <Route path="quotations" element={<Quotations />} />

            {(isSeller || isAdmin) && (
              <Route path="orders" element={<ManageOrders />} />
            )}

            {!(isSeller || isAdmin) && (
              <Route path="my-orders" element={<MyOrders />} />
            )}

            <Route path="saved" element={<SavedProducts />} />
            <Route path="profile" element={<ProfileSettings />} />

            {isAdmin && (
              <>
                <Route path="whatsapp-admin" element={<WhatsAppAdmin />} />
                <Route path="all-orders" element={<ManageOrders />} />
              </>
            )}
          </Routes>
        </div>
      </div>
    </div>
  );
}
