import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { config } from './config.js';
import { loadUser } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errors.js';
import authRoutes from './routes/auth.js';
import applicationRoutes from './routes/applications.js';
import paymentRoutes, { webhookHandler } from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import fileRoutes from './routes/files.js';
import planRoutes from './routes/plan.js';
import { PLANS, EXTRA_OPTIONS, MENU_LAYOUTS } from '../../shared/plans.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set('trust proxy', 1); // behind Render's proxy: needed for secure cookies and rate limiting
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        formAction: ["'self'", 'https://checkout.paystack.com'],
      },
    },
  })
);

// The webhook needs the raw body for signature checks, so it is mounted before the JSON parser.
app.post('/api/payments/webhook', ...webhookHandler);

app.use(express.json({ limit: '200kb' }));
app.use(cookieParser());
app.use(loadUser);

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/plans', (_req, res) => res.json({ plans: PLANS, extraOptions: EXTRA_OPTIONS, menuLayouts: MENU_LAYOUTS }));
app.use('/api/auth', authRoutes);
app.use('/api/application', applicationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/plan', planRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/files', fileRoutes);
app.use('/api', notFound);

// In production the API also serves the built website (client/dist).
const dist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(errorHandler);

mongoose
  .connect(config.mongoUri)
  .then(() => {
    app.listen(config.port, () => console.log(`Cullinari API on :${config.port}`));
  })
  .catch((err) => {
    console.error('Could not connect to MongoDB:', err.message);
    process.exit(1);
  });

export default app;
