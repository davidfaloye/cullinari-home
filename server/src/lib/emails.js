// Every email the platform sends, in one place. Each builder returns { subject, text, html }.
import { config } from '../config.js';
import { formatNaira, getPlan, describeLimits } from '../../../shared/plans.js';
import { sendMail } from './mailer.js';

const INDIGO = '#22306e';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'Africa/Lagos' });
}

// paragraphs: array of strings (plain text, escaped here). button: { label, url }.
function layout({ heading, paragraphs, button, footnote }) {
  const html = `<!doctype html><html><body style="margin:0;background:#eef0f7;font-family:Arial,Helvetica,sans-serif;color:#151a33">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f7;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:${INDIGO};padding:18px 28px;color:#ffffff;font-size:20px;font-weight:bold">Cullinari</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#151a33">${esc(heading)}</h1>
${paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${esc(p)}</p>`).join('')}
${button ? `<p style="margin:22px 0 8px"><a href="${esc(button.url)}" style="display:inline-block;background:#e8892b;color:#151a33;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px">${esc(button.label)}</a></p>` : ''}
${footnote ? `<p style="margin:20px 0 0;font-size:13px;color:#5b6283;line-height:1.5">${esc(footnote)}</p>` : ''}
</td></tr>
<tr><td style="padding:16px 28px;background:#f6f7fb;font-size:12px;color:#5b6283">Cullinari · Restaurant admin and ordering apps · cullinari.com</td></tr>
</table></td></tr></table></body></html>`;
  const text = [heading, '', ...paragraphs.flatMap((p) => [p, '']), button ? `${button.label}: ${button.url}` : '', footnote || '']
    .join('\n')
    .trim();
  return { html, text };
}

const dashboard = () => `${config.appUrl}/dashboard`;

function build(subject, body) {
  return { subject, ...layout(body) };
}

export const templates = {
  welcome: (user, verifyUrl) =>
    build('Confirm your email to finish setting up Cullinari', {
      heading: `Welcome, ${user.firstName}`,
      paragraphs: [
        `Your Cullinari account for ${user.restaurantName} is ready. Confirm this email address so we can send you approvals, receipts and your app login.`,
        'After that, choose a plan in your dashboard and send us the details we need to build your ordering app and admin dashboard. It takes about ten minutes.',
      ],
      button: { label: 'Confirm my email', url: verifyUrl },
      footnote: 'The link works for 48 hours. If you did not create this account, ignore this email.',
    }),

  verifyEmail: (user, verifyUrl) =>
    build('Confirm your email for Cullinari', {
      heading: 'Confirm your email address',
      paragraphs: [`Hi ${user.firstName}, use the button below to confirm ${user.email} for your Cullinari account.`],
      button: { label: 'Confirm my email', url: verifyUrl },
      footnote: 'The link works for 48 hours and replaces any earlier link. If you did not ask for this, ignore this email.',
    }),

  submitted: (user, app) =>
    build('We received your application', {
      heading: 'Your application is with our team',
      paragraphs: [
        `Thanks, ${user.firstName}. We received the details for ${app.details.businessName} on the ${getPlan(app.plan)?.name} plan.`,
        'Our team reviews every application, usually within one business day. We will email you as soon as it is approved or if we need anything else.',
      ],
      button: { label: 'View your application', url: dashboard() },
    }),

  teamNewApplication: (user, app) =>
    build(`New application: ${app.details.businessName} (${getPlan(app.plan)?.name})`, {
      heading: 'New application to review',
      paragraphs: [
        `${app.details.businessName} — ${getPlan(app.plan)?.name} plan`,
        `Contact: ${user.firstName} ${user.lastName}, ${user.email}, ${user.phone}`,
        `Location: ${app.details.city}, ${app.details.state}`,
      ],
      button: { label: 'Review in the console', url: `${config.appUrl}/admin/applications/${app._id}` },
    }),

  changesRequested: (user, app) =>
    build('Your application needs a few changes', {
      heading: 'A few changes before we can approve',
      paragraphs: [
        `Hi ${user.firstName}, we reviewed the application for ${app.details.businessName}. Before we approve it, please update the following:`,
        app.reviewNote || 'See the note in your dashboard.',
        'Make the changes in your dashboard and submit again.',
      ],
      button: { label: 'Update your application', url: dashboard() },
    }),

  rejected: (user, app) =>
    build('An update on your Cullinari application', {
      heading: 'We could not approve this application',
      paragraphs: [
        `Hi ${user.firstName}, we are not able to approve the application for ${app.details.businessName} at this time.`,
        app.reviewNote || '',
        'If you have questions, reply to this email and our team will get back to you.',
      ].filter(Boolean),
    }),

  approved: (user, app, amounts) =>
    build('Approved: pay to start building your app', {
      heading: 'Your application is approved',
      paragraphs: [
        `Good news, ${user.firstName}. ${app.details.businessName} is approved for the ${getPlan(app.plan)?.name} plan.`,
        `To start, pay ${formatNaira(amounts.total)}: the one-time app setup of ${formatNaira(amounts.setup)} plus your first month of ${formatNaira(amounts.monthly)}. Payment is by card or bank transfer through Paystack.`,
        'Your ordering app and admin login will be ready 2 to 5 business days after payment.',
      ],
      button: { label: `Pay ${formatNaira(amounts.total)}`, url: dashboard() },
    }),

  paymentReceived: (user, app) =>
    build('Payment received: we are building your app', {
      heading: 'Payment received',
      paragraphs: [
        `Thanks, ${user.firstName}. We received ${formatNaira(app.payment.amount)} for ${app.details.businessName} (reference ${app.payment.reference}).`,
        `We are now building your ordering app and admin dashboard. Expect them between ${fmtDate(app.delivery.etaStart)} and ${fmtDate(app.delivery.etaEnd)}.`,
        'When they are ready, your Play Store link and admin login will appear in your dashboard and we will email you.',
      ],
      button: { label: 'Open your dashboard', url: dashboard() },
      footnote: `Your monthly fee of ${formatNaira(getPlan(app.plan)?.monthly)} renews one month from today on the same card.`,
    }),

  teamPaymentReceived: (user, app) =>
    build(`Paid: ${app.details.businessName} — start the build`, {
      heading: 'Payment received',
      paragraphs: [
        `${app.details.businessName} paid ${formatNaira(app.payment.amount)} (ref ${app.payment.reference}).`,
        `Promised delivery: ${fmtDate(app.delivery.etaStart)} – ${fmtDate(app.delivery.etaEnd)}.`,
        app.payment.subscriptionError ? `Subscription was not created: ${app.payment.subscriptionError}` : '',
      ].filter(Boolean),
      button: { label: 'Open in the console', url: `${config.appUrl}/admin/applications/${app._id}` },
    }),

  live: (user, app) =>
    build('Your ordering app and admin dashboard are ready', {
      heading: `${app.details.appName || app.details.businessName} is live`,
      paragraphs: [
        `Hi ${user.firstName}, your ordering app is on the Google Play Store and your admin dashboard is ready.`,
        'Your Play Store link, admin address and login details are in your Cullinari dashboard. Change the password the first time you sign in.',
      ],
      button: { label: 'See your app and login', url: dashboard() },
    }),

  upgraded: (user, app, change) =>
    build(`You are now on ${getPlan(change.to)?.name}`, {
      heading: `Upgraded to ${getPlan(change.to)?.name}`,
      paragraphs: [
        `Thanks, ${user.firstName}. ${app.details.businessName} moved from ${getPlan(change.from)?.name} to ${getPlan(change.to)?.name}, and the new limits apply now.`,
        `You paid ${formatNaira(change.amount)}: ${formatNaira(change.setupDiff)} setup difference and ${formatNaira(change.proratedMonthly)} for the rest of this billing month. From your next renewal, the monthly fee is ${formatNaira(getPlan(change.to)?.monthly)}.`,
        'Our team will contact you to set up the new app features, such as your splash screen and menu layout, and then publish an update to your app.',
      ],
      button: { label: 'Open your dashboard', url: dashboard() },
    }),

  downgradeScheduled: (user, app) =>
    build(`Your plan changes to ${getPlan(app.pendingPlan)?.name} on ${fmtDate(app.pendingPlanAt)}`, {
      heading: 'Plan change scheduled',
      paragraphs: [
        `Hi ${user.firstName}, ${app.details.businessName} stays on ${getPlan(app.plan)?.name} until ${fmtDate(app.pendingPlanAt)}. After that you are on ${getPlan(app.pendingPlan)?.name} at ${formatNaira(getPlan(app.pendingPlan)?.monthly)} a month.`,
        `${getPlan(app.pendingPlan)?.name} allows ${describeLimits(getPlan(app.pendingPlan))}. Nothing is deleted: anything above those limits becomes read-only, and you choose what stays active in your admin dashboard.`,
        'You can cancel this change from your Cullinari dashboard any time before that date.',
      ],
      button: { label: 'Open your dashboard', url: dashboard() },
    }),

  teamPlanChange: (user, app, summary) =>
    build(`Plan change: ${app.details.businessName}`, {
      heading: 'Plan change',
      paragraphs: [summary, `Contact: ${user.firstName} ${user.lastName}, ${user.email}, ${user.phone}`],
      button: { label: 'Open in the console', url: `${config.appUrl}/admin/applications/${app._id}` },
    }),

  paymentFailed: (user, app) =>
    build('Your monthly Cullinari payment did not go through', {
      heading: 'We could not charge your card',
      paragraphs: [
        `Hi ${user.firstName}, the monthly payment for ${app.details.businessName} failed.`,
        'Your app and dashboard keep working for 7 days. Please update your card from the link Paystack sent you, or reply to this email and we will help.',
      ],
    }),

  passwordReset: (user, url) =>
    build('Reset your Cullinari password', {
      heading: 'Reset your password',
      paragraphs: [`Hi ${user.firstName}, use the button below to choose a new password. The link works for one hour.`],
      button: { label: 'Choose a new password', url },
      footnote: 'If you did not ask for this, ignore this email. Your password has not changed.',
    }),
};

// Convenience: build and send in one call. Fire-and-forget safe (sendMail never throws).
export function notify(to, name, ...args) {
  const msg = templates[name](...args);
  return sendMail({ to, ...msg });
}

export function notifyTeam(name, ...args) {
  return notify(config.mail.team, name, ...args);
}
