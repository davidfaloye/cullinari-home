import { Link } from 'react-router-dom';
import { SiteHeader, SiteFooter } from '../components/SiteChrome.jsx';
import { AdireField } from '../components/Brand.jsx';
import { PLANS, formatNaira } from '../../../shared/plans.js';

const STEPS = [
  ['Create your account', 'Your restaurant name, your name, email and phone number. Takes a minute.'],
  ['Choose a plan and send your details', 'Pick Starter, Growth or Pro, then upload your logo and menu and tell us your hours, colours and branches.'],
  ['We review your application', 'Our team checks everything, usually within one business day. We email you when it is approved or if anything is missing.'],
  ['Pay with Paystack', 'Pay the one-time app setup plus your first month, by card or bank transfer.'],
  ['Your app goes live', 'Within 2 to 5 business days, your Play Store link and admin login appear in your dashboard.'],
];

const MENU = [
  ['Party jollof with chicken', 'Smoky, served with dodo', 4500],
  ['Ofada rice and ayamase', 'Green pepper sauce, assorted', 5200],
  ['Amala, ewedu and gbegiri', 'With two pieces of beef', 3800],
  ['Chilled zobo', '50cl bottle', 900],
];

function HeroPhone() {
  return (
    <div className="hero-visual">
      <AdireField id="adire-hero" className="hero-visual__cloth" />
      <div className="phone" aria-hidden="true">
        <div className="phone__screen">
          <div className="phone__bar">
            <span className="phone__branch">&#8592;</span>
            <span className="phone__brand">Kay's Kitchen</span>
          </div>
          <div className="phone__chips">
            <span className="on">Rice</span>
            <span>Swallow</span>
            <span>Drinks</span>
          </div>
          <ul className="phone__menu">
            {MENU.map(([name, sub, price]) => (
              <li key={name}>
                <span>
                  <b>{name}</b>
                  <small>{sub}</small>
                </span>
                <em>{formatNaira(price)}</em>
              </li>
            ))}
          </ul>
          <div className="phone__cart">
            <span>2 items in your order</span>
            <span>{formatNaira(9700)}</span>
          </div>
        </div>
      </div>
      <div className="ticket" aria-hidden="true">
        <p className="ticket__head">New order #214 · Delivery</p>
        <p>1 × Party jollof with chicken</p>
        <p>1 × Ofada rice and ayamase</p>
        <p className="ticket__foot">Paid · {formatNaira(9700)}</p>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="container hero__grid">
            <div className="hero__copy">
              <h1>Your restaurant’s own ordering app, and the back office to run it.</h1>
              <p className="lede">
                Cullinari puts your menu on the Google Play Store under your name. Every order lands in an admin
                dashboard where you also track stock, sales and branches.
              </p>
              <div className="hero__cta">
                <Link className="btn btn--primary" to="/signup">Create your account</Link>
                <a className="btn btn--outline" href="#pricing">See plans</a>
              </div>
              <p className="hero__note">Plans from {formatNaira(PLANS[0].monthly)} a month. Your app is live 2 to 5 business days after payment.</p>
            </div>
            <HeroPhone />
          </div>
        </section>

        <section id="how" className="section">
          <div className="container">
            <h2 className="section__title">From sign-up to your app on the Play Store</h2>
            <p className="section__lede">Everything happens in your Cullinari dashboard. We email you at every step.</p>
            <ol className="steps">
              {STEPS.map(([title, body]) => (
                <li key={title}>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="features" className="section section--tint">
          <div className="container">
            <h2 className="section__title">Two things, connected</h2>
            <div className="split">
              <div>
                <h3>An ordering app with your name on it</h3>
                <p>Customers download it from the Play Store, browse your menu with prices and place an order for pickup or delivery.</p>
                <ul className="ticks">
                  <li>Your name, logo and colours on the icon and every screen</li>
                  <li>Menu, prices and sold-out items update the moment you change them</li>
                  <li>Customers get a notification as their order moves from accepted to ready</li>
                  <li>No listing beside other restaurants, and no commission per order</li>
                </ul>
              </div>
              <div>
                <h3>An admin dashboard for the whole kitchen</h3>
                <p>Your team signs in on any laptop or phone. Cashier, kitchen and manager each see what they need.</p>
                <ul className="ticks">
                  <li>Live order queue with a sound for every new order</li>
                  <li>Inventory with low-stock alerts and a record of every stock change</li>
                  <li>Sales by day, dish, hour and branch, with CSV export</li>
                  <li>Branches, staff and opening hours in one account</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="section">
          <div className="container">
            <h2 className="section__title">Pricing in naira</h2>
            <p className="section__lede">
              A monthly fee for the platform, plus a one-time setup fee to build and publish your app. You pay both
              together once your application is approved.
            </p>
            <div className="plans">
              {PLANS.map((p) => (
                <article key={p.code} className={`plan${p.featured ? ' plan--featured' : ''}`}>
                  {p.featured && <p className="plan__flag">Most restaurants choose this</p>}
                  <h3>{p.name}</h3>
                  <p className="plan__for">{p.for}</p>
                  <p className="plan__price">
                    <strong>{formatNaira(p.monthly)}</strong> <span>a month</span>
                  </p>
                  <dl className="plan__rows">
                    {p.rows.map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <ul className="plan__inc">
                    {p.inc.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                  <p className="plan__first">
                    First payment {formatNaira(p.setup + p.monthly)}
                    <span>setup plus first month</span>
                  </p>
                  <Link className={`btn ${p.featured ? 'btn--palm' : 'btn--outline'} btn--block`} to={`/signup?plan=${p.code}`}>
                    Start with {p.name}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="section section--tint">
          <div className="container faq">
            <h2 className="section__title">Questions restaurants ask us</h2>
            <div className="faq__list">
              <details>
                <summary>What does the setup fee pay for?</summary>
                <p>Building your ordering app with your name, logo, colours and menu, and publishing it on the Google Play Store. You pay it once.</p>
              </details>
              <details>
                <summary>How is the monthly fee charged?</summary>
                <p>In naira through Paystack. Your first month is paid together with the setup fee. After that, the same card is charged automatically each month. You get an email receipt every time.</p>
              </details>
              <details>
                <summary>What should I have ready before I apply?</summary>
                <p>Your logo, your menu with prices (a PDF, photo or spreadsheet is fine), opening hours, the address of each branch, and your brand colours if you have them.</p>
              </details>
              <details>
                <summary>How long until my app is live?</summary>
                <p>We review new applications within about one business day. After you pay, your app and admin dashboard are ready in 2 to 5 business days.</p>
              </details>
              <details>
                <summary>What happens if I reach my daily order limit?</summary>
                <p>Orders already placed are never cancelled. The app stops taking new online orders for the rest of that day, and you can upgrade from your dashboard to lift the limit straight away.</p>
              </details>
              <details>
                <summary>Can I change my plan later?</summary>
                <p>Yes. Upgrades apply immediately; you pay the difference in setup fee and the new monthly price. Downgrades start at your next renewal, and none of your data is deleted.</p>
              </details>
            </div>
          </div>
        </section>

        <section className="closing">
          <AdireField id="adire-closing" className="closing__cloth" />
          <div className="container closing__inner">
            <h2>Ready to take orders in your own app?</h2>
            <Link className="btn btn--palm" to="/signup">Create your account</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
