import path from 'node:path';

const env = process.env;
const isProd = env.NODE_ENV === 'production';

function required(name, devFallback) {
  const v = env[name];
  if (v) return v;
  if (!isProd && devFallback !== undefined) return devFallback;
  throw new Error(`Missing environment variable ${name}`);
}

export const config = {
  isProd,
  port: Number(env.PORT) || 4000,
  appUrl: (env.APP_URL || 'http://localhost:5173').replace(/\/$/, ''),
  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/cullinari'),
  jwtSecret: required('JWT_SECRET', 'dev-only-secret'),
  encryptionKey: required('ENCRYPTION_KEY', '0'.repeat(64)),
  paystack: {
    secretKey: env.PAYSTACK_SECRET_KEY || '',
    planCodes: {
      starter: env.PAYSTACK_PLAN_STARTER || '',
      growth: env.PAYSTACK_PLAN_GROWTH || '',
      pro: env.PAYSTACK_PLAN_PRO || '',
    },
  },
  mail: {
    // "resend" (HTTPS API, works on Render free) or "smtp" (blocked on Render free). Defaults to resend when a key is set.
    driver: (env.MAIL_DRIVER || (env.RESEND_API_KEY ? 'resend' : 'smtp')).trim().toLowerCase(),
    resendKey: env.RESEND_API_KEY || '',
    host: env.SMTP_HOST || '',
    port: Number(env.SMTP_PORT) || 587,
    user: env.SMTP_USER || '',
    pass: (env.SMTP_PASS || '').replace(/\s+/g, ''), // Gmail shows app passwords in groups of four; spaces are dropped
    from: env.MAIL_FROM || 'Cullinari <hello@cullinari.com>',
    replyTo: env.MAIL_REPLY_TO || '',
    team: env.TEAM_EMAIL || '',
  },
  // Where uploaded logos, splash art and menus are kept.
  //   gridfs = MongoDB (works on Render's free plan); disk = local folder (needs a Render persistent disk).
  storage: {
    driver: (env.STORAGE_DRIVER || 'gridfs').trim().toLowerCase(),
    uploadDir: path.resolve(env.UPLOAD_DIR || './uploads'),
  },
};