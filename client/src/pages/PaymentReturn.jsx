import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import DashShell from '../components/DashShell.jsx';
import { api } from '../api.js';

// Paystack sends the customer back here with ?reference=... (and ?trxref=...).
export default function PaymentReturn() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const reference = params.get('reference') || params.get('trxref');
  const [state, setState] = useState({ phase: 'checking' });

  useEffect(() => {
    if (!reference) {
      setState({ phase: 'error', message: 'No payment reference was returned.' });
      return;
    }
    let tries = 0;
    let stop = false;
    async function check() {
      try {
        const d = await api.get(`/api/payments/verify?reference=${encodeURIComponent(reference)}`);
        if (stop) return;
        if (d.paid && d.application?.status !== 'approved') {
          nav('/dashboard', { replace: true });
        } else if (d.status === 'abandoned' || d.status === 'failed') {
          setState({ phase: 'failed' });
        } else if (tries++ < 6) {
          setTimeout(check, 2500); // e.g. bank transfer still confirming
        } else {
          setState({ phase: 'pending' });
        }
      } catch (err) {
        if (!stop) setState({ phase: 'error', message: err.message });
      }
    }
    check();
    return () => {
      stop = true;
    };
  }, [reference, nav]);

  return (
    <DashShell>
      <section className="panel narrow">
        {state.phase === 'checking' && (
          <>
            <h1 className="panel__title">Confirming your payment</h1>
            <p aria-live="polite">Checking with Paystack. This takes a few seconds.</p>
          </>
        )}
        {state.phase === 'failed' && (
          <>
            <h1 className="panel__title">The payment was not completed</h1>
            <p>No money was taken. You can try again from your dashboard.</p>
            <Link className="btn btn--primary" to="/dashboard">Back to dashboard</Link>
          </>
        )}
        {state.phase === 'pending' && (
          <>
            <h1 className="panel__title">Your payment is still being confirmed</h1>
            <p>Bank transfers can take a few minutes. We will email you as soon as it arrives, and your dashboard will update.</p>
            <Link className="btn btn--primary" to="/dashboard">Back to dashboard</Link>
          </>
        )}
        {state.phase === 'error' && (
          <>
            <h1 className="panel__title">We could not confirm this payment</h1>
            <p>{state.message} If money left your account, email hello@cullinari.com with reference {reference || 'from your bank alert'}.</p>
            <Link className="btn btn--primary" to="/dashboard">Back to dashboard</Link>
          </>
        )}
      </section>
    </DashShell>
  );
}
