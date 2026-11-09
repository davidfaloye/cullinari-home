import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { User } from '../models/User.js';
import { ah, HttpError } from '../middleware/errors.js';
import { setSession, clearSession } from '../middleware/auth.js';
import { notify } from '../lib/emails.js';
import { randomToken, sha256 } from '../lib/crypto.js';
import { config } from '../config.js';

export const TERMS_VERSION = '2026-11';

const router = Router();

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });
router.use(['/login', '/signup', '/forgot-password', '/reset-password'], limiter);

const phoneRe = /^\+?[0-9\s-]{10,16}$/;
const password = z.string().min(8, 'Use at least 8 characters for your password.').max(128);

const signupSchema = z.object({
  restaurantName: z.string().trim().min(2, 'Enter your restaurant name.').max(120),
  firstName: z.string().trim().min(1, 'Enter your first name.').max(60),
  lastName: z.string().trim().min(1, 'Enter your last name.').max(60),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  phone: z.string().trim().regex(phoneRe, 'Enter a valid phone number, e.g. 0803 123 4567.'),
  password,
  agreeTerms: z.literal(true, { errorMap: () => ({ message: 'Agree to the terms to create your account.' }) }),
});

router.post(
  '/signup',
  ah(async (req, res) => {
    const data = signupSchema.parse(req.body);
    const exists = await User.exists({ email: data.email });
    if (exists) throw new HttpError(409, 'An account with this email already exists. Sign in instead.', { fields: { email: 'Already registered.' } });

    const user = await User.create({
      restaurantName: data.restaurantName,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      passwordHash: await bcrypt.hash(data.password, 12),
      termsAcceptedAt: new Date(),
      termsVersion: TERMS_VERSION,
    });

    setSession(res, user);
    notify(user.email, 'welcome', user);
    res.status(201).json({ user: user.toPublic() });
  })
);

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

router.post(
  '/login',
  ah(async (req, res) => {
    const { email, password: pw } = loginSchema.parse(req.body);
    const user = await User.findOne({ email });
    const ok = user && (await bcrypt.compare(pw, user.passwordHash));
    if (!ok) throw new HttpError(401, 'That email and password do not match an account.');
    setSession(res, user);
    res.json({ user: user.toPublic() });
  })
);

router.post('/logout', (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  res.json({ user: req.user ? req.user.toPublic() : null });
});

router.post(
  '/forgot-password',
  ah(async (req, res) => {
    const { email } = z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email address.') }).parse(req.body);
    const user = await User.findOne({ email });
    if (user) {
      const token = randomToken();
      user.resetTokenHash = sha256(token);
      user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      const url = `${config.appUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
      notify(user.email, 'passwordReset', user, url);
    }
    // Same answer whether or not the account exists, so emails can't be probed.
    res.json({ ok: true });
  })
);

router.post(
  '/reset-password',
  ah(async (req, res) => {
    const { email, token, password: pw } = z
      .object({ email: z.string().trim().toLowerCase().email(), token: z.string().min(10), password })
      .parse(req.body);
    const user = await User.findOne({ email, resetTokenHash: sha256(token), resetTokenExpires: { $gt: new Date() } });
    if (!user) throw new HttpError(400, 'This reset link has expired or was already used. Ask for a new one.');
    user.passwordHash = await bcrypt.hash(pw, 12);
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    await user.save();
    setSession(res, user);
    res.json({ user: user.toPublic() });
  })
);

export default router;
