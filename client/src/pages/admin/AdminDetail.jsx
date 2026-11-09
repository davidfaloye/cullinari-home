import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DashShell, { StatusBadge, STATUS_LABEL, fmtDate } from '../../components/DashShell.jsx';
import { Summary } from '../../components/ApplicationForm.jsx';
import { TextArea, TextField, FormError } from '../../components/Form.jsx';
import { api } from '../../api.js';
import { getPlan, formatNaira } from '../../../../shared/plans.js';

function Review({ app, onChange }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function act(action) {
    if (action === 'reject' && !window.confirm('Decline this application? The restaurant will be emailed.')) return;
    setBusy(action);
    setError('');
    try {
      const d = await api.post(`/api/admin/applications/${app.id}/review`, { action, note });
      onChange(d.application);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <section className="panel">
      <h2 className="panel__title">Review</h2>
      <TextArea
        label="Note to the restaurant"
        hint="Required when asking for changes or declining. Sent in the email and shown in their dashboard."
        value={note}
        onChange={setNote}
        rows={4}
      />
      <FormError>{error}</FormError>
      <div className="panel__actions panel__actions--start">
        <button className="btn btn--primary" onClick={() => act('approve')} disabled={!!busy}>
          {busy === 'approve' ? 'Approving…' : `Approve and ask for ${formatNaira(app.amounts.total)}`}
        </button>
        <button className="btn btn--outline" onClick={() => act('request_changes')} disabled={!!busy}>
          {busy === 'request_changes' ? 'Sending…' : 'Ask for changes'}
        </button>
        <button className="btn btn--danger" onClick={() => act('reject')} disabled={!!busy}>
          {busy === 'reject' ? 'Declining…' : 'Decline'}
        </button>
      </div>
    </section>
  );
}

function Deliver({ app, onChange }) {
  const dl = app.delivery || {};
  const [f, setF] = useState({
    playStoreUrl: dl.playStoreUrl || '',
    appStoreUrl: dl.appStoreUrl || '',
    adminUrl: dl.adminUrl || '',
    adminLoginEmail: dl.adminLoginEmail || app.user?.email || '',
    adminPassword: dl.adminPassword || '',
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const live = app.status === 'live';

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setError('');
    setSaved(false);
    try {
      const d = await api.post(`/api/admin/applications/${app.id}/deliver`, f);
      onChange(d.application);
      setSaved(true);
    } catch (err) {
      setErrors(err.fields || {});
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel stack" onSubmit={submit} noValidate>
      <h2 className="panel__title">{live ? 'App and admin details' : 'Mark as live'}</h2>
      {!live && (
        <p className="muted">
          These appear in the restaurant’s dashboard and they get an email saying their app is ready.
          {dl.etaEnd && ` Promised by ${fmtDate(dl.etaEnd, { weekday: 'short', day: 'numeric', month: 'short' })}.`}
        </p>
      )}
      <FormError>{error}</FormError>
      <TextField label="Google Play link" type="url" value={f.playStoreUrl} onChange={set('playStoreUrl')} error={errors.playStoreUrl} placeholder="https://play.google.com/store/apps/details?id=com.cullinari.…" />
      <TextField label="App Store link" optional type="url" value={f.appStoreUrl} onChange={set('appStoreUrl')} error={errors.appStoreUrl} />
      <TextField label="Admin dashboard address" type="url" value={f.adminUrl} onChange={set('adminUrl')} error={errors.adminUrl} placeholder="https://admin.cullinari.com" />
      <div className="row-2">
        <TextField label="Admin login email" type="email" value={f.adminLoginEmail} onChange={set('adminLoginEmail')} error={errors.adminLoginEmail} />
        <TextField label="Temporary password" value={f.adminPassword} onChange={set('adminPassword')} error={errors.adminPassword} autoComplete="off" />
      </div>
      <div className="panel__actions panel__actions--start">
        <button className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : live ? 'Save changes' : 'Mark live and notify restaurant'}</button>
        {saved && <span role="status" className="ok">{live ? 'Saved.' : 'Marked live.'}</span>}
      </div>
    </form>
  );
}

export default function AdminDetail() {
  const { id } = useParams();
  const [app, setApp] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/api/admin/applications/${id}`)
      .then((d) => setApp(d.application))
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <DashShell wide><FormError>{error}</FormError></DashShell>;
  if (!app) return <DashShell wide><p className="page-loading">Loading…</p></DashShell>;

  const plan = getPlan(app.plan);
  const d = app.details;
  const files = [app.files.logo, app.files.splash].filter(Boolean);

  return (
    <DashShell wide>
      <p><Link to="/admin">← All applications</Link></p>
      <div className="admin-head">
        <h1>{d.businessName || 'Untitled application'}</h1>
        <StatusBadge status={app.status} />
      </div>

      <div className="admin-grid">
        <div className="stack">
          {app.status === 'submitted' && <Review app={app} onChange={setApp} />}
          {['paid', 'live'].includes(app.status) && <Deliver app={app} onChange={setApp} />}

          <section className="panel">
            <h2 className="panel__title">What they sent</h2>
            <Summary app={app} details={d} plan={plan} />
            {d.tagline && <p><b>Tagline:</b> {d.tagline}</p>}
            {d.deliveryNotes && <p className="prewrap"><b>Delivery:</b> {d.deliveryNotes}</p>}
            {d.customFeatures && <p className="prewrap"><b>Custom features:</b> {d.customFeatures}</p>}
            {d.hasPlayAccount && <p><b>Has Google Play account:</b> {d.hasPlayAccount}</p>}
            {d.notes && <p className="prewrap"><b>Notes:</b> {d.notes}</p>}
          </section>

          <section className="panel">
            <h2 className="panel__title">Files</h2>
            <div className="thumbs">
              {files.map((f) => (
                <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="thumb">
                  <img src={f.url} alt={f.name} />
                  <span>{f.name}</span>
                </a>
              ))}
            </div>
            <ul className="files">
              {app.files.menu.map((f) => (
                <li key={f.url}><a href={f.url} target="_blank" rel="noreferrer">{f.name}</a></li>
              ))}
              {d.menuLink && <li><a href={d.menuLink} target="_blank" rel="noreferrer">Menu link: {d.menuLink}</a></li>}
            </ul>
          </section>
        </div>

        <aside className="stack">
          <section className="panel">
            <h2 className="panel__title">Contact</h2>
            <p>
              {app.user?.firstName} {app.user?.lastName}
              <br />
              <a href={`mailto:${app.user?.email}`}>{app.user?.email}</a>
              <br />
              <a href={`tel:${app.user?.phone}`}>{app.user?.phone}</a>
            </p>
          </section>

          {app.payment && (
            <section className="panel">
              <h2 className="panel__title">First payment</h2>
              <p>
                {formatNaira(app.payment.amount)} on {fmtDate(app.payment.paidAt)} by {app.payment.channel}
                <br />
                <code>{app.payment.reference}</code>
              </p>
              {app.payment.subscriptionCode && <p className="small">Monthly subscription: <code>{app.payment.subscriptionCode}</code></p>}
              {app.payment.subscriptionError && <p className="notice notice--warn small">Monthly charge not set up: {app.payment.subscriptionError}</p>}
            </section>
          )}

          {(app.pendingPlan || app.planChanges.length > 0) && (
            <section className="panel">
              <h2 className="panel__title">Plan changes</h2>
              {app.pendingPlan && (
                <p className="notice notice--warn small">
                  Moving to {getPlan(app.pendingPlan)?.name} on {fmtDate(app.pendingPlanAt)}.
                </p>
              )}
              <ol className="history">
                {app.planChanges.slice().reverse().map((c, i) => (
                  <li key={i}>
                    <b>{c.kind === 'upgrade' ? 'Upgrade' : 'Downgrade'}: {getPlan(c.from)?.name} → {getPlan(c.to)?.name}</b>
                    <span className="muted small">
                      {c.status} · {fmtDate(c.effectiveAt || c.requestedAt)}
                      {c.amount ? ` · ${formatNaira(c.amount)}` : ''}
                    </span>
                    {c.reference && <code className="small">{c.reference}</code>}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="panel">
            <h2 className="panel__title">History</h2>
            <ol className="history">
              {app.history.map((h, i) => (
                <li key={i}>
                  <b>{STATUS_LABEL[h.status] || h.status}</b>
                  <span className="muted small">{fmtDate(h.at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  {h.note && <p className="small prewrap">{h.note}</p>}
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </DashShell>
  );
}
