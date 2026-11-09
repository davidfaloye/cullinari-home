// Changing plan after the app is live.
//   Upgrade: pay the setup difference + the rest of this month at the new price; applies at once.
//   Downgrade: no charge; switches at the end of the current billing month. Nothing is deleted.
import { Router } from 'express';
import { z } from 'zod';
import { Application } from '../models/Application.js';
import { ah, HttpError } from '../middleware/errors.js';
import { requireAuth, requireVerified } from '../middleware/auth.js';
import { serializeApplication } from '../lib/serialize.js';
import { initializeTransaction } from '../lib/paystack.js';
import { upgradeQuote, currentPeriod, swapSubscription, applyDuePlanChange } from '../lib/billing.js';
import { notify, notifyTeam } from '../lib/emails.js';
import { PLANS, getPlan } from '../../../shared/plans.js';
import { config } from '../config.js';

const router = Router();
router.use(requireAuth);

async function liveApp(userId) {
  const app = await Application.findOne({ user: userId }).sort({ createdAt: -1 });
  if (!app || app.status !== 'live') throw new HttpError(409, 'You can change plan once your app is live.');
  if (applyDuePlanChange(app)) await app.save();
  return app;
}

const toSchema = z.object({ to: z.enum(['starter', 'growth', 'pro']) });

// What each other plan would cost or when it would start.
router.get(
  '/',
  ah(async (req, res) => {
    const app = await liveApp(req.user._id);
    const period = currentPeriod(app);
    const current = getPlan(app.plan);
    const options = PLANS.filter((p) => p.code !== app.plan).map((p) =>
      p.monthly > current.monthly
        ? { code: p.code, kind: 'upgrade', quote: upgradeQuote(app, p.code) }
        : { code: p.code, kind: 'downgrade', effectiveAt: period.end }
    );
    res.json({ plan: app.plan, pendingPlan: app.pendingPlan, pendingPlanAt: app.pendingPlanAt, period, options });
  })
);

router.post(
  '/upgrade',
  requireVerified,
  ah(async (req, res) => {
    const { to } = toSchema.parse(req.body);
    const app = await liveApp(req.user._id);
    if (app.pendingPlan) throw new HttpError(409, 'Cancel your scheduled plan change before upgrading.');
    const quote = upgradeQuote(app, to);
    if (!quote) throw new HttpError(400, 'That plan is not an upgrade from your current plan.');

    const reference = `CUL-UP-${app._id.toString().slice(-6)}-${Date.now().toString(36)}`.toUpperCase();
    const data = await initializeTransaction({
      email: req.user.email,
      amountNaira: quote.total,
      reference,
      callbackUrl: `${config.appUrl}/dashboard/payment`,
      metadata: {
        applicationId: app._id.toString(),
        kind: 'upgrade',
        from: quote.from,
        to: quote.to,
        setupDiff: quote.setupDiff,
        proratedMonthly: quote.proratedMonthly,
        total: quote.total,
        custom_fields: [
          { display_name: 'Restaurant', variable_name: 'restaurant', value: app.details?.businessName || req.user.restaurantName },
          { display_name: 'Upgrade', variable_name: 'upgrade', value: `${getPlan(quote.from).name} to ${getPlan(quote.to).name}` },
        ],
      },
    });
    res.json({ authorizationUrl: data.authorization_url, reference, quote });
  })
);

router.post(
  '/downgrade',
  ah(async (req, res) => {
    const { to } = toSchema.parse(req.body);
    const app = await liveApp(req.user._id);
    const current = getPlan(app.plan);
    const target = getPlan(to);
    if (target.monthly >= current.monthly) throw new HttpError(400, 'That plan is not a downgrade from your current plan.');
    const { end } = currentPeriod(app);

    // The renewal on `end` should charge the lower price.
    const sub = await swapSubscription(app, to, end, app.payment.authorizationCode);
    if (sub.code) {
      app.payment.subscriptionCode = sub.code;
      app.payment.subscriptionError = undefined;
    } else {
      app.payment.subscriptionError = sub.error;
    }

    app.planChanges.forEach((c) => {
      if (c.status === 'scheduled') c.status = 'cancelled';
    });
    app.planChanges.push({ kind: 'downgrade', from: app.plan, to, status: 'scheduled', effectiveAt: end, by: req.user._id });
    app.pendingPlan = to;
    app.pendingPlanAt = end;
    await app.save();

    notify(req.user.email, 'downgradeScheduled', req.user, app);
    notifyTeam('teamPlanChange', req.user, app, `Downgrade scheduled: ${current.name} → ${target.name} from ${end.toDateString()}.`);
    res.json({ application: serializeApplication(app) });
  })
);

router.delete(
  '/pending',
  ah(async (req, res) => {
    const app = await liveApp(req.user._id);
    if (!app.pendingPlan) throw new HttpError(409, 'There is no scheduled plan change.');
    const { end } = currentPeriod(app);
    const cancelled = getPlan(app.pendingPlan);

    const sub = await swapSubscription(app, app.plan, end, app.payment.authorizationCode);
    if (sub.code) {
      app.payment.subscriptionCode = sub.code;
      app.payment.subscriptionError = undefined;
    } else {
      app.payment.subscriptionError = sub.error;
    }
    app.planChanges.forEach((c) => {
      if (c.status === 'scheduled') c.status = 'cancelled';
    });
    app.pendingPlan = null;
    app.pendingPlanAt = undefined;
    await app.save();

    notifyTeam('teamPlanChange', req.user, app, `Scheduled downgrade to ${cancelled.name} was cancelled. Stays on ${getPlan(app.plan).name}.`);
    res.json({ application: serializeApplication(app) });
  })
);

export default router;
