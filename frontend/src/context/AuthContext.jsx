import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  // On app load, refresh user data from server to pick up role changes (e.g. buyer → admin)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    authAPI.getMe()
      .then(({ data }) => {
        const refreshed = { ...JSON.parse(localStorage.getItem('user') || '{}'), ...data };
        localStorage.setItem('user', JSON.stringify(refreshed));
        setUser(refreshed);
      })
      .catch(() => {}); // silently ignore if token expired
  }, []);

  const login = async (phone, password) => {
    setLoading(true);
    const { data } = await authAPI.login({ phone, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    setLoading(false);
    return data;
  };

  const register = async (formData) => {
    setLoading(true);
    const { data } = await authAPI.register(formData);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    setLoading(false);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = (data) => {
    const updated = { ...user, ...data };
    localStorage.setItem('user', JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
