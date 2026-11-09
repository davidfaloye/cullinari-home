# cullinari-home

The public website for **cullinari.com** and the client onboarding flow behind it.

- **Landing page**: what Cullinari is, how it works, naira pricing, FAQ.
- **Client dashboard**: create an account → choose a plan → send restaurant details and files → wait for review → pay with Paystack → see the Play Store link and admin login when live.
- **Team console** (`/admin`): review applications (approve, ask for changes, decline), see payments, and mark apps live with their links and login.
- **Emails** at every step, to the restaurant and to the team.

Plain JavaScript throughout: React + Vite for the website, Express + MongoDB (Mongoose) for the API. In production one Node process serves both.

## Flow and statuses

```
draft ──submit──▶ submitted ──approve──▶ approved ──Paystack──▶ paid ──mark live──▶ live
                     │  ▲
       ask for changes  └── resubmit ── changes_requested
                     └── decline ──▶ rejected
```

| Step | Who | Email sent |
| --- | --- | --- |
| Sign up | Restaurant | Welcome |
| Send application | Restaurant | “We received your application” + team alert |
| Ask for changes / decline | Team | Changes needed / not approved, with the team’s note |
| Approve | Team | “Approved: pay to start” with the amount |
| Pay (setup + first month) | Restaurant | Payment received with the 2–5 business day window + team alert |
| Mark live | Team | “Your app is ready” (login details stay in the dashboard, not the email) |
| Monthly charge fails | Paystack webhook | Payment failed |
| Forgot password | Restaurant | Reset link (1 hour) |

## Plans

Defined once in `shared/plans.js` and used by both the website and the API (prices, first-payment amount, branch limits, which app options each plan may choose). Change prices there.

| Plan | Monthly | Setup (once) | First payment |
| --- | --- | --- | --- |
| Starter | ₦28,000 | ₦75,000 | ₦103,000 |
| Growth | ₦63,000 | ₦200,000 | ₦263,000 |
| Pro | ₦140,000 | ₦390,000 | ₦530,000 |

## Run locally

Needs Node 20+ and MongoDB (local, or a free MongoDB Atlas cluster).

```bash
cp .env.example .env        # fill in MONGODB_URI at least
npm install
npm run create-admin -- you@cullinari.com 'a-long-password' First Last
npm run dev                 # website on :5173, API on :4000
```

Without `SMTP_HOST`, emails are printed in the API terminal instead of being sent.

## Paystack setup

1. Put your secret key in `PAYSTACK_SECRET_KEY` (test key first).
2. In Paystack → Settings → API Keys & Webhooks, set the webhook URL to `https://cullinari.com/api/payments/webhook`.
3. For automatic monthly billing, create three **monthly** plans in Paystack (₦28,000, ₦63,000, ₦140,000) and put their codes in `PAYSTACK_PLAN_STARTER/GROWTH/PRO`.

How the money moves: after approval the restaurant pays **setup + first month** in one transaction. On success the API records it (from the redirect or the webhook, whichever arrives first, exactly once), sets the 2–5 business day delivery window, and starts a Paystack subscription on the same card **one month later**. If the customer paid by bank transfer or USSD there is no reusable card, so no subscription is created; the team console flags this so you can arrange the monthly charge.

## Deploy on Render

`render.yaml` describes one web service. Set the secret env vars in the dashboard and attach a persistent disk for uploads (set `UPLOAD_DIR` to its mount path, e.g. `/var/data/uploads`); without a disk, uploaded logos and menus are lost on each deploy.

## Layout

```
shared/plans.js          plan prices and limits (website + API)
server/src/index.js      Express app; serves client/dist in production
server/src/routes/       auth, application (draft/upload/submit), payments, admin, files
server/src/lib/          emails, mailer, paystack, uploads, crypto, business days
server/scripts/          create-admin
client/src/pages/        Landing, Signup, Login, Dashboard, PaymentReturn, admin/*
client/src/components/   application form, uploads, layout
```

## Not built yet

- Email address verification on sign-up.
- Plan upgrades/downgrades from the dashboard after going live.
- Public holidays in the delivery estimate (add dates to `server/src/lib/businessDays.js`).
- The terms page is plain-language; have it reviewed before launch.
