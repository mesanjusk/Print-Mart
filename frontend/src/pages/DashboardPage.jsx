import { Routes, Route, Link, NavLink, useNavigate } from 'react-router-dom';
import { FiGrid, FiPackage, FiMessageSquare, FiHeart, FiUser, FiFileText, FiImage } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import DashboardHome from '../components/dashboard/DashboardHome';
import ManageProducts from '../components/dashboard/ManageProducts';
import Inquiries from '../components/dashboard/Inquiries';
import SavedProducts from '../components/dashboard/SavedProducts';
import ProfileSettings from '../components/dashboard/ProfileSettings';
import Quotations from '../components/dashboard/Quotations';
import DesignLibrary from '../components/dashboard/DesignLibrary';

const navItems = [
  { to: '/dashboard', icon: <FiGrid />, label: 'Overview', exact: true },
  { to: '/dashboard/inquiries', icon: <FiMessageSquare />, label: 'Inquiries' },
  { to: '/dashboard/quotations', icon: <FiFileText />, label: 'Quotations' },
  { to: '/dashboard/designs', icon: <FiImage />, label: 'My Designs' },
  { to: '/dashboard/saved', icon: <FiHeart />, label: 'Saved' },
  { to: '/dashboard/profile', icon: <FiUser />, label: 'Profile' },
];

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex gap-6">
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
              {user?.role === 'seller' && (
                <NavLink to="/dashboard/products"
                  className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${isActive ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-green-50 hover:text-green-700'}`}>
                  <FiPackage /> My Products
                </NavLink>
              )}
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.exact}
                  className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${isActive ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-green-50 hover:text-green-700'}`}>
                  {item.icon} {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        <div className="flex-grow min-w-0">
          <Routes>
            <Route index element={<DashboardHome />} />
            {user?.role === 'seller' && <Route path="products/*" element={<ManageProducts />} />}
            <Route path="inquiries" element={<Inquiries />} />
            <Route path="quotations" element={<Quotations />} />
            <Route path="designs" element={<DesignLibrary />} />
            <Route path="saved" element={<SavedProducts />} />
            <Route path="profile" element={<ProfileSettings />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
