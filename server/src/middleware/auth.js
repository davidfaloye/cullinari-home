import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { HttpError } from './errors.js';

export const SESSION_COOKIE = 'cul_session';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function setSession(res, user) {
  const token = jwt.sign({ sub: user._id.toString(), role: user.role }, config.jwtSecret, { expiresIn: '7d' });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'lax',
    maxAge: MAX_AGE_MS,
    path: '/',
  });
}

export function clearSession(res) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

export async function loadUser(req, _res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return next();
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = await User.findById(payload.sub);
  } catch {
    // invalid or expired session: treat as signed out
  }
  next();
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(new HttpError(401, 'Sign in to continue.'));
  next();
}

// Submitting an application and paying both need a confirmed email address,
// because that is where approvals, receipts and login details are sent.
export function requireVerified(req, _res, next) {
  if (!req.user) return next(new HttpError(401, 'Sign in to continue.'));
  if (!req.user.emailVerifiedAt) {
    return next(new HttpError(403, `Confirm your email address first. We sent a link to ${req.user.email}.`, { code: 'EMAIL_NOT_VERIFIED' }));
  }
  next();
}

export function requireAdmin(req, _res, next) {
  if (!req.user) return next(new HttpError(401, 'Sign in to continue.'));
  if (req.user.role !== 'admin') return next(new HttpError(403, 'This page is for the Cullinari team.'));
  next();
}
