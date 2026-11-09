// Billing periods, upgrade pricing and Paystack subscription swaps.
//
// A restaurant's billing month is anchored on the day of its first payment:
// paid on 14 March → periods run 14 Mar–14 Apr, 14 Apr–14 May, and so on.
import { getPlan } from '../../../shared/plans.js';
import { config } from '../config.js';
import { createSubscription, disableSubscription } from './paystack.js';

const DAY = 24 * 60 * 60 * 1000;

// Adds months, clamping to the end of shorter months (31 Jan + 1 month = 28/29 Feb).
export function addMonths(date, n) {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

export function periodBounds(anchor, now = new Date()) {
  let n = 0;
  while (addMonths(anchor, n + 1) <= now) n += 1;
  return { start: addMonths(anchor, n), end: addMonths(anchor, n + 1) };
}

export function currentPeriod(app, now = new Date()) {
  if (!app.payment?.paidAt) return null;
  return periodBounds(app.payment.paidAt, now);
}

// Price of moving up a plan today: the difference in setup fee, plus the difference
// in monthly fee for the days left in this billing month. From the next renewal
// the new monthly price is charged in full.
export function upgradeQuote(app, toCode, now = new Date()) {
  const from = getPlan(app.plan);
  const to = getPlan(toCode);
  if (!from || !to || to.monthly <= from.monthly) return null;
  const { start, end } = currentPeriod(app, now);
  const periodDays = Math.round((end - start) / DAY);
  const daysLeft = Math.max(1, Math.ceil((end - now) / DAY));
  const setupDiff = Math.max(0, to.setup - from.setup);
  const proratedMonthly = Math.round(((to.monthly - from.monthly) * daysLeft) / periodDays);
  return {
    from: from.code,
    to: to.code,
    setupDiff,
    proratedMonthly,
    daysLeft,
    periodDays,
    total: setupDiff + proratedMonthly,
    newMonthly: to.monthly,
    nextRenewal: end,
  };
}

// Replaces the restaurant's Paystack subscription with one on `planCode`, first charge on `startDate`.
// Never throws: returns { code } or { error } so the caller can record what happened.
export async function swapSubscription(app, planKey, startDate, authorizationCode) {
  const planCode = config.paystack.planCodes[planKey];
  if (!planCode) return { error: `No Paystack plan code configured for ${planKey}.` };
  if (!app.payment?.customerCode || !authorizationCode) {
    return { error: 'No reusable card on file (e.g. paid by bank transfer). Set up the monthly charge manually.' };
  }
  try {
    if (app.payment.subscriptionCode) await disableSubscription(app.payment.subscriptionCode);
  } catch (err) {
    console.warn('[billing] could not disable old subscription', app.payment.subscriptionCode, err.message);
  }
  try {
    const sub = await createSubscription({ customer: app.payment.customerCode, plan: planCode, authorization: authorizationCode, startDate });
    return { code: sub.subscription_code };
  } catch (err) {
    return { error: err.message };
  }
}

// Switches a scheduled downgrade over once its date has passed. Returns true if the
// application changed (the caller saves it).
export function applyDuePlanChange(app, now = new Date()) {
  if (!app.pendingPlan || !app.pendingPlanAt || app.pendingPlanAt > now) return false;
  const from = app.plan;
  const change = app.planChanges.find((c) => c.status === 'scheduled' && c.to === app.pendingPlan);
  if (change) change.status = 'applied';
  app.plan = app.pendingPlan;
  app.history.push({ status: app.status, at: app.pendingPlanAt, note: `Plan changed from ${getPlan(from)?.name} to ${getPlan(app.plan)?.name}` });
  app.pendingPlan = null;
  app.pendingPlanAt = undefined;
  return true;
}
