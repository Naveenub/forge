import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { auth as authApi, setToken, getToken } from '../utils/api';
import { LS_USER } from '../utils/constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_USER)); } catch { return null; }
  });
  const [loading, setLoading] = useState(!!getToken());
  const [error,   setError]   = useState(null);

  // Re-validate token on mount
  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    authApi.me()
      .then((u) => { setUser(u); localStorage.setItem(LS_USER, JSON.stringify(u)); })
      .catch(() => { setToken(null); setUser(null); localStorage.removeItem(LS_USER); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const { access_token, user: u } = await authApi.login(email, password);
      setToken(access_token);
      setUser(u);
      localStorage.setItem(LS_USER, JSON.stringify(u));
      return u;
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* best-effort */ }
    setToken(null);
    setUser(null);
    localStorage.removeItem(LS_USER);
  }, []);

  const updateUser = useCallback(async (data) => {
    const updated = await authApi.updateProfile(data);
    setUser(updated);
    localStorage.setItem(LS_USER, JSON.stringify(updated));
    return updated;
  }, []);

  const value = { user, loading, error, login, logout, updateUser, isAuthenticated: !!user };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
