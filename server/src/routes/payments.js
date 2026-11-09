import { Router } from 'express';
import express from 'express';
import { Application } from '../models/Application.js';
import { User } from '../models/User.js';
import { ah, HttpError } from '../middleware/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { serializeApplication } from '../lib/serialize.js';
import { initializeTransaction, verifyTransaction, createSubscription, validSignature } from '../lib/paystack.js';
import { deliveryWindow } from '../lib/businessDays.js';
import { notify, notifyTeam } from '../lib/emails.js';
import { firstPayment } from '../../../shared/plans.js';
import { config } from '../config.js';

const router = Router();

// Records a successful first payment exactly once, whether it arrives via the
// browser redirect (verify) or the Paystack webhook, in either order.
async function recordFirstPayment(tx) {
  const appId = tx.metadata?.applicationId;
  if (!appId) return null;
  const app = await Application.findById(appId);
  if (!app) return null;
  if (app.payment?.paidAt) return app; // already recorded
  if (app.status !== 'approved') return app;

  const expected = firstPayment(app.plan);
  if (tx.status !== 'success' || tx.currency !== 'NGN' || tx.amount < expected.total * 100) {
    console.warn(`[paystack] ignoring transaction ${tx.reference}: status=${tx.status} amount=${tx.amount} currency=${tx.currency}`);
    return app;
  }

  const paidAt = tx.paid_at ? new Date(tx.paid_at) : new Date();
  const { etaStart, etaEnd } = deliveryWindow(paidAt);

  // Atomic guard: only the first caller flips approved → paid.
  const updated = await Application.findOneAndUpdate(
    { _id: app._id, status: 'approved', 'payment.paidAt': { $exists: false } },
    {
      $set: {
        status: 'paid',
        'payment.reference': tx.reference,
        'payment.amount': tx.amount / 100,
        'payment.currency': tx.currency,
        'payment.channel': tx.channel,
        'payment.paidAt': paidAt,
        'payment.customerCode': tx.customer?.customer_code,
        'payment.authorizationCode': tx.authorization?.reusable ? tx.authorization.authorization_code : undefined,
        'delivery.etaStart': etaStart,
        'delivery.etaEnd': etaEnd,
      },
      $push: { history: { status: 'paid', at: new Date(), note: `Paystack ${tx.reference}` } },
    },
    { new: true }
  );
  if (!updated) return Application.findById(app._id);

  // Monthly fee: subscription starts one month after the first payment (which already covered month one).
  const planCode = config.paystack.planCodes[updated.plan];
  if (planCode && tx.authorization?.reusable && tx.customer?.customer_code) {
    try {
      const start = new Date(paidAt);
      start.setMonth(start.getMonth() + 1);
      const sub = await createSubscription({
        customer: tx.customer.customer_code,
        plan: planCode,
        authorization: tx.authorization.authorization_code,
        startDate: start,
      });
      updated.payment.subscriptionCode = sub.subscription_code;
    } catch (err) {
      updated.payment.subscriptionError = err.message;
    }
  } else {
    updated.payment.subscriptionError = planCode
      ? 'Card not reusable for recurring charges (e.g. bank transfer). Set up the monthly charge manually.'
      : 'No Paystack plan code configured for this tier.';
  }
  await updated.save();

  const user = await User.findById(updated.user);
  notify(user.email, 'paymentReceived', user, updated);
  notifyTeam('teamPaymentReceived', user, updated);
  return updated;
}

// Starts checkout. Returns the Paystack page to redirect to.
router.post(
  '/initialize',
  requireAuth,
  ah(async (req, res) => {
    const app = await Application.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    if (!app || app.status !== 'approved') throw new HttpError(409, 'Payment opens once your application is approved.');
    const amounts = firstPayment(app.plan);
    const reference = `CUL-${app._id.toString().slice(-8)}-${Date.now().toString(36)}`.toUpperCase();
    const data = await initializeTransaction({
      email: req.user.email,
      amountNaira: amounts.total,
      reference,
      callbackUrl: `${config.appUrl}/dashboard/payment`,
      metadata: {
        applicationId: app._id.toString(),
        plan: app.plan,
        custom_fields: [
          { display_name: 'Restaurant', variable_name: 'restaurant', value: app.details?.businessName || req.user.restaurantName },
          { display_name: 'Plan', variable_name: 'plan', value: app.plan },
        ],
      },
    });
    res.json({ authorizationUrl: data.authorization_url, reference });
  })
);

// Called by the dashboard after Paystack redirects back with ?reference=...
router.get(
  '/verify',
  requireAuth,
  ah(async (req, res) => {
    const reference = String(req.query.reference || '');
    if (!reference) throw new HttpError(400, 'Missing payment reference.');
    const tx = await verifyTransaction(reference);
    const app = await Application.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    if (!app || tx.metadata?.applicationId !== app._id.toString()) {
      throw new HttpError(404, 'That payment does not belong to this account.');
    }
    const updated = (await recordFirstPayment(tx)) || app;
    res.json({ paid: tx.status === 'success', status: tx.status, application: serializeApplication(updated) });
  })
);

// Paystack webhook. Configure https://cullinari.com/api/payments/webhook in the Paystack dashboard.
export const webhookHandler = [
  express.raw({ type: '*/*', limit: '1mb' }),
  ah(async (req, res) => {
    if (!validSignature(req.body, req.get('x-paystack-signature'))) {
      return res.status(401).end();
    }
    const event = JSON.parse(req.body.toString('utf8'));
    res.sendStatus(200); // acknowledge fast; Paystack retries on non-200

    try {
      if (event.event === 'charge.success' && event.data?.metadata?.applicationId) {
        // Re-verify with the API rather than trusting the payload alone.
        const tx = await verifyTransaction(event.data.reference);
        await recordFirstPayment(tx);
      } else if (event.event === 'invoice.payment_failed') {
        const code = event.data?.subscription?.subscription_code;
        const app = code && (await Application.findOne({ 'payment.subscriptionCode': code }));
        if (app) {
          const user = await User.findById(app.user);
          notify(user.email, 'paymentFailed', user, app);
        }
      }
    } catch (err) {
      console.error('[paystack webhook]', err);
    }
  }),
];

export default router;
