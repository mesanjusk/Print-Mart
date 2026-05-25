import { useState, useEffect } from 'react';
import { FiZap, FiCheckCircle, FiLock } from 'react-icons/fi';
import { userAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

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
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 mb-4 text-sm">
        <FiCheckCircle className="text-green-600 flex-shrink-0" size={16} />
        <span className="text-green-800 font-medium">Premium Seller</span>
        <span className="text-green-600 text-xs ml-1">You receive WhatsApp lead broadcasts for matching inquiries.</span>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
          <FiZap className="text-amber-600" size={18} />
        </div>
        <div className="flex-grow">
          <p className="font-semibold text-gray-800 text-sm">Upgrade to Premium Seller</p>
          <p className="text-xs text-gray-500 mt-0.5 mb-3">
            Free plan: you see leads in dashboard only.<br />
            Premium plan: get instant <strong>WhatsApp notifications</strong> when buyers are looking for your products.
          </p>
          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
            {[
              ['WhatsApp lead alerts', true],
              ['Dashboard lead view', true],
              ['Price comparison listing', true],
              ['Priority in broadcast (top 5)', true],
            ].map(([feature, premium]) => (
              <div key={feature} className="flex items-center gap-1.5">
                {premium ? (
                  <FiCheckCircle size={12} className="text-green-500 flex-shrink-0" />
                ) : (
                  <FiLock size={12} className="text-gray-400 flex-shrink-0" />
                )}
                <span className="text-gray-600">{feature}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-700 bg-amber-100 rounded px-3 py-2 inline-block">
            Contact admin to activate Premium — <strong>admin@printmart.in</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
