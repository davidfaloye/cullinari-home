import nodemailer from 'nodemailer';
import { config } from '../config.js';

let transport = null;
if (config.mail.host) {
  transport = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.port === 465,
    auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
  });
}

// Sends an email. Never throws: a failed email must not break signup, review or payment.
// Without SMTP settings (development) the message is printed to the console.
export async function sendMail({ to, subject, html, text }) {
  if (!to) return;
  if (!transport) {
    console.log(`\n[mail:dev] to=${to}\n  subject: ${subject}\n  ${text.replace(/\n/g, '\n  ')}\n`);
    return;
  }
  try {
    await transport.sendMail({ from: config.mail.from, to, subject, html, text });
  } catch (err) {
    console.error(`[mail] failed to send "${subject}" to ${to}:`, err.message);
  }
}
