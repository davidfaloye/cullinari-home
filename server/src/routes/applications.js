import { Router } from 'express';
import { z } from 'zod';
import { Application } from '../models/Application.js';
import { ah, HttpError } from '../middleware/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { serializeApplication } from '../lib/serialize.js';
import { uploader, removeFile, MAX_MENU_FILES } from '../lib/uploads.js';
import { notify, notifyTeam } from '../lib/emails.js';
import { getPlan, EXTRA_OPTIONS } from '../../../shared/plans.js';

const router = Router();
router.use(requireAuth);

const EDITABLE = ['draft', 'changes_requested'];

async function myApplication(userId) {
  let app = await Application.findOne({ user: userId }).sort({ createdAt: -1 });
  if (!app) {
    app = await Application.create({ user: userId, history: [{ status: 'draft' }] });
  }
  return app;
}

function assertEditable(app) {
  if (!EDITABLE.includes(app.status)) {
    throw new HttpError(409, 'This application has been submitted and can no longer be edited.');
  }
}

const str = (max = 200) => z.string().trim().max(max).optional().default('');
const hex = z
  .string()
  .trim()
  .regex(/^#([0-9a-f]{6})$/i, 'Use a colour like #22306E.')
  .or(z.literal(''))
  .optional()
  .default('');

const detailsSchema = z.object({
  businessName: str(120),
  appName: str(30),
  tagline: str(80),
  cuisine: str(80),
  phone: str(20),
  whatsapp: str(20),
  email: z.string().trim().email('Enter a valid email address.').or(z.literal('')).optional().default(''),
  address: str(200),
  city: str(60),
  state: str(60),
  hours: str(300),
  branches: z.array(z.object({ name: str(80), address: str(200) })).max(50).optional().default([]),
  primaryColor: hex,
  secondaryColor: hex,
  menuLayout: z.enum(['list', 'grid', 'featured']).optional().default('list'),
  extraOptions: z.array(z.enum(EXTRA_OPTIONS.map((o) => o.code))).optional().default([]),
  offersDelivery: z.boolean().optional().default(false),
  offersPickup: z.boolean().optional().default(true),
  deliveryNotes: str(500),
  menuLink: z.string().trim().url('Enter a full link, starting with https://').or(z.literal('')).optional().default(''),
  customDomain: str(100),
  customFeatures: str(2000),
  hasPlayAccount: z.enum(['yes', 'no', 'unsure', '']).optional().default(''),
  notes: str(2000),
});

const saveSchema = z.object({
  plan: z.enum(['starter', 'growth', 'pro']).nullable().optional(),
  details: detailsSchema.partial().optional(),
});

// Removes anything the chosen plan does not include, so a Starter app can't ask for Pro features.
function fitToPlan(details, planCode) {
  const plan = getPlan(planCode);
  if (!plan) return details;
  const d = { ...details };
  if (!plan.app.menuLayouts.includes(d.menuLayout)) d.menuLayout = 'list';
  if (plan.app.maxExtraOptions === 0) d.extraOptions = [];
  if (!plan.app.customDomain) d.customDomain = '';
  if (!plan.app.customFeatures) d.customFeatures = '';
  if (plan.limits.branches === 1) d.branches = [];
  return d;
}

router.get(
  '/',
  ah(async (req, res) => {
    const app = await myApplication(req.user._id);
    res.json({ application: serializeApplication(app) });
  })
);

router.put(
  '/',
  ah(async (req, res) => {
    const app = await myApplication(req.user._id);
    assertEditable(app);
    const body = saveSchema.parse(req.body);

    const current = app.toObject().details || {};
    if (body.plan !== undefined) app.plan = body.plan;
    if (body.details || body.plan !== undefined) {
      app.details = fitToPlan({ ...current, ...(body.details || {}) }, app.plan);
    }
    if (app.plan && !getPlan(app.plan).app.customSplash && app.files?.splash?.filename) {
      removeFile(app.files.splash.filename);
      app.files.splash = undefined;
    }
    await app.save();
    res.json({ application: serializeApplication(app) });
  })
);

// Upload: POST /api/application/files/logo | splash | menu  (multipart field "file")
router.post(
  '/files/:kind',
  (req, _res, next) => (['logo', 'splash', 'menu'].includes(req.params.kind) ? next() : next(new HttpError(404, 'Not found.'))),
  (req, res, next) => uploader(req.params.kind)(req, res, next),
  ah(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Choose a file to upload.');
    const app = await myApplication(req.user._id);
    try {
      assertEditable(app);
    } catch (err) {
      removeFile(req.file.filename);
      throw err;
    }
    const { kind } = req.params;
    const entry = { filename: req.file.filename, originalName: req.file.originalname, mime: req.file.mimetype, size: req.file.size };

    if (kind === 'menu') {
      if ((app.files?.menu?.length || 0) >= MAX_MENU_FILES) {
        removeFile(req.file.filename);
        throw new HttpError(400, `You can upload up to ${MAX_MENU_FILES} menu files. Remove one first.`);
      }
      app.files.menu.push(entry);
    } else {
      if (kind === 'splash' && !getPlan(app.plan)?.app.customSplash) {
        removeFile(req.file.filename);
        throw new HttpError(400, 'A custom splash screen comes with the Growth and Pro plans.');
      }
      if (app.files?.[kind]?.filename) removeFile(app.files[kind].filename);
      app.files[kind] = entry;
    }
    await app.save();
    res.status(201).json({ application: serializeApplication(app) });
  })
);

router.delete(
  '/files/:kind/:id?',
  ah(async (req, res) => {
    const app = await myApplication(req.user._id);
    assertEditable(app);
    const { kind, id } = req.params;
    if (kind === 'menu') {
      const f = app.files.menu.id(id);
      if (!f) throw new HttpError(404, 'That file was already removed.');
      removeFile(f.filename);
      f.deleteOne();
    } else if (kind === 'logo' || kind === 'splash') {
      removeFile(app.files?.[kind]?.filename);
      app.files[kind] = undefined;
    } else {
      throw new HttpError(404, 'Not found.');
    }
    await app.save();
    res.json({ application: serializeApplication(app) });
  })
);

// Everything the team needs before they can build the app. Returns { field: message }.
function missingForSubmit(app) {
  const d = app.details || {};
  const plan = getPlan(app.plan);
  const m = {};
  if (!plan) m.plan = 'Choose a plan.';
  const need = {
    businessName: 'Enter the restaurant name customers know.',
    appName: 'Enter the name to show under the app icon.',
    phone: 'Enter a phone number for customers.',
    email: 'Enter an email for order and support messages.',
    address: 'Enter the restaurant address.',
    city: 'Enter the city.',
    state: 'Enter the state.',
    hours: 'Enter your opening hours.',
    primaryColor: 'Choose your main brand colour.',
  };
  for (const [k, msg] of Object.entries(need)) if (!d[k]) m[k] = msg;
  if (!d.offersDelivery && !d.offersPickup) m.offersPickup = 'Choose pickup, delivery or both.';
  if (!app.files?.logo?.filename) m.logo = 'Upload your logo.';
  if (!(app.files?.menu?.length > 0) && !d.menuLink) m.menu = 'Upload your menu or add a link to it.';
  if (plan) {
    const extraBranches = d.branches?.filter((b) => b.name || b.address) || [];
    const cap = plan.limits.branches;
    if (cap !== null && 1 + extraBranches.length > cap) {
      m.branches = `The ${plan.name} plan covers ${cap} branch${cap === 1 ? '' : 'es'}. Remove some or choose a bigger plan.`;
    }
    if (extraBranches.some((b) => !b.name || !b.address)) m.branches = 'Give every extra branch a name and an address.';
    if (plan.app.maxExtraOptions !== null && (d.extraOptions?.length || 0) > plan.app.maxExtraOptions) {
      m.extraOptions = `The ${plan.name} plan includes up to ${plan.app.maxExtraOptions} extra options.`;
    }
  }
  return m;
}

router.post(
  '/submit',
  ah(async (req, res) => {
    const app = await myApplication(req.user._id);
    assertEditable(app);
    const missing = missingForSubmit(app);
    if (Object.keys(missing).length) {
      throw new HttpError(400, 'A few details are still missing.', { fields: missing });
    }
    app.submittedAt = new Date();
    app.reviewNote = '';
    app.setStatus('submitted', { by: req.user._id });
    await app.save();

    notify(req.user.email, 'submitted', req.user, app);
    notifyTeam('teamNewApplication', req.user, app);
    res.json({ application: serializeApplication(app) });
  })
);

export default router;
