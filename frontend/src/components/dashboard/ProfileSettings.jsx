import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, Building2, MapPin, Lock, Eye, EyeOff, Save, BadgeCheck } from 'lucide-react';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Button } from '../ui/button';
import { Avatar } from '../ui/avatar';
import { Badge } from '../ui/badge';

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {hint && <span className="text-muted-foreground font-normal ml-1.5">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

export default function ProfileSettings() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    businessName: user?.businessName || '',
    gstin: user?.gstin || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    pincode: user?.address?.pincode || '',
    newPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        businessName: form.businessName,
        gstin: form.gstin,
        address: { city: form.city, state: form.state, pincode: form.pincode },
      };
      if (form.newPassword) payload.password = form.newPassword;
      const { data } = await authAPI.updateProfile(payload);
      updateUser(data);
      toast.success('Profile updated successfully!');
      setForm((f) => ({ ...f, newPassword: '' }));
    } catch {
      toast.error('Update failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your personal information and account security.</p>
      </div>

      {/* Profile header card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <Avatar name={user?.name} size="xl" />
          <div>
            <p className="text-lg font-bold text-foreground">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email || user?.phone}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="capitalize">{user?.role}</Badge>
              {user?.isVerified && (
                <Badge variant="success" className="gap-1">
                  <BadgeCheck className="h-3 w-3" /> Verified
                </Badge>
              )}
              {user?.plan === 'premium' && (
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  Premium
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Personal info */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <User className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Personal Information</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full Name">
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                className="input"
                required
                placeholder="Your full name"
              />
            </Field>
            <Field label="Phone Number">
              <input
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                className="input"
                placeholder="9876543210"
              />
            </Field>
          </div>
        </div>

        {/* Business info (sellers only) */}
        {(user?.role === 'seller' || user?.role === 'admin' || user?.role === 'superadmin') && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Business Information</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Business Name">
                <input
                  type="text"
                  value={form.businessName}
                  onChange={set('businessName')}
                  className="input"
                  placeholder="Your company name"
                />
              </Field>
              <Field label="GSTIN">
                <input
                  type="text"
                  value={form.gstin}
                  onChange={set('gstin')}
                  className="input"
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
              </Field>
            </div>
          </div>
        )}

        {/* Address */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Address</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="City">
              <input type="text" value={form.city} onChange={set('city')} className="input" placeholder="Mumbai" />
            </Field>
            <Field label="State">
              <input type="text" value={form.state} onChange={set('state')} className="input" placeholder="Maharashtra" />
            </Field>
            <Field label="Pincode">
              <input type="text" value={form.pincode} onChange={set('pincode')} className="input" placeholder="400001" maxLength={6} />
            </Field>
          </div>
        </div>

        {/* Password */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Security</p>
          </div>

          <Field label="New Password" hint="(leave blank to keep current)">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.newPassword}
                onChange={set('newPassword')}
                className="input pr-10"
                placeholder="••••••••"
                minLength={form.newPassword ? 6 : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={loading} size="lg">
            <Save className="h-4 w-4" />
            {!loading && 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
