import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function AdminSetupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    secret: '',
    name: 'Super Admin',
    email: '',
    password: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.secret || !form.email || !form.password) {
      toast.error('Secret, email and password are required');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/seed-admin', form);
      toast.success(res.data.message || 'Admin created!');
      setDone(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed — check your seed secret');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" className="w-9 h-9 fill-white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">PrintMart Admin Setup</h1>
          <p className="text-gray-500 text-sm mt-1">Create your super admin account</p>
        </div>

        {done ? (
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Admin Account Created!</h2>
            <p className="text-gray-500 text-sm mb-6">
              You can now log in with your admin email and password.
              <br />
              <strong className="text-red-600">Important:</strong> Remove <code className="bg-gray-100 px-1 rounded text-xs">ADMIN_SEED_SECRET</code> from your server environment variables now.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="btn-primary w-full"
            >
              Go to Login →
            </button>
          </div>
        ) : (
          <div className="card p-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6 text-sm text-yellow-800">
              <strong>Before you start:</strong> Add <code className="bg-white px-1 rounded text-xs">ADMIN_SEED_SECRET=your-secret</code> to your Render backend environment variables, then enter the same secret below.
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seed Secret <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={form.secret}
                  onChange={(e) => setForm({ ...form, secret: e.target.value })}
                  className="input w-full"
                  placeholder="The secret you set in Render env vars"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input w-full"
                  placeholder="Super Admin"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input w-full"
                  placeholder="admin@printmart.in"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input w-full"
                  placeholder="Min 6 characters"
                  minLength={6}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input w-full"
                  placeholder="9876543210"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-base disabled:opacity-60"
              >
                {loading ? 'Creating Admin Account…' : 'Create Super Admin Account'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
