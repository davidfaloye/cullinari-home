import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthShell from '../components/AuthShell.jsx';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

// Opened from the link in the confirmation email.
export default function VerifyEmail() {
  const [params] = useSearchParams();
  const { setUser } = useAuth();
  const [state, setState] = useState({ phase: 'checking' });
  const ran = useRef(false);
  const token = params.get('token') || '';
  const email = params.get('email') || '';

  useEffect(() => {
    if (ran.current) return; // StrictMode runs effects twice in development
    ran.current = true;
    if (!token || !email) {
      setState({ phase: 'error', message: 'This link is incomplete. Open it again from your email.' });
      return;
    }
    api
      .post('/api/auth/verify-email', { token, email })
      .then((d) => {
        setUser(d.user);
        setState({ phase: 'done' });
      })
      .catch((err) => setState({ phase: 'error', message: err.message }));
  }, [token, email, setUser]);

  if (state.phase === 'checking') {
    return (
      <AuthShell title="Confirming your email">
        <p className="auth__intro" aria-live="polite">One moment…</p>
      </AuthShell>
    );
  }
  if (state.phase === 'done') {
    return (
      <AuthShell title="Email confirmed" intro={`${email} is confirmed. You can now send your application and pay from your dashboard.`}>
        <Link className="btn btn--primary btn--block" to="/dashboard">Go to your dashboard</Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="We could not confirm this email" intro={state.message}>
      <Link className="btn btn--primary btn--block" to="/dashboard">Go to your dashboard to send a new link</Link>
    </AuthShell>
  );
}
