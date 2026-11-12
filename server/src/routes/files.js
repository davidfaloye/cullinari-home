import { Router } from 'express';
import path from 'node:path';
import { Application } from '../models/Application.js';
import { ah, HttpError } from '../middleware/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { readFile } from '../lib/uploads.js';

const router = Router();

// Uploaded files are private: only the restaurant that uploaded them and the Cullinari team can open them.
// The R2 bucket itself stays private; this route checks access, then streams the file from R2.
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
    const obj = await readFile(filename);
    if (!obj) throw new HttpError(404, 'File not found.');

    const inline = f.mime.startsWith('image/') || f.mime === 'application/pdf';
    res.setHeader('Content-Type', f.mime);
    if (obj.size) res.setHeader('Content-Length', obj.size);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(f.originalName || filename)}"`
    );
    obj.body.on('error', (err) => {
      console.error('[files] stream error', err.message);
      res.destroy(err);
    });
    obj.body.pipe(res);
  })
);

export default router;