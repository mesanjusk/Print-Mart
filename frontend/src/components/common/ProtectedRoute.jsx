import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import Spinner from './Spinner';

export default function ProtectedRoute({ children }) {
  const { user, logout, updateUser } = useAuth();
  const [verified, setVerified] = useState(null); // null=loading, true=ok, false=fail

  useEffect(() => {
    if (!user) {
      setVerified(false);
      return;
    }
    authAPI.getMe()
      .then(({ data }) => {
        updateUser(data);
        setVerified(true);
      })
      .catch(() => {
        logout();
        setVerified(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (verified === null) return <div className="flex items-center justify-center min-h-screen"><Spinner /></div>;
  return verified ? children : <Navigate to="/login" replace />;
}
