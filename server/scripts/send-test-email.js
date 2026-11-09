// Sends one test email using the SMTP settings in .env.
// Usage: npm run test-email -- you@example.com
import { config } from '../src/config.js';
import { verifyMailer, sendMail } from '../src/lib/mailer.js';
import { templates } from '../src/lib/emails.js';

const to = process.argv[2];
if (!to) {
  console.error('Usage: npm run test-email -- <address to send to>');
  process.exit(1);
}
if (!config.mail.host) {
  console.error('SMTP_HOST is empty in .env, so nothing would be sent. Fill in the SMTP settings first.');
  process.exit(1);
}

const ok = await verifyMailer();
if (!ok) {
  console.error('\nFix the SMTP settings above and try again. For Gmail: SMTP_USER is your full Gmail address and SMTP_PASS is the 16-letter app password.');
  process.exit(1);
}

// Uses a real template so you see exactly what restaurants will receive.
const msg = templates.passwordReset({ firstName: 'there' }, `${config.appUrl}/reset-password?token=test&email=test`);
const sent = await sendMail({ to, ...msg, subject: `Test email from Cullinari (${new Date().toLocaleTimeString('en-NG')})` });
console.log(sent ? `Sent to ${to}. From: ${config.mail.from}${config.mail.replyTo ? `, replies to ${config.mail.replyTo}` : ''}.` : 'Sending failed; see the error above.');
process.exit(sent ? 0 : 1);
