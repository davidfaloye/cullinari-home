import nodemailer from 'nodemailer';
import { config } from '../config.js';

let transport = null;
if (config.mail.host) {
  transport = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.port === 465, // 465 = TLS from the start; 587 = STARTTLS
    auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
    pool: true, // reuse one connection instead of logging in for every email
    maxConnections: 2,
  });
}

// Checks the SMTP login once at startup so a wrong password shows up in the logs straight away,
// not the first time a restaurant signs up.
export async function verifyMailer() {
  if (!transport) {
    console.log('[mail] SMTP_HOST not set: emails will be printed here instead of sent.');
    return false;
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

// Sends an email. Never throws: a failed email must not break signup, review or payment.
// Without SMTP settings (development) the message is printed to the console.
export async function sendMail({ to, subject, html, text }) {
  if (!to) return false;
  if (!transport) {
    console.log(`\n[mail:dev] to=${to}\n  subject: ${subject}\n  ${text.replace(/\n/g, '\n  ')}\n`);
    return true;
  }
  try {
    await transport.sendMail({
      from: config.mail.from,
      replyTo: config.mail.replyTo || undefined,
      to,
      subject,
      html,
      text,
    });
    return true;
  } catch (err) {
    console.error(`[mail] failed to send "${subject}" to ${to}:`, err.message);
    return false;
  }
}
