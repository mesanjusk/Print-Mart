import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // loading | success | error

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    authAPI.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full card p-8 text-center">
        {status === 'loading' && <p className="text-gray-600">Verifying your email...</p>}
        {status === 'success' && (
          <>
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 text-2xl">✓</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Email Verified!</h2>
            <p className="text-gray-500 text-sm mb-6">Your account is now fully verified.</p>
            <Link to="/login" className="btn-primary px-6 py-2">Go to Login</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 text-2xl">✕</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Verification Failed</h2>
            <p className="text-gray-500 text-sm mb-6">The link is invalid or has expired. Request a new one from your dashboard.</p>
            <Link to="/login" className="text-green-600 hover:text-green-700 font-medium text-sm">Back to Login</Link>
          </>
        )}
      </div>
    </div>
  );
}
