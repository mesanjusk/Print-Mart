import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function MagicLoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('No login token found in the link.');
      setStatus('error');
      return;
    }

    authAPI.magicLogin(token)
      .then(({ data }) => {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data));
        updateUser(data);
        navigate('/dashboard/profile', { replace: true });
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'This link is invalid or has expired.');
        setStatus('error');
      });
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Logging you in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="card p-8">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">✗</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Link Expired</h2>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <div className="space-y-3">
            <Link to="/login" className="btn-primary w-full py-2.5 block text-center">
              Go to Login
            </Link>
            <Link to="/forgot-password" className="text-sm text-green-600 hover:text-green-700">
              Request a new link via WhatsApp
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
