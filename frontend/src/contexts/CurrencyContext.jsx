import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { API_BASE } from '../utils/api';

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const { isAuthenticated, authFetch } = useAuth();
  const [currency, setCurrencyState] = useState('USD');
  const [locale, setLocaleState] = useState('en-US');

  useEffect(() => {
    if (!isAuthenticated) return;
    authFetch(`${API_BASE}/settings`)
      .then(r => r.json())
      .then(data => {
        if (data.currency) setCurrencyState(data.currency);
        if (data.locale) setLocaleState(data.locale);
      })
      .catch(() => {});
  }, [isAuthenticated, authFetch]);

  const fmt = useCallback((amount) => {
    const num = parseFloat(amount) || 0;
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    } catch {
      return `$${num.toFixed(2)}`;
    }
  }, [currency, locale]);

  const setCurrency = useCallback((code) => setCurrencyState(code), []);
  const setLocale = useCallback((loc) => setLocaleState(loc), []);

  return (
    <CurrencyContext.Provider value={{ currency, locale, fmt, setCurrency, setLocale }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
