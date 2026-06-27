import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, CheckCircle2, Lock, Crown, Sparkles } from 'lucide-react';
import { userAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const PREMIUM_FEATURES = [
  { label: 'WhatsApp lead alerts', premium: true },
  { label: 'Dashboard lead view', premium: true },
  { label: 'Price comparison listing', premium: true },
  { label: 'Priority broadcast (top 5)', premium: true },
];

export default function PremiumBanner() {
  const { user } = useAuth();
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    if (user?.role === 'seller') {
      userAPI.getMyPlan().then((r) => setPlan(r.data)).catch(() => {});
    }
  }, [user]);

  if (!user || user.role !== 'seller' || plan === null) return null;

  if (plan.plan === 'premium') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl px-4 py-3"
      >
        <div className="h-8 w-8 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Crown className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Premium Seller</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">You receive instant WhatsApp lead broadcasts for matching inquiries.</p>
        </div>
        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 ml-auto flex-shrink-0" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 p-5"
    >
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground mb-0.5">Upgrade to Premium Seller</p>
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            Free plan: view leads in dashboard only.<br />
            Premium plan: get instant <strong className="text-foreground">WhatsApp notifications</strong> when buyers need your products.
          </p>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {PREMIUM_FEATURES.map(({ label, premium }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs">
                {premium ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                )}
                <span className="text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg px-3 py-2">
            <Zap className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Contact admin to activate Premium — <strong>admin@printmart.in</strong>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
