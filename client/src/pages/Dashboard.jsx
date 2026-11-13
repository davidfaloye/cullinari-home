import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import VerifyBanner from '../components/VerifyBanner.jsx';
import PlanChange from '../components/PlanChange.jsx';
import DashShell, { fmtDate } from '../components/DashShell.jsx';
import ApplicationForm, { Summary } from '../components/ApplicationForm.jsx';
import { FormError } from '../components/Form.jsx';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { getPlan, formatNaira } from '../../../shared/plans.js';

// The five stages a restaurant moves through, and which statuses mean each is done.
const STAGES = [
  ['Account created', () => true],
  ['Plan and details sent', (s) => ['submitted', 'approved', 'paid', 'live', 'rejected'].includes(s)],
  ['Approved by our team', (s) => ['approved', 'paid', 'live'].includes(s)],
  ['Payment made', (s) => ['paid', 'live'].includes(s)],
  ['App and admin live', (s) => s === 'live'],
];

function Progress({ status }) {
  const firstOpen = STAGES.findIndex(([, done]) => !done(status));
  return (
    <ol className="progress" aria-label="Your progress">
      {STAGES.map(([label, done], i) => {
        const isDone = done(status);
        const blocked = status === 'rejected' && i === 2;
        return (
          <li key={label} className={blocked ? 'is-blocked' : isDone ? 'is-done' : i === firstOpen ? 'is-current' : ''} aria-current={i === firstOpen ? 'step' : undefined}>
            <span className="progress__dot" aria-hidden="true" />
            <span>{label}</span>
            <span className="sr-only">{isDone ? ' (done)' : i === firstOpen ? ' (current step)' : ''}</span>
          </li>
        );
      })}
    </ol>
  );
}

function CopyRow({ label, value, secret }) {
  const [shown, setShown] = useState(!secret);
  const [copied, setCopied] = useState(false);
  return (
    <div className="copyrow">
      <dt>{label}</dt>
      <dd>
        <code>{shown ? value : '••••••••••'}</code>
        {secret && (
          <button type="button" className="link-btn" onClick={() => setShown((s) => !s)}>{shown ? 'Hide' : 'Show'}</button>
        )}
        <button
          type="button"
          className="link-btn"
          onClick={async () => {
            await navigator.clipboard?.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </dd>
    </div>
  );
}

function Approved({ app }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const a = app.amounts;
  const plan = getPlan(app.plan);

  async function pay() {
    setBusy(true);
    setError('');
    try {
      const { authorizationUrl } = await api.post('/api/payments/initialize');
      window.location.assign(authorizationUrl);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2 className="panel__title">Your application is approved</h2>
      <p>Pay to start building your ordering app and admin dashboard. They will be ready 2 to 5 business days after payment.</p>
      <dl className="bill">
        <div><dt>{plan.name} app setup, one time</dt><dd>{formatNaira(a.setup)}</dd></div>
        <div><dt>First month</dt><dd>{formatNaira(a.monthly)}</dd></div>
        <div className="bill__total"><dt>Total today</dt><dd>{formatNaira(a.total)}</dd></div>
      </dl>
      <FormError>{error}</FormError>
      <button className="btn btn--palm" onClick={pay} disabled={busy}>
        {busy ? 'Opening Paystack…' : `Pay ${formatNaira(a.total)} with Paystack`}
      </button>
      <p className="muted small">
        Card, bank transfer or USSD. If you pay by card, {formatNaira(a.monthly)} is charged to the same card each month
        from next month.
      </p>
    </section>
  );
}

function Live({ app }) {
  const dl = app.delivery;
  return (
    <section className="panel panel--live">
      <h2 className="panel__title">{app.details.appName || app.details.businessName} is live</h2>
      <p>Share your Play Store link with customers, and sign in to your admin dashboard to start taking orders.</p>
      <div className="live-links">
        <a className="btn btn--primary" href={dl.playStoreUrl} target="_blank" rel="noreferrer">Open on Google Play</a>
        {dl.appStoreUrl && (
          <a className="btn btn--outline" href={dl.appStoreUrl} target="_blank" rel="noreferrer">Open on the App Store</a>
        )}
      </div>
      <h3>Your admin dashboard</h3>
      <dl className="copylist">
        <CopyRow label="Address" value={dl.adminUrl} />
        <CopyRow label="Login email" value={dl.adminLoginEmail} />
        {dl.adminPassword && <CopyRow label="Temporary password" value={dl.adminPassword} secret />}
        <CopyRow label="Play Store link" value={dl.playStoreUrl} />
      </dl>
      <p className="notice">Change the temporary password the first time you sign in to your admin dashboard.</p>
      <p><a className="btn btn--outline btn--sm" href={dl.adminUrl} target="_blank" rel="noreferrer">Open admin dashboard</a></p>
    </section>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [app, setApp] = useState(null);
  const [error, setError] = useState('');
  const [params] = useSearchParams();
  const upgradedTo = getPlan(params.get('upgraded'));

  useEffect(() => {
    api
      .get('/api/application')
      .then((d) => setApp(d.application))
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <DashShell><FormError>{error}</FormError></DashShell>;
  if (!app) return <DashShell><p className="page-loading">Loading your dashboard...</p></DashShell>;

  const plan = getPlan(app.plan);
  const s = app.status;
  const editable = s === 'draft' || s === 'changes_requested';

  return (
    <DashShell>
      <div className="dash__intro">
        <h1>
          {s === 'draft' ? `Welcome, ${user.firstName}` : app.details.businessName || user.restaurantName}
        </h1>
        {s === 'draft' && <p className="lede">Choose a plan and send us your restaurant’s details. You can save and come back any time.</p>}
        {plan && s !== 'draft' && <p className="muted">{plan.name} plan</p>}
      </div>

      <div className="dash__grid">
        <aside className="dash__aside">
          <Progress status={s} />
        </aside>

        <div className="dash__content">
          <VerifyBanner />
          {upgradedTo && s === 'live' && app.plan === upgradedTo.code && (
            <div className="notice notice--ok" role="status">
              <p><b>You are now on {upgradedTo.name}.</b> The new limits apply now. Our team will contact you to set up the new app features.</p>
            </div>
          )}
          {s === 'changes_requested' && (
            <div className="notice notice--warn" role="status">
              <p><b>Our team asked for a few changes before approving:</b></p>
              <p className="prewrap">{app.reviewNote}</p>
              <p>Update the details below and send the application again.</p>
            </div>
          )}

          {editable && <ApplicationForm app={app} user={user} onChange={setApp} />}

          {s === 'submitted' && (
            <section className="panel">
              <h2 className="panel__title">Your application is with our team</h2>
              <p>
                We received it on {fmtDate(app.submittedAt, { weekday: 'long', day: 'numeric', month: 'long' })} and usually
                review within one business day. We will email {user.email} as soon as it is approved or if we need anything.
              </p>
              <details className="disclosure">
                <summary>See what you sent</summary>
                <Summary app={app} details={app.details} plan={plan} />
              </details>
            </section>
          )}

          {s === 'rejected' && (
            <section className="panel">
              <h2 className="panel__title">We could not approve this application</h2>
              {app.reviewNote && <p className="prewrap">{app.reviewNote}</p>}
              <p>
                If you have questions, email <a href="mailto:hello@cullinari.com">hello@cullinari.com</a> and our team will
                get back to you.
              </p>
            </section>
          )}

          {s === 'approved' && <Approved app={app} />}

          {s === 'paid' && (
            <section className="panel">
              <h2 className="panel__title">We are building your app</h2>
              <p>
                Payment of {formatNaira(app.payment.amount)} received on {fmtDate(app.payment.paidAt)}. Reference{' '}
                <code>{app.payment.reference}</code>.
              </p>
              <div className="eta">
                <span className="eta__label">Expected between</span>
                <span className="eta__dates">
                  {fmtDate(app.delivery.etaStart, { weekday: 'short', day: 'numeric', month: 'short' })} and{' '}
                  {fmtDate(app.delivery.etaEnd, { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
              </div>
              <p className="muted">
                Your Play Store link and admin login will appear here when they are ready, and we will email you.
              </p>
            </section>
          )}

          {s === 'live' && <Live app={app} />}
          {s === 'live' && <PlanChange onChange={setApp} />}
        </div>
      </div>
    </DashShell>
  );
}
