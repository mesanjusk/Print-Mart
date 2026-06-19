import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { hasWhatsApp }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authAPI.forgotPassword(email);
      setResult(data);
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
          <p className="text-gray-500 text-sm mt-1">We'll send a reset link to your email and OTP to WhatsApp</p>
        </div>
        <div className="card p-8">
          {result ? (
            <div className="text-center space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3 bg-blue-50 rounded-lg px-4 py-3 text-sm">
                  <span className="text-xl">📧</span>
                  <p className="text-blue-800 text-left">
                    A <strong>reset link</strong> has been sent to your email (valid 1 hour).
                  </p>
                </div>
                {result.hasWhatsApp && (
                  <div className="flex items-center gap-3 bg-green-50 rounded-lg px-4 py-3 text-sm">
                    <span className="text-xl">📱</span>
                    <p className="text-green-800 text-left">
                      A <strong>6-digit OTP</strong> has been sent to your WhatsApp (valid 10 minutes).
                    </p>
                  </div>
                )}
              </div>
              <div className="pt-2 space-y-2">
                <Link to="/reset-password" className="block text-center btn-primary py-2.5">
                  Use Email Link
                </Link>
                {result.hasWhatsApp && (
                  <Link to="/reset-password?method=otp" className="block text-center border border-green-600 text-green-700 rounded-lg py-2.5 text-sm font-medium hover:bg-green-50 transition-colors">
                    Use WhatsApp OTP
                  </Link>
                )}
              </div>
              <Link to="/login" className="text-green-600 hover:text-green-700 font-medium text-sm block">Back to Login</Link>
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
                {loading ? 'Sending...' : 'Send Reset Link & OTP'}
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
