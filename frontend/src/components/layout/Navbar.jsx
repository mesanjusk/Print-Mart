import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, User, Menu, X, Zap, ChevronDown,
  LayoutDashboard, Package, MessageSquare, Heart,
  LogOut, Settings, Sun, Moon, Laptop,
  ShoppingBag, Store, GitCompare, Tag
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from 'next-themes';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Avatar } from '../ui/avatar';

const NAV_LINKS = [
  { label: 'Products', to: '/products', icon: ShoppingBag },
  { label: 'Offers', to: '/offers', icon: Tag, highlight: true },
  { label: 'Compare', to: '/compare', icon: GitCompare },
  { label: 'Suppliers', to: '/suppliers', icon: Store },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9 w-9" />;

  const icons = { light: Sun, dark: Moon, system: Laptop };
  const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
  const Icon = icons[theme] || Sun;

  return (
    <button
      onClick={() => setTheme(next)}
      className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
      title={`Switch to ${next} mode`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function UserMenu({ user, logout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const menuItems = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    ...(user.role === 'seller' || user.role === 'admin' || user.role === 'superadmin'
      ? [{ label: 'My Products', to: '/dashboard/products', icon: Package }]
      : []),
    { label: 'Inquiries', to: '/dashboard/inquiries', icon: MessageSquare },
    { label: 'Saved', to: '/dashboard/saved', icon: Heart },
    { label: 'Settings', to: '/dashboard/profile', icon: Settings },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-accent transition-all duration-200"
      >
        <Avatar name={user.name} size="sm" />
        <span className="hidden lg:block text-sm font-medium text-foreground max-w-[100px] truncate">
          {(user.name || '').split(' ')[0] || 'User'}
        </span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-popover shadow-elevated z-50 overflow-hidden"
          >
            <div className="p-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
            </div>
            <div className="p-1.5">
              {menuItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors duration-150"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="p-1.5 border-t border-border">
              <button
                onClick={() => { logout(); setOpen(false); navigate('/'); }}
                className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?keyword=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        scrolled
          ? 'bg-background/95 backdrop-blur-xl border-b border-border shadow-sm'
          : 'bg-background border-b border-transparent'
      )}
    >
      {/* Top bar */}
      <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-emerald-600 text-white text-xs text-center py-1.5 px-4">
        <span className="font-medium">🇮🇳 India&apos;s #1 Printing &amp; Customization Marketplace</span>
        <span className="hidden sm:inline text-white/70 ml-2">— Fast delivery • Quality guaranteed • 10,000+ suppliers</span>
      </div>

      {/* Main nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center h-16 gap-4">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-glow transition-all duration-300">
              <span className="text-white font-bold text-sm tracking-tight">PM</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-bold text-foreground">Print</span>
              <span className="text-lg font-bold text-primary-600">Mart</span>
            </div>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search printing products, suppliers…"
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200"
              />
              {searchQuery && (
                <button
                  type="submit"
                  className="absolute right-2 h-7 px-3 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 transition-colors"
                >
                  Search
                </button>
              )}
            </div>
          </form>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                    link.highlight && !location.pathname.startsWith(link.to) && 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                  )
                }
              >
                {link.highlight && <Zap className="h-3.5 w-3.5" />}
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1 ml-auto md:ml-0">
            <ThemeToggle />

            {user ? (
              <UserMenu user={user} logout={logout} />
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">Sign in</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Get started</Button>
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-border bg-background overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                        : 'text-foreground hover:bg-accent'
                    )
                  }
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                  {link.highlight && <span className="ml-auto text-xs font-bold text-orange-500">HOT</span>}
                </NavLink>
              ))}

              <div className="pt-3 border-t border-border mt-3">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 px-3 py-2 mb-2">
                      <Avatar name={user.name} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                      </div>
                    </div>
                    <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-accent">
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                    <button
                      onClick={() => { logout(); setMenuOpen(false); navigate('/'); }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Link to="/login" className="flex-1">
                      <Button variant="outline" className="w-full">Sign in</Button>
                    </Link>
                    <Link to="/register" className="flex-1">
                      <Button className="w-full">Get started</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
