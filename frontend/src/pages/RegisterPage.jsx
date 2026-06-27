import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import WhatsAppRegisterQR from '../components/common/WhatsAppRegisterQR';

const BENEFITS = [
  'Free to register — no credit card needed',
  'Instant WhatsApp onboarding',
  'Access 5,000+ printing products',
  'Get quotes from verified suppliers',
];

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="hidden md:block"
          >
            <Link to="/" className="flex items-center gap-2.5 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm">PM</span>
              </div>
              <span className="text-xl font-bold text-foreground">
                Print<span className="text-primary-600">Mart</span>
              </span>
            </Link>

            <h1 className="text-3xl font-extrabold text-foreground mb-3 leading-tight">
              India&apos;s #1 Print<br />Marketplace
            </h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Join 50,000+ buyers and suppliers on PrintMart. Get quotes, compare prices, and order print products from verified suppliers.
            </p>

            <ul className="space-y-3">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-center gap-3 text-sm text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-primary-600 flex-shrink-0" />
                  {b}
                </li>
              ))}
            </ul>

            <div className="mt-10 p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/40">
              <p className="text-sm font-medium text-primary-700 dark:text-primary-300 mb-1">
                🚀 Fastest registration
              </p>
              <p className="text-xs text-primary-600/80 dark:text-primary-400/80">
                Scan the QR code and get registered in under 2 minutes via WhatsApp.
              </p>
            </div>
          </motion.div>

          {/* Right panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Mobile logo */}
            <div className="md:hidden text-center mb-8">
              <Link to="/" className="inline-flex items-center gap-2.5 justify-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-sm">PM</span>
                </div>
                <span className="text-xl font-bold text-foreground">
                  Print<span className="text-primary-600">Mart</span>
                </span>
              </Link>
              <h1 className="text-2xl font-bold text-foreground">Join PrintMart</h1>
              <p className="text-muted-foreground text-sm mt-1">Register instantly via WhatsApp</p>
            </div>

            <div className="bg-card border border-border rounded-2xl shadow-elevated p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-bold text-foreground">Register via WhatsApp</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Scan the QR code with your WhatsApp to get started instantly.
              </p>

              <WhatsAppRegisterQR />

              <div className="mt-6 pt-5 border-t border-border text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
