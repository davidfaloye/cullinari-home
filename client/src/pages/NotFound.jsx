import { Link } from 'react-router-dom';
import { SiteHeader, SiteFooter } from '../components/SiteChrome.jsx';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="container prose-page">
        <h1>This page does not exist</h1>
        <p>The link may be old or mistyped.</p>
        <p><Link className="btn btn--primary" to="/">Go to the home page</Link></p>
      </main>
      <SiteFooter />
    </>
  );
}
