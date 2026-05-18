import { Link } from 'react-router-dom';
import { FiFacebook, FiTwitter, FiInstagram, FiLinkedin } from 'react-icons/fi';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-4">PrintMart</h3>
            <p className="text-sm text-gray-400 mb-4">India's #1 B2B Printing Marketplace — From visiting cards to large format banners.</p>
            <div className="flex gap-3">
              <a href="#" className="text-gray-400 hover:text-white"><FiFacebook /></a>
              <a href="#" className="text-gray-400 hover:text-white"><FiTwitter /></a>
              <a href="#" className="text-gray-400 hover:text-white"><FiInstagram /></a>
              <a href="#" className="text-gray-400 hover:text-white"><FiLinkedin /></a>
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-green-500">Home</Link></li>
              <li><Link to="/products" className="hover:text-green-500">Products</Link></li>
              <li><Link to="/suppliers" className="hover:text-green-500">Suppliers</Link></li>
              <li><Link to="/register?role=seller" className="hover:text-green-500">Sell on PrintMart</Link></li>
              <li><Link to="/products?keyword=quote" className="hover:text-green-500">Get a Quote</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Popular Categories</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/products?category=business-cards" className="hover:text-green-500">Business Cards</Link></li>
              <li><Link to="/products?category=flex-banners" className="hover:text-green-500">Flex Banners</Link></li>
              <li><Link to="/products?category=brochures" className="hover:text-green-500">Brochures</Link></li>
              <li><Link to="/products?category=corporate-gifts" className="hover:text-green-500">Corporate Gifts</Link></li>
              <li><Link to="/products?category=promotional" className="hover:text-green-500">Promotional Items</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-green-500">Help Center</a></li>
              <li><a href="#" className="hover:text-green-500">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-green-500">Terms of Service</a></li>
              <li><a href="#" className="hover:text-green-500">Contact Us</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} PrintMart. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
