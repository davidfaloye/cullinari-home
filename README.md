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
| Sign up | Restaurant | Welcome + confirm-your-email link (48 h) |
| Ask for a new link | Restaurant | Confirm your email |
| Send application | Restaurant | “We received your application” + team alert |
| Ask for changes / decline | Team | Changes needed / not approved, with the team’s note |
| Approve | Team | “Approved: pay to start” with the amount |
| Pay (setup + first month) | Restaurant | Payment received with the 2–5 business day window + team alert |
| Mark live | Team | “Your app is ready” (login details stay in the dashboard, not the email) |
| Upgrade plan (paid) | Restaurant | “You are now on …” + team alert |
| Downgrade / cancel downgrade | Restaurant | Plan change scheduled + team alert |
| Monthly charge fails | Paystack webhook | Payment failed |
| Forgot password | Restaurant | Reset link (1 hour) |

## Email confirmation

New accounts get a confirmation link (valid 48 hours; asking for a new one cancels the old). Restaurants can fill in their application straight away, but **sending it and paying need a confirmed email**, because approvals, receipts and login details go there. Resetting a password also confirms the address. Team accounts made with `create-admin` are confirmed automatically.

## Changing plan after going live

From the **Your plan** section of the dashboard:

- **Upgrade**: the restaurant pays the setup difference plus the rest of the current billing month at the new price, through Paystack. The plan changes the moment payment is confirmed, and the Paystack subscription moves to the new monthly price from the next renewal. The team is emailed to set up the new app features (splash screen, layouts, domain) and publish an app update.
- **Downgrade**: no charge or refund. It is scheduled for the end of the current billing month, the subscription renews at the lower price, and the restaurant can cancel it any time before then. The plan switches automatically on that date. Nothing is deleted.

Billing months run from the day of the first payment (paid 14 March → 14 Mar–14 Apr, and so on). Example: Growth → Pro with 20 of 30 days left costs ₦190,000 setup difference + ₦51,333 (₦77,000 × 20/30) = ₦241,333 today, then ₦140,000 a month.

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

## Email (Gmail)

1. On the Google account that will send the emails, turn on 2-Step Verification.
2. Create an app password at https://myaccount.google.com/apppasswords (name it "Cullinari"). Copy the 16 letters.
3. In `.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=yourname@gmail.com
   SMTP_PASS=abcd efgh ijkl mnop
   MAIL_FROM="Cullinari <yourname@gmail.com>"
   MAIL_REPLY_TO=hello@cullinari.com
   TEAM_EMAIL=yourname@gmail.com
   ```
4. Check it: `npm run test-email -- you@example.com`. The API also logs `[mail] SMTP ready` or the login error when it starts.

Gmail limits a personal account to about 500 recipients a day, and Google Workspace to about 2,000. That is plenty for sign-ups and notifications. If you outgrow it, or want mail to come from `@cullinari.com` with better inbox placement, switch to a transactional provider (Brevo, Resend, Zoho ZeptoMail) by changing only these variables.

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

- The admin platform (`davidfaloye/cullinari`) needs to read each restaurant's current plan from here to enforce the new limits after a plan change.
- Public holidays in the delivery estimate (add dates to `server/src/lib/businessDays.js`).
- The terms page is plain-language; have it reviewed before launch.
