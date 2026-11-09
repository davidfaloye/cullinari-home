import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { Application } from '../models/Application.js';
import { ah, HttpError } from '../middleware/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { filePath } from '../lib/uploads.js';

const router = Router();

// Uploaded files are private: only the restaurant that uploaded them and the Cullinari team can open them.
router.get(
  '/:filename',
  requireAuth,
  ah(async (req, res) => {
    const filename = path.basename(req.params.filename);
    const app = await Application.findOne({
      $or: [{ 'files.logo.filename': filename }, { 'files.splash.filename': filename }, { 'files.menu.filename': filename }],
    });
    if (!app) throw new HttpError(404, 'File not found.');
    const owns = app.user.equals(req.user._id);
    if (!owns && req.user.role !== 'admin') throw new HttpError(404, 'File not found.');

    const f = [app.files.logo, app.files.splash, ...(app.files.menu || [])].find((x) => x?.filename === filename);
    const p = filePath(filename);
    if (!fs.existsSync(p)) throw new HttpError(404, 'File not found.');
    const inline = f.mime.startsWith('image/') || f.mime === 'application/pdf';
    res.setHeader('Content-Type', f.mime);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(f.originalName || filename)}"`
    );
    fs.createReadStream(p).pipe(res);
  })
);

export default router;
