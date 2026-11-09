import { Link, useNavigate } from 'react-router-dom';
import { Logo } from './Brand.jsx';
import { useAuth } from '../auth.jsx';

export default function DashShell({ children, wide = false }) {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  return (
    <div className="dash">
      <header className="dash__header">
        <div className={`container${wide ? ' container--wide' : ''} dash__header-row`}>
          <Logo />
          <div className="dash__who">
            {user?.role === 'admin' && <Link to="/admin">Applications</Link>}
            <span className="dash__name">{user?.role === 'admin' ? `${user.firstName} (Cullinari team)` : user?.restaurantName}</span>
            <button
              type="button"
              className="btn btn--quiet btn--sm"
              onClick={async () => {
                await signOut();
                nav('/', { replace: true });
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className={`container${wide ? ' container--wide' : ''} dash__main`}>{children}</main>
    </div>
  );
}

export const STATUS_LABEL = {
  draft: 'Not sent yet',
  submitted: 'Under review',
  changes_requested: 'Changes requested',
  approved: 'Approved, awaiting payment',
  rejected: 'Not approved',
  paid: 'Paid, app in progress',
  live: 'Live',
};

export function StatusBadge({ status }) {
  return <span className={`badge badge--${status}`}>{STATUS_LABEL[status] || status}</span>;
}

export function fmtDate(d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', ...opts });
}
