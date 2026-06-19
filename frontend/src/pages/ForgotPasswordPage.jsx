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
      toast.success('Reset link sent if that email exists.');
    } catch {
      toast.error('Something went wrong. Try again.');
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
              <p className="text-green-700 font-medium mb-4">Check your inbox for the reset link.</p>
              <Link to="/login" className="text-green-600 hover:text-green-700 font-medium text-sm">Back to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input" placeholder="you@example.com" />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-base">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <p className="text-center text-sm text-gray-500">
                <Link to="/login" className="text-green-600 hover:text-green-700 font-medium">Back to Login</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
