import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: searchParams.get('role') || 'buyer',
    businessName: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-xl">PM</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Create Account</h1>
          <p className="text-gray-500 text-sm mt-1">Join India's largest printing marketplace</p>
        </div>
        <div className="card p-8">
          <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
            {['buyer', 'seller'].map((r) => (
              <button key={r} onClick={() => setForm({ ...form, role: r })}
                className={`flex-1 py-2 rounded-md text-sm font-medium capitalize transition-colors ${form.role === r ? 'bg-green-600 text-white shadow' : 'text-gray-600 hover:text-gray-800'}`}>
                I'm a {r}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input" placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input" placeholder="+91 9876543210" />
            </div>
            {form.role === 'seller' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <input type="text" value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  className="input" placeholder="Your company name" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" required value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input" placeholder="Min. 6 characters" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-base mt-2">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-green-600 hover:text-green-700 font-medium">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
