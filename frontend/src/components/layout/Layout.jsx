import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const DASHBOARD_PREFIX = '/dashboard';

export default function Layout({ children }) {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith(DASHBOARD_PREFIX);

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden w-full">
      <Navbar />
      <main className="flex-grow w-full">{children}</main>
      {!isDashboard && <Footer />}
    </div>
  );
}
