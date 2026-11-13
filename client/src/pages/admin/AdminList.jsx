import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import DashShell, { StatusBadge, STATUS_LABEL, fmtDate } from '../../components/DashShell.jsx';
import { FormError } from '../../components/Form.jsx';
import { api } from '../../api.js';
import { getPlan } from '../../../../shared/plans.js';
import Spinner from '../../components/Spinner.jsx';


// Tabs in the order the team works through them.
const TABS = ['submitted', 'paid', 'approved', 'changes_requested', 'live', 'rejected', 'all'];

export default function AdminList() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || 'submitted';
  const [q, setQ] = useState(params.get('q') || '');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    const qs = new URLSearchParams({ status, q: params.get('q') || '' });
    api
      .get(`/api/admin/applications?${qs}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [status, params]);

  const total = data ? Object.entries(data.counts).filter(([k]) => k !== 'draft').reduce((n, [, v]) => n + v, 0) : 0;

  return (
    <DashShell wide>
      <div className="admin-head">
        <h1>Applications</h1>
        <form
          className="search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setParams({ status, q });
          }}
        >
          <label htmlFor="q" className="sr-only">Search by restaurant or city</label>
          <input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search restaurant or city" />
          <button className="btn btn--outline btn--sm">Search</button>
        </form>
      </div>

      <nav className="tabs" aria-label="Filter by status">
        {TABS.map((t) => (
          <Link key={t} to={`?status=${t}`} className={t === status ? 'is-on' : ''} aria-current={t === status ? 'page' : undefined}>
            {t === 'all' ? 'All' : STATUS_LABEL[t]}
            <span className="tabs__n">{data ? (t === 'all' ? total : data.counts[t] || 0) : ''}</span>
          </Link>
        ))}
      </nav>

      <FormError>{error}</FormError>
      {!data ? (
        <Spinner />
      ) : data.applications.length === 0 ? (
        <p className="empty">Nothing here. {status === 'submitted' ? 'New applications will appear in this list.' : ''}</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Restaurant</th>
                <th scope="col">Plan</th>
                <th scope="col">Contact</th>
                <th scope="col">Location</th>
                <th scope="col">Status</th>
                <th scope="col">Sent</th>
              </tr>
            </thead>
            <tbody>
              {data.applications.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link to={`/admin/applications/${a.id}`}>{a.details.businessName || a.user?.restaurantName || 'Untitled'}</Link>
                  </td>
                  <td>{getPlan(a.plan)?.name || '—'}</td>
                  <td>
                    {a.user?.firstName} {a.user?.lastName}
                    <br />
                    <span className="muted small">{a.user?.phone}</span>
                  </td>
                  <td>{[a.details.city, a.details.state].filter(Boolean).join(', ')}</td>
                  <td>
                    <StatusBadge status={a.status} />
                    {a.status === 'paid' && a.delivery?.etaEnd && <div className="muted small">Due by {fmtDate(a.delivery.etaEnd, { day: 'numeric', month: 'short' })}</div>}
                  </td>
                  <td>{fmtDate(a.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashShell>
  );
}
