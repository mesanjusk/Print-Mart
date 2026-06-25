import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', emoji: '🏠', label: 'Home', end: true },
  { to: '/products', emoji: '📦', label: 'Products', end: false },
  { to: '/suppliers', emoji: '🏭', label: 'Suppliers', end: false },
  { to: '/dashboard', emoji: '👤', label: 'Account', end: false },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex md:hidden safe-area-bottom">
      {TABS.map(({ to, emoji, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2 text-xs gap-0.5 transition-colors ${
              isActive ? 'text-green-600 font-semibold' : 'text-gray-500 hover:text-gray-700'
            }`
          }
        >
          <span className="text-xl leading-none">{emoji}</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
