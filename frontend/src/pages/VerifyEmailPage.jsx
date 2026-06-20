import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState(token ? 'loading' : 'otp'); // loading | otp | success | error
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto-verify via email link token
  useEffect(() => {
    if (!token) return;
    authAPI.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Enter the 6-digit OTP from WhatsApp');
    setSubmitting(true);
    try {
      await authAPI.verifyOTP(otp, 'verify_email');
      setStatus('success');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full card p-8 text-center">

        {status === 'loading' && <p className="text-gray-600">Verifying your email...</p>}

        {status === 'success' && (
          <>
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 text-2xl">✓</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Account Verified!</h2>
            <p className="text-gray-500 text-sm mb-6">Your account is now fully verified.</p>
            <Link to="/login" className="btn-primary px-6 py-2">Go to Login</Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 text-2xl">✕</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Link Expired</h2>
            <p className="text-gray-500 text-sm mb-6">The email link is invalid or has expired.</p>
            <button onClick={() => setStatus('otp')} className="btn-primary px-6 py-2 mb-3">
              Use WhatsApp OTP instead
            </button>
            <br />
            <Link to="/login" className="text-green-600 hover:text-green-700 font-medium text-sm">Back to Login</Link>
          </>
        )}

        {status === 'otp' && (
          <>
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📱</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">Enter WhatsApp OTP</h2>
            <p className="text-gray-500 text-sm mb-6">
              Enter the 6-digit OTP sent to your WhatsApp number.
              {!token && ' Or check your email for a verification link.'}
            </p>
            <form onSubmit={handleOTPSubmit} className="space-y-4 text-left">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="6-digit OTP"
                className="input text-center text-2xl tracking-widest"
                required
              />
              <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5">
                {submitting ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>
            <p className="text-center text-sm text-gray-500 mt-4">
              <Link to="/login" className="text-green-600 hover:text-green-700 font-medium">Back to Login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
