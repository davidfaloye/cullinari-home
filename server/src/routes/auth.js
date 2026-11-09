import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { User } from '../models/User.js';
import { ah, HttpError } from '../middleware/errors.js';
import { setSession, clearSession, requireAuth } from '../middleware/auth.js';
import { notify } from '../lib/emails.js';
import { randomToken, sha256 } from '../lib/crypto.js';
import { config } from '../config.js';

export const TERMS_VERSION = '2026-11';

const router = Router();

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });
router.use(['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/resend-verification'], limiter);

const VERIFY_TTL_MS = 48 * 60 * 60 * 1000;

// Gives the user a fresh confirmation link (older links stop working) and returns its URL.
async function issueVerifyLink(user) {
  const token = randomToken();
  user.verifyTokenHash = sha256(token);
  user.verifyTokenExpires = new Date(Date.now() + VERIFY_TTL_MS);
  await user.save();
  return `${config.appUrl}/verify-email?token=${token}&email=${encodeURIComponent(user.email)}`;
}

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

    const verifyUrl = await issueVerifyLink(user);
    setSession(res, user);
    notify(user.email, 'welcome', user, verifyUrl);
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
  '/verify-email',
  ah(async (req, res) => {
    const { email, token } = z.object({ email: z.string().trim().toLowerCase().email(), token: z.string().min(10) }).parse(req.body);
    const user = await User.findOne({ email });
    if (user?.emailVerifiedAt) {
      setSession(res, user);
      return res.json({ user: user.toPublic(), alreadyVerified: true });
    }
    if (!user || user.verifyTokenHash !== sha256(token) || !(user.verifyTokenExpires > new Date())) {
      throw new HttpError(400, 'This confirmation link has expired or was replaced by a newer one. Sign in and send a new link.');
    }
    user.emailVerifiedAt = new Date();
    user.verifyTokenHash = undefined;
    user.verifyTokenExpires = undefined;
    await user.save();
    setSession(res, user);
    res.json({ user: user.toPublic() });
  })
);

router.post(
  '/resend-verification',
  requireAuth,
  ah(async (req, res) => {
    if (req.user.emailVerifiedAt) return res.json({ ok: true, alreadyVerified: true });
    const url = await issueVerifyLink(req.user);
    notify(req.user.email, 'verifyEmail', req.user, url);
    res.json({ ok: true });
  })
);

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
    // The reset link reached their inbox, so the address is confirmed.
    user.emailVerifiedAt = user.emailVerifiedAt || new Date();
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    await user.save();
    setSession(res, user);
    res.json({ user: user.toPublic() });
  })
);

export default router;
