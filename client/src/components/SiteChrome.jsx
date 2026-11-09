import { Link } from 'react-router-dom';
import { Logo } from './Brand.jsx';
import { useAuth } from '../auth.jsx';

export function SiteHeader() {
  const { user } = useAuth();
  return (
    <header className="site-header">
      <div className="container site-header__row">
        <Logo />
        <nav className="site-nav" aria-label="Main">
          <a href="/#how">How it works</a>
          <a href="/#features">What you get</a>
          <a href="/#pricing">Pricing</a>
          <a href="/#faq">Questions</a>
        </nav>
        <div className="site-header__actions">
          {user ? (
            <Link className="btn btn--primary btn--sm" to={user.role === 'admin' ? '/admin' : '/dashboard'}>
              Open dashboard
            </Link>
          ) : (
            <>
              <Link className="btn btn--quiet btn--sm" to="/login">Sign in</Link>
              <Link className="btn btn--primary btn--sm" to="/signup">Create account</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div>
          <Logo light />
          <p>Ordering apps and admin dashboards for restaurants in Nigeria.</p>
        </div>
        <div>
          <h2>Product</h2>
          <ul>
            <li><a href="/#how">How it works</a></li>
            <li><a href="/#pricing">Pricing</a></li>
            <li><a href="/#faq">Questions</a></li>
          </ul>
        </div>
        <div>
          <h2>Account</h2>
          <ul>
            <li><Link to="/signup">Create account</Link></li>
            <li><Link to="/login">Sign in</Link></li>
            <li><Link to="/terms">Terms</Link></li>
          </ul>
        </div>
        <div>
          <h2>Talk to us</h2>
          <ul>
            <li><a href="mailto:hello@cullinari.com">hello@cullinari.com</a></li>
          </ul>
        </div>
      </div>
      <div className="container site-footer__legal">
        <span>© {new Date().getFullYear()} Cullinari</span>
        <span>A product of Euri Technologies, Abuja</span>
      </div>
    </footer>
  );
}
