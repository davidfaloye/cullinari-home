import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function VerifyBanner() {
  const { user, setUser } = useAuth();
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState('');

  if (!user || user.emailVerified) return null;

  async function resend() {
    setState('sending');
    setError('');
    try {
      const d = await api.post('/api/auth/resend-verification');
      if (d.alreadyVerified) {
        setUser({ ...user, emailVerified: true });
        return;
      }
      setState('sent');
    } catch (err) {
      setError(err.message);
      setState('error');
    }
  }

  return (
    <div className="notice notice--warn verify-banner" role="status">
      <p>
        <b>Confirm your email address.</b> We sent a link to {user.email}. You can fill in your application now, but you
        need to confirm before you send it or pay.
      </p>
      <p>
        {state === 'sent' ? (
          <span>New link sent. Check your inbox and spam folder.</span>
        ) : (
          <button type="button" className="link-btn" onClick={resend} disabled={state === 'sending'}>
            {state === 'sending' ? 'Sending…' : 'Send a new link'}
          </button>
        )}
        {error && <span className="field__error"> {error}</span>}
      </p>
    </div>
  );
}
