import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
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
          <h1 className="text-2xl font-bold text-gray-800">Forgot Password</h1>
          <p className="text-gray-500 text-sm mt-1">We'll send you a reset link</p>
        </div>

        <div className="card p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Check your email</h2>
              <p className="text-gray-500 text-sm mb-6">
                If <strong>{email}</strong> is registered, you'll receive a password reset link shortly.
              </p>
              <Link to="/login" className="btn-primary w-full block text-center py-2.5">
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="you@example.com"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-base">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <p className="text-center text-sm text-gray-500">
                <Link to="/login" className="text-green-600 hover:text-green-700 font-medium">
                  Back to Login
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
