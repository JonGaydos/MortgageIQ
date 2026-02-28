import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import { API_BASE } from '../utils/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const token = searchParams.get('token');

  const [isValid, setIsValid] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setIsValid(false);
      return;
    }
    fetch(`${API_BASE}/auth/validate-reset-token?token=${token}`)
      .then(r => r.json())
      .then(data => setIsValid(data.valid))
      .catch(() => setIsValid(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      localStorage.setItem('payoffiq-token', data.token);
      localStorage.setItem('payoffiq-user', data.username);
      window.location.href = '/';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <p className="text-warm-gray">Validating reset token...</p>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-cream">
        <div className="card w-full max-w-sm text-center">
          <h2 className="font-serif text-xl font-bold text-danger mb-2">Invalid or Expired Token</h2>
          <p className="text-sm text-warm-gray mb-4">
            This reset link is no longer valid. Please generate a new one.
          </p>
          <Button variant="outline" onClick={() => navigate('/login')}>
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-cream">
      <div className="card w-full max-w-sm">
        <h2 className="font-serif text-xl font-bold text-ink mb-4 text-center">
          Reset Password
        </h2>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="New Password">
            <input
              type="password"
              className="input-field"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={6}
              autoFocus
            />
          </Field>

          <Field label="Confirm New Password">
            <input
              type="password"
              className="input-field"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              minLength={6}
            />
          </Field>

          <Button className="w-full" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
      </div>
    </div>
  );
}
