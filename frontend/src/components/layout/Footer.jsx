import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, ArrowRight, Shield, Zap, Award } from 'lucide-react';
import { FiFacebook, FiTwitter, FiInstagram, FiLinkedin } from 'react-icons/fi';

const FOOTER_LINKS = {
  platform: [
    { label: 'Browse Products', to: '/products' },
    { label: 'Find Suppliers', to: '/suppliers' },
    { label: 'Compare Prices', to: '/compare' },
    { label: 'Offer Zone', to: '/offers' },
    { label: 'Sell on PrintMart', to: '/register?role=seller' },
  ],
  categories: [
    { label: 'Business Cards', to: '/products?category=business-cards' },
    { label: 'Flex Banners', to: '/products?category=flex-banners' },
    { label: 'Brochures & Flyers', to: '/products?category=brochures' },
    { label: 'Corporate Gifts', to: '/products?category=corporate-gifts' },
    { label: 'Promotional Items', to: '/products?category=promotional' },
  ],
  support: [
    { label: 'Help Center', href: '#' },
    { label: 'Contact Us', href: '#' },
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Refund Policy', href: '#' },
  ],
};

const TRUST_BADGES = [
  { icon: Shield, label: 'Verified Suppliers', desc: '10,000+ verified' },
  { icon: Zap, label: 'Fast Delivery', desc: 'Pan India shipping' },
  { icon: Award, label: 'Quality Assured', desc: 'ISO certified' },
];

export default function Footer() {
  return (
    <footer className="bg-gray-950 dark:bg-gray-950 text-gray-400 mt-auto border-t border-gray-800">
      {/* Trust badges strip */}
      <div className="border-b border-gray-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TRUST_BADGES.map((badge) => (
              <div key={badge.label} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary-900/40 flex items-center justify-center flex-shrink-0">
                  <badge.icon className="h-5 w-5 text-primary-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{badge.label}</p>
                  <p className="text-xs text-gray-500">{badge.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-6">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">PM</span>
              </div>
              <span className="text-xl font-bold text-white">
                Print<span className="text-primary-400">Mart</span>
              </span>
            </Link>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed max-w-xs">
              India&apos;s #1 B2B Printing Marketplace. Connect with verified printers,
              get instant quotes, and scale your print business effortlessly.
            </p>
            <div className="flex items-center gap-3 mb-6">
              {[
                { Icon: FiFacebook, href: '#' },
                { Icon: FiTwitter, href: '#' },
                { Icon: FiInstagram, href: '#' },
                { Icon: FiLinkedin, href: '#' },
              ].map(({ Icon, href }) => (
                <a
                  key={href + Icon.name}
                  href={href}
                  className="h-8 w-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-primary-600 hover:text-white transition-all duration-200"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 flex-shrink-0 text-primary-400" />
                <span>support@printmart.in</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 flex-shrink-0 text-primary-400" />
                <span>+91 93701 95000</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0 text-primary-400" />
                <span>Mumbai, India 400001</span>
              </div>
            </div>
          </div>

          {/* Links */}
          {[
            { title: 'Platform', links: FOOTER_LINKS.platform },
            { title: 'Categories', links: FOOTER_LINKS.categories },
            { title: 'Support', links: FOOTER_LINKS.support },
          ].map((section) => (
            <div key={section.title}>
              <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
                {section.title}
              </h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {link.to ? (
                      <Link
                        to={link.to}
                        className="text-sm text-gray-500 hover:text-primary-400 transition-colors duration-150 flex items-center gap-1 group"
                      >
                        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 -ml-1 transition-all duration-150" />
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="text-sm text-gray-500 hover:text-primary-400 transition-colors duration-150 flex items-center gap-1 group"
                      >
                        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 -ml-1 transition-all duration-150" />
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <div className="mt-10 pt-8 border-t border-gray-800/60">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Subscribe to our newsletter</p>
              <p className="text-xs text-gray-500 mt-0.5">Get the latest printing deals and supplier updates.</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 sm:w-56 h-9 px-3 rounded-lg border border-gray-700 bg-gray-900 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all"
              />
              <button className="h-9 px-4 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-gray-800/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} PrintMart Technologies Pvt. Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span>Made in 🇮🇳 India</span>
            <span>•</span>
            <span>GST: 27AABCP1234Z1Z5</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
