import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import { API_BASE } from '../utils/api';

export default function LoginPage() {
  const { needsSetup, login, setup } = useAuth();
  const { theme } = useTheme();
  const [mode, setMode] = useState(needsSetup ? 'setup' : 'login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'setup') {
        if (password !== confirm) throw new Error('Passwords do not match');
        await setup(username, password);
      } else if (mode === 'login') {
        await login(username, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/generate-reset-token`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResetToken(data.token);
      setMode('forgot');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-cream">
      <div className="card w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="font-serif text-3xl font-bold text-ink">
            {'\u{1F4B0}'} PayoffIQ
          </h1>
          <p className="text-sm text-warm-gray mt-1">
            {mode === 'setup' ? 'Create your account' : mode === 'forgot' ? 'Password Reset' : 'Welcome back'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm">
            {error}
          </div>
        )}

        {mode === 'forgot' ? (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-gold/10 text-sm">
              <p className="font-semibold mb-1">Reset Link Generated</p>
              <p className="text-xs text-warm-gray mb-2">
                Use this link within 15 minutes. In production, access this URL directly:
              </p>
              <code className="text-xs break-all block p-2 rounded bg-input-bg border border-input-border">
                /reset-password?token={resetToken}
              </code>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setMode('login')}>
              Back to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Username">
              <input
                type="text"
                className="input-field"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoFocus
              />
            </Field>

            <Field label="Password">
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </Field>

            {mode === 'setup' && (
              <Field label="Confirm Password">
                <input
                  type="password"
                  className="input-field"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  minLength={6}
                />
              </Field>
            )}

            <Button className="w-full" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'setup' ? 'Create Account' : 'Log In'}
            </Button>

            {mode === 'login' && (
              <button
                type="button"
                className="w-full text-xs text-warm-gray hover:text-gold transition-colors"
                onClick={handleForgotPassword}
              >
                Forgot password?
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
