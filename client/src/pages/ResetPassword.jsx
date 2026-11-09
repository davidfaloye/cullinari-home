import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthShell from '../components/AuthShell.jsx';
import { PasswordField, FormError } from '../components/Form.jsx';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { setUser } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const token = params.get('token') || '';
  const email = params.get('email') || '';

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { user } = await api.post('/api/auth/reset-password', { token, email, password });
      setUser(user);
      nav(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!token || !email) {
    return (
      <AuthShell title="This link is incomplete">
        <p className="auth__intro">Open the link from your email again, or ask for a new one.</p>
        <Link className="btn btn--primary" to="/forgot-password">Ask for a new link</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" intro={`For ${email}`}>
      <form className="stack" onSubmit={submit} noValidate>
        <FormError>{error}</FormError>
        <PasswordField label="New password" value={password} onChange={setPassword} autoComplete="new-password" hint="At least 8 characters." />
        <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
      </form>
    </AuthShell>
  );
}
