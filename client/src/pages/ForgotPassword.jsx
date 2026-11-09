import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../components/AuthShell.jsx';
import { TextField, FormError } from '../components/Form.jsx';
import { api } from '../api.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/api/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Reset your password" intro={sent ? null : 'Enter the email you signed up with and we will send you a link to choose a new password.'}>
      {sent ? (
        <div className="stack">
          <p className="notice notice--ok">If {email} has a Cullinari account, a reset link is on its way. It works for one hour.</p>
          <p className="auth__switch"><Link to="/login">Back to sign in</Link></p>
        </div>
      ) : (
        <form className="stack" onSubmit={submit} noValidate>
          <FormError>{error}</FormError>
          <TextField label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" required />
          <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
          <p className="auth__switch"><Link to="/login">Back to sign in</Link></p>
        </form>
      )}
    </AuthShell>
  );
}
