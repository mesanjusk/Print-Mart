import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiSearch, FiUser, FiMenu, FiX, FiHeart, FiMessageSquare } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?keyword=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="bg-green-700 text-white text-xs text-center py-1 px-4">
        India's #1 Printing &amp; Customization Marketplace
      </div>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex-shrink-0">
            <div className="flex items-center gap-1">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">PM</span>
              </div>
              <span className="text-xl font-bold text-gray-800">PrintMart</span>
            </div>
          </Link>

          <form onSubmit={handleSearch} className="flex-grow max-w-2xl">
            <div className="flex border-2 border-green-500 rounded overflow-hidden">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search business cards, banners, brochures..."
                className="flex-grow px-4 py-2 text-sm outline-none"
              />
              <button type="submit" className="bg-green-600 px-4 py-2 text-white hover:bg-green-700">
                <FiSearch size={18} />
              </button>
            </div>
          </form>

          <nav className="hidden md:flex items-center gap-4 text-sm">
            <Link to="/products" className="text-gray-600 hover:text-green-600 font-medium">Products</Link>
            <Link to="/suppliers" className="text-gray-600 hover:text-green-600 font-medium">Suppliers</Link>
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1 text-gray-700 hover:text-green-600"
                >
                  <FiUser size={18} />
                  <span className="font-medium">{(user.name || '').split(' ')[0] || 'User'}</span>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-10">
                    <Link to="/dashboard" onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50">Dashboard</Link>
                    {user.role === 'seller' && (
                      <Link to="/dashboard/products" onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50">My Products</Link>
                    )}
                    <Link to="/dashboard/inquiries" onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50">Inquiries</Link>
                    <Link to="/dashboard/saved" onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50">Saved Products</Link>
                    <hr className="my-1" />
                    <button onClick={() => { logout(); setUserMenuOpen(false); navigate('/'); }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50">
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <Link to="/login" className="btn-secondary text-sm py-1.5 px-3">Login</Link>
                <Link to="/register" className="btn-primary text-sm py-1.5 px-3">Register</Link>
              </div>
            )}
          </nav>

          <button className="md:hidden text-gray-600" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-white border-t px-4 py-3 space-y-2">
          <Link to="/products" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 hover:text-green-600">Products</Link>
          <Link to="/suppliers" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 hover:text-green-600">Suppliers</Link>
          {user ? (
            <>
              <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 hover:text-green-600">Dashboard</Link>
              <button onClick={() => { logout(); setMenuOpen(false); }} className="block py-2 text-red-500">Logout</button>
            </>
          ) : (
            <div className="flex gap-2 pt-2">
              <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-secondary flex-1 text-center text-sm">Login</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-primary flex-1 text-center text-sm">Register</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
