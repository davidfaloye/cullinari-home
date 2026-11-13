// Sends email through one of two drivers, chosen by MAIL_DRIVER:
//   resend  Resend's HTTPS API. Works on Render's free plan, which blocks SMTP ports 25/465/587.
//   smtp    Classic SMTP via nodemailer (Gmail, Brevo SMTP, etc). Needs a paid Render plan in production.
// If MAIL_DRIVER is not set: "resend" when RESEND_API_KEY exists, otherwise "smtp".
// With no credentials for the chosen driver, emails are printed to the console (development).
import nodemailer from 'nodemailer';
import { config } from '../config.js';

const { driver } = config.mail;

let transport = null;
if (driver === 'smtp' && config.mail.host) {
  transport = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.port === 465, // 465 = TLS from the start; 587 = STARTTLS
    auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
    pool: true,
    maxConnections: 2,
    connectionTimeout: 10_000, // fail fast instead of hanging when the port is blocked
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

const resendReady = driver === 'resend' && !!config.mail.resendKey;
const live = resendReady || !!transport;

// Checks the setup once at startup so a problem shows up in the logs straight away,
// not the first time a restaurant signs up.
export async function verifyMailer() {
  if (!['resend', 'smtp'].includes(driver)) {
    console.error(`[mail] MAIL_DRIVER must be "resend" or "smtp" (got "${driver}"). Emails will be printed, not sent.`);
    return false;
  }
  if (!live) {
    console.log(`[mail] driver=${driver} but no credentials set: emails will be printed here instead of sent.`);
    return false;
  }
  if (driver === 'resend') {
    console.log(`[mail] Resend ready, sending from ${config.mail.from}`);
    return true;
  }
  try {
    await transport.verify();
    console.log(`[mail] SMTP ready: ${config.mail.host} as ${config.mail.user}`);
    return true;
  } catch (err) {
    console.error(`[mail] SMTP login failed for ${config.mail.user} on ${config.mail.host}: ${err.message}`);
    return false;
  }
}

async function sendViaResend({ to, subject, html, text }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.mail.resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: config.mail.from,
      to: [to],
      subject,
      html,
      text,
      ...(config.mail.replyTo ? { reply_to: config.mail.replyTo } : {}),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
  }
}

// Sends an email. Never throws: a failed email must not break signup, review or payment.
export async function sendMail({ to, subject, html, text }) {
  if (!to) return false;
  if (!live) {
    console.log(`\n[mail:dev] to=${to}\n  subject: ${subject}\n  ${text.replace(/\n/g, '\n  ')}\n`);
    return true;
  }
  try {
    if (driver === 'resend') {
      await sendViaResend({ to, subject, html, text });
    } else {
      await transport.sendMail({ from: config.mail.from, replyTo: config.mail.replyTo || undefined, to, subject, html, text });
    }
    return true;
  } catch (err) {
    console.error(`[mail] failed to send "${subject}" to ${to}:`, err.message);
    return false;
  }
}