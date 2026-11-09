import { Router } from 'express';
import { z } from 'zod';
import { Application, STATUSES } from '../models/Application.js';
import { ah, HttpError } from '../middleware/errors.js';
import { requireAdmin } from '../middleware/auth.js';
import { serializeApplication } from '../lib/serialize.js';
import { notify } from '../lib/emails.js';
import { encrypt } from '../lib/crypto.js';
import { firstPayment } from '../../../shared/plans.js';

const router = Router();
router.use(requireAdmin);

router.get(
  '/applications',
  ah(async (req, res) => {
    const status = String(req.query.status || '');
    const q = String(req.query.q || '').trim();
    const filter = { status: { $ne: 'draft' } };
    if (status === 'all') delete filter.status;
    else if (STATUSES.includes(status)) filter.status = status;
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ 'details.businessName': rx }, { 'details.city': rx }];
    }
    const apps = await Application.find(filter).populate('user').sort({ submittedAt: -1, updatedAt: -1 }).limit(200);

    const counts = await Application.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]);
    res.json({
      applications: apps.map((a) => serializeApplication(a, { forAdmin: true })),
      counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
    });
  })
);

router.get(
  '/applications/:id',
  ah(async (req, res) => {
    const app = await Application.findById(req.params.id).populate('user');
    if (!app) throw new HttpError(404, 'Application not found.');
    res.json({ application: serializeApplication(app, { forAdmin: true }) });
  })
);

const reviewSchema = z.object({
  action: z.enum(['approve', 'request_changes', 'reject']),
  note: z.string().trim().max(2000).optional().default(''),
});

router.post(
  '/applications/:id/review',
  ah(async (req, res) => {
    const { action, note } = reviewSchema.parse(req.body);
    const app = await Application.findById(req.params.id).populate('user');
    if (!app) throw new HttpError(404, 'Application not found.');
    if (app.status !== 'submitted') throw new HttpError(409, `This application is ${app.status.replace('_', ' ')}, not waiting for review.`);
    if (action !== 'approve' && !note) {
      throw new HttpError(400, 'Add a note so the restaurant knows what to change.', { fields: { note: 'Required.' } });
    }

    const next = { approve: 'approved', request_changes: 'changes_requested', reject: 'rejected' }[action];
    app.reviewNote = note;
    app.reviewedAt = new Date();
    app.setStatus(next, { by: req.user._id, note });
    await app.save();

    const user = app.user;
    if (next === 'approved') notify(user.email, 'approved', user, app, firstPayment(app.plan));
    if (next === 'changes_requested') notify(user.email, 'changesRequested', user, app);
    if (next === 'rejected') notify(user.email, 'rejected', user, app);

    res.json({ application: serializeApplication(app, { forAdmin: true }) });
  })
);

const url = z.string().trim().url('Enter a full link, starting with https://');
const deliverSchema = z.object({
  playStoreUrl: url,
  appStoreUrl: url.or(z.literal('')).optional().default(''),
  adminUrl: url,
  adminLoginEmail: z.string().trim().email('Enter the login email.'),
  adminPassword: z.string().min(8, 'Use a temporary password of at least 8 characters.').max(128),
});

// Marks the app as live and publishes the links and login to the client's dashboard.
router.post(
  '/applications/:id/deliver',
  ah(async (req, res) => {
    const data = deliverSchema.parse(req.body);
    const app = await Application.findById(req.params.id).populate('user');
    if (!app) throw new HttpError(404, 'Application not found.');
    if (!['paid', 'live'].includes(app.status)) throw new HttpError(409, 'Only paid applications can be marked live.');

    const firstTime = app.status === 'paid';
    app.delivery.playStoreUrl = data.playStoreUrl;
    app.delivery.appStoreUrl = data.appStoreUrl;
    app.delivery.adminUrl = data.adminUrl;
    app.delivery.adminLoginEmail = data.adminLoginEmail;
    app.delivery.adminPasswordEnc = encrypt(data.adminPassword);
    if (firstTime) {
      app.delivery.deliveredAt = new Date();
      app.setStatus('live', { by: req.user._id });
    }
    await app.save();
    if (firstTime) notify(app.user.email, 'live', app.user, app);
    res.json({ application: serializeApplication(app, { forAdmin: true }) });
  })
);

export default router;
