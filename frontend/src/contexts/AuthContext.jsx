import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { API_BASE } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('payoffiq-token'));
  const [username, setUsername] = useState(() => localStorage.getItem('payoffiq-user'));
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [autoLockMinutes, setAutoLockMinutes] = useState(null);
  const activityTimer = useRef(null);

  const isAuthenticated = !!token;

  // Check auth status on mount
  useEffect(() => {
    fetch(`${API_BASE}/auth/status`)
      .then(r => r.json())
      .then(data => {
        setNeedsSetup(data.needsSetup);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  // authFetch wrapper
  const authFetch = useCallback(async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.body && !(options.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
      },
    });
    if (res.status === 401) {
      logout();
      return res;
    }
    return res;
  }, [token]);

  // Load auto-lock setting when authenticated
  useEffect(() => {
    if (!token) return;
    authFetch(`${API_BASE}/settings`)
      .then(r => r.json())
      .then(data => {
        if (data.auto_lock_minutes) {
          setAutoLockMinutes(parseInt(data.auto_lock_minutes, 10));
        }
      })
      .catch(() => {});
  }, [token, authFetch]);

  // Auto-lock timer
  useEffect(() => {
    if (!autoLockMinutes || !token) return;

    const resetTimer = () => {
      if (activityTimer.current) clearTimeout(activityTimer.current);
      activityTimer.current = setTimeout(() => {
        logout();
      }, autoLockMinutes * 60 * 1000);
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (activityTimer.current) clearTimeout(activityTimer.current);
    };
  }, [autoLockMinutes, token]);

  const login = useCallback(async (user, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem('payoffiq-token', data.token);
    localStorage.setItem('payoffiq-user', data.username);
    setToken(data.token);
    setUsername(data.username);
    return data;
  }, []);

  const setup = useCallback(async (user, password) => {
    const res = await fetch(`${API_BASE}/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem('payoffiq-token', data.token);
    localStorage.setItem('payoffiq-user', data.username);
    setToken(data.token);
    setUsername(data.username);
    setNeedsSetup(false);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('payoffiq-token');
    localStorage.removeItem('payoffiq-user');
    setToken(null);
    setUsername(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      token, username, isAuthenticated, isLoading, needsSetup,
      login, setup, logout, authFetch, setAutoLockMinutes,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
