import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { FiGrid, FiPackage, FiMessageSquare, FiHeart, FiUser, FiFileText, FiImage, FiUsers, FiTag } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import DashboardHome from '../components/dashboard/DashboardHome';
import ManageProducts from '../components/dashboard/ManageProducts';
import ManageOffers from '../components/dashboard/ManageOffers';
import Inquiries from '../components/dashboard/Inquiries';
import SavedProducts from '../components/dashboard/SavedProducts';
import ProfileSettings from '../components/dashboard/ProfileSettings';
import Quotations from '../components/dashboard/Quotations';
import DesignLibrary from '../components/dashboard/DesignLibrary';
import AdminUsers from '../components/dashboard/AdminUsers';

const linkCls = ({ isActive }) =>
  `flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
    isActive ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-green-50 hover:text-green-700'
  }`;

const mobileLinkCls = ({ isActive }) =>
  `flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ${
    isActive ? 'text-green-600' : 'text-gray-500'
  }`;

export default function DashboardPage() {
  const { user } = useAuth();

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
              {user?.role === 'seller' && (
                <>
                  <NavLink to="/dashboard/products" className={linkCls}><FiPackage /> My Products</NavLink>
                  <NavLink to="/dashboard/offers" className={linkCls}><FiTag /> My Offers</NavLink>
                </>
              )}
              {user?.role === 'admin' && (
                <NavLink to="/dashboard/admin/users" className={linkCls}><FiUsers /> Manage Users</NavLink>
              )}
              <NavLink to="/dashboard/inquiries" className={linkCls}><FiMessageSquare /> Inquiries</NavLink>
              <NavLink to="/dashboard/quotations" className={linkCls}><FiFileText /> Quotations</NavLink>
              <NavLink to="/dashboard/designs" className={linkCls}><FiImage /> My Designs</NavLink>
              <NavLink to="/dashboard/saved" className={linkCls}><FiHeart /> Saved</NavLink>
              <NavLink to="/dashboard/profile" className={linkCls}><FiUser /> Profile</NavLink>
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-grow min-w-0">
          <Routes>
            <Route index element={<DashboardHome />} />
            {user?.role === 'seller' && <Route path="products/*" element={<ManageProducts />} />}
            {user?.role === 'seller' && <Route path="offers" element={<ManageOffers />} />}
            {user?.role === 'admin' && <Route path="admin/users" element={<AdminUsers />} />}
            <Route path="inquiries" element={<Inquiries />} />
            <Route path="quotations" element={<Quotations />} />
            <Route path="designs" element={<DesignLibrary />} />
            <Route path="saved" element={<SavedProducts />} />
            <Route path="profile" element={<ProfileSettings />} />
          </Routes>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 px-2 py-2">
        <div className="flex items-center justify-around">
          <NavLink to="/dashboard" end className={mobileLinkCls}>
            <FiGrid size={20} />
            <span>Home</span>
          </NavLink>
          {user?.role === 'seller' ? (
            <>
              <NavLink to="/dashboard/products" className={mobileLinkCls}>
                <FiPackage size={20} />
                <span>Products</span>
              </NavLink>
              <NavLink to="/dashboard/offers" className={mobileLinkCls}>
                <FiTag size={20} />
                <span>Offers</span>
              </NavLink>
            </>
          ) : (
            <NavLink to="/dashboard/saved" className={mobileLinkCls}>
              <FiHeart size={20} />
              <span>Saved</span>
            </NavLink>
          )}
          <NavLink to="/dashboard/inquiries" className={mobileLinkCls}>
            <FiMessageSquare size={20} />
            <span>Inquiries</span>
          </NavLink>
          <NavLink to="/dashboard/profile" className={mobileLinkCls}>
            <FiUser size={20} />
            <span>Profile</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
