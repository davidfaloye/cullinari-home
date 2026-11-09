import { SiteHeader, SiteFooter } from '../components/SiteChrome.jsx';

// Plain-language terms. Have a lawyer review before launch; bump TERMS_VERSION in server/src/routes/auth.js when this changes.
export default function Terms() {
  return (
    <>
      <SiteHeader />
      <main className="container prose-page">
        <h1>Terms of service</h1>
        <p className="muted">Last updated November 2026</p>

        <h2>The service</h2>
        <p>
          Cullinari, a product of Euri Technologies, provides restaurants with an admin dashboard and a branded ordering
          app published on the Google Play Store. These terms apply to the restaurant that creates an account (“you”).
        </p>

        <h2>Applications and approval</h2>
        <p>
          We review every application before building an app. We may ask for changes or decline an application, for
          example if the details are incomplete or the business cannot be verified. You confirm that you have the right
          to use the name, logo, photos and menu you send us.
        </p>

        <h2>Fees</h2>
        <p>
          Prices are in naira and shown on our pricing page. After approval you pay the one-time setup fee for your plan
          together with the first month. The monthly fee then renews automatically on the card you paid with, through
          Paystack, until you cancel. The setup fee pays for building and publishing your app and is not refunded once
          work has started.
        </p>

        <h2>Delivery</h2>
        <p>
          We aim to deliver your ordering app and admin login within 2 to 5 business days of payment. Google Play review
          times are outside our control and can occasionally add a few days.
        </p>

        <h2>Plan limits</h2>
        <p>
          Each plan has a daily order limit, an inventory item limit and a branch limit. When a limit is reached, orders
          already placed are kept and the app stops accepting new online orders until the next day or until you upgrade.
        </p>

        <h2>Late payment and cancellation</h2>
        <p>
          If a monthly payment fails, your service keeps working for 7 days. After that the admin dashboard becomes
          read-only and the app pauses until payment is made. You can cancel at any time; service runs to the end of the
          paid month. We keep your data for 90 days after cancellation, then delete it after emailing you an export.
        </p>

        <h2>Your data</h2>
        <p>
          You own your menu, orders, customer and sales data. We use it only to run the service for you, keep it separate
          from other restaurants, and do not sell it. We process payment details through Paystack and never store card
          numbers.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms: <a href="mailto:hello@cullinari.com">hello@cullinari.com</a>.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
