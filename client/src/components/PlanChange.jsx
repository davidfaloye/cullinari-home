import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { FormError } from './Form.jsx';
import { fmtDate } from './DashShell.jsx';
import { getPlan, formatNaira, describeLimits } from '../../../shared/plans.js';

const long = { weekday: 'short', day: 'numeric', month: 'long' };

const limits = describeLimits;

// Plan section shown once the app is live: current plan, renewal date, upgrade or downgrade.
export default function PlanChange({ onChange }) {
  const [info, setInfo] = useState(null);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  function load() {
    return api.get('/api/plan').then(setInfo).catch((e) => setError(e.message));
  }
  useEffect(() => {
    load();
  }, []);

  async function upgrade(to) {
    setBusy(to);
    setError('');
    try {
      const { authorizationUrl } = await api.post('/api/plan/upgrade', { to });
      window.location.assign(authorizationUrl);
    } catch (err) {
      setError(err.message);
      setBusy('');
    }
  }

  async function downgrade(to) {
    setBusy(to);
    setError('');
    try {
      const d = await api.post('/api/plan/downgrade', { to });
      onChange(d.application);
      setConfirming('');
      setOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function cancelPending() {
    setBusy('cancel');
    setError('');
    try {
      const d = await api.del('/api/plan/pending');
      onChange(d.application);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  if (!info) return error ? <FormError>{error}</FormError> : null;
  const current = getPlan(info.plan);
  const pending = info.pendingPlan && getPlan(info.pendingPlan);

  return (
    <section className="panel" aria-labelledby="plan-title">
      <h2 className="panel__title" id="plan-title">Your plan</h2>
      <div className="plan-now">
        <p className="plan-now__name">{current.name}</p>
        <p>
          {formatNaira(current.monthly)} a month. {limits(current)}.
        </p>
        <p className="muted">Next renewal {fmtDate(info.period.end, long)}.</p>
      </div>

      {pending && (
        <div className="notice notice--warn">
          <p>
            You move to <b>{pending.name}</b> ({formatNaira(pending.monthly)} a month) on {fmtDate(info.pendingPlanAt, long)}.
            Until then everything on {current.name} keeps working.
          </p>
          <p>
            <button type="button" className="link-btn" onClick={cancelPending} disabled={busy === 'cancel'}>
              {busy === 'cancel' ? 'Cancelling…' : `Stay on ${current.name}`}
            </button>
          </p>
        </div>
      )}

      <FormError>{error}</FormError>

      {!open ? (
        <p>
          <button type="button" className="btn btn--outline btn--sm" onClick={() => setOpen(true)}>
            Change plan
          </button>
        </p>
      ) : (
        <div className="plan-options">
          {info.options.map((o) => {
            const p = getPlan(o.code);
            if (o.kind === 'upgrade') {
              const q = o.quote;
              return (
                <article key={o.code} className="plan-option">
                  <h3>Upgrade to {p.name}</h3>
                  <p className="muted">{limits(p)}. {p.inc.join('. ')}.</p>
                  <dl className="bill">
                    <div><dt>Setup difference</dt><dd>{formatNaira(q.setupDiff)}</dd></div>
                    <div><dt>Rest of this month at the new price ({q.daysLeft} of {q.periodDays} days)</dt><dd>{formatNaira(q.proratedMonthly)}</dd></div>
                    <div className="bill__total"><dt>Pay today</dt><dd>{formatNaira(q.total)}</dd></div>
                  </dl>
                  <p className="small muted">New limits apply as soon as you pay. From {fmtDate(q.nextRenewal, long)}, {formatNaira(p.monthly)} a month.</p>
                  <button type="button" className="btn btn--palm" onClick={() => upgrade(o.code)} disabled={!!busy || !!pending}>
                    {busy === o.code ? 'Opening Paystack…' : `Pay ${formatNaira(q.total)} and upgrade`}
                  </button>
                  {pending && <p className="small muted">Stay on {current.name} first to upgrade.</p>}
                </article>
              );
            }
            const isPending = info.pendingPlan === o.code;
            return (
              <article key={o.code} className="plan-option">
                <h3>Move to {p.name}</h3>
                <p className="muted">{limits(p)}. {formatNaira(p.monthly)} a month.</p>
                <p className="small">
                  Starts {fmtDate(o.effectiveAt, long)}, when your current month ends. No refund for this month, and no
                  setup fee is returned. Nothing is deleted: branches and items over the new limits become read-only and
                  you choose which stay active.
                </p>
                {isPending ? (
                  <p className="small"><b>Already scheduled.</b></p>
                ) : confirming === o.code ? (
                  <div className="panel__actions panel__actions--start">
                    <button type="button" className="btn btn--primary" onClick={() => downgrade(o.code)} disabled={!!busy}>
                      {busy === o.code ? 'Scheduling…' : `Confirm move to ${p.name}`}
                    </button>
                    <button type="button" className="btn btn--quiet" onClick={() => setConfirming('')}>Keep {current.name}</button>
                  </div>
                ) : (
                  <button type="button" className="btn btn--outline" onClick={() => setConfirming(o.code)}>
                    Move to {p.name}
                  </button>
                )}
              </article>
            );
          })}
          <p>
            <button type="button" className="link-btn" onClick={() => { setOpen(false); setConfirming(''); }}>
              Close
            </button>
          </p>
        </div>
      )}
    </section>
  );
}
