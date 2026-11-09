import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import AuthShell from '../components/AuthShell.jsx';
import { TextField, PasswordField, FormError } from '../components/Form.jsx';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

function safeNext(next, user) {
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return user.role === 'admin' ? '/admin' : '/dashboard';
}

export default function Login() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { user, setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={safeNext(params.get('next'), user)} replace />;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError('');
    try {
      const { user: u } = await api.post('/api/auth/login', { email, password });
      setUser(u);
      nav(safeNext(params.get('next'), u), { replace: true });
    } catch (err) {
      setErrors(err.fields || {});
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Sign in" intro="Open your Cullinari dashboard to check your application, pay, or find your app and admin login.">
      <form className="stack" onSubmit={submit} noValidate>
        <FormError>{formError}</FormError>
        <TextField label="Email" type="email" value={email} onChange={setEmail} error={errors.email} autoComplete="email" inputMode="email" required />
        <PasswordField value={password} onChange={setPassword} error={errors.password} />
        <p className="auth__forgot">
          <Link to="/forgot-password">Forgot your password?</Link>
        </p>
        <button className="btn btn--primary btn--block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="auth__switch">
          New to Cullinari? <Link to="/signup">Create an account</Link>
        </p>
      </form>
    </AuthShell>
  );
}
