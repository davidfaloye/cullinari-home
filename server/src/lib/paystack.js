import crypto from 'node:crypto';
import { config } from '../config.js';
import { HttpError } from '../middleware/errors.js';

const BASE = 'https://api.paystack.co';

async function call(method, pathname, body) {
  if (!config.paystack.secretKey) throw new HttpError(503, 'Payments are not set up yet. Contact the Cullinari team.');
  const res = await fetch(BASE + pathname, {
    method,
    headers: { Authorization: `Bearer ${config.paystack.secretKey}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.status === false) {
    const msg = json.message || `Paystack request failed (${res.status})`;
    const err = new HttpError(502, `Paystack: ${msg}`);
    err.paystack = json;
    throw err;
  }
  return json.data;
}

// amountNaira is converted to kobo here.
export function initializeTransaction({ email, amountNaira, reference, callbackUrl, metadata }) {
  return call('POST', '/transaction/initialize', {
    email,
    amount: Math.round(amountNaira * 100),
    currency: 'NGN',
    reference,
    callback_url: callbackUrl,
    metadata,
  });
}

export function verifyTransaction(reference) {
  return call('GET', `/transaction/verify/${encodeURIComponent(reference)}`);
}

// Starts the monthly subscription on the card used for the first payment.
export function createSubscription({ customer, plan, authorization, startDate }) {
  return call('POST', '/subscription', { customer, plan, authorization, start_date: startDate.toISOString() });
}

export function fetchSubscription(code) {
  return call('GET', `/subscription/${encodeURIComponent(code)}`);
}

export async function disableSubscription(code) {
  const sub = await fetchSubscription(code);
  if (sub.status !== 'active' && sub.status !== 'non-renewing' && sub.status !== 'attention') return;
  return call('POST', '/subscription/disable', { code, token: sub.email_token });
}

export function validSignature(rawBody, signature) {
  if (!config.paystack.secretKey || !signature) return false;
  const hash = crypto.createHmac('sha512', config.paystack.secretKey).update(rawBody).digest('hex');
  const a = Buffer.from(hash);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
