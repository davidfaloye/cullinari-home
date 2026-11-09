import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { config } from '../config.js';
import { HttpError } from '../middleware/errors.js';

fs.mkdirSync(config.uploadDir, { recursive: true });

const IMAGE = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };
const MENU = {
  ...IMAGE,
  'application/pdf': '.pdf',
  'text/csv': '.csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

export const KINDS = {
  logo: { types: IMAGE, maxBytes: 5 * 1024 * 1024, label: 'PNG, JPG or WebP' },
  splash: { types: IMAGE, maxBytes: 8 * 1024 * 1024, label: 'PNG, JPG or WebP' },
  menu: { types: MENU, maxBytes: 15 * 1024 * 1024, label: 'PDF, photo, Excel, CSV or Word' },
};

export const MAX_MENU_FILES = 8;

export function uploader(kind) {
  const spec = KINDS[kind];
  return multer({
    storage: multer.diskStorage({
      destination: config.uploadDir,
      filename: (_req, f, cb) => cb(null, `${crypto.randomBytes(16).toString('hex')}${spec.types[f.mimetype] || ''}`),
    }),
    limits: { fileSize: spec.maxBytes, files: 1 },
    fileFilter: (_req, f, cb) => {
      if (spec.types[f.mimetype]) return cb(null, true);
      cb(new HttpError(400, `Upload a ${spec.label} file.`));
    },
  }).single('file');
}

export function removeFile(filename) {
  if (!filename) return;
  const p = path.join(config.uploadDir, path.basename(filename));
  fs.promises.unlink(p).catch(() => {});
}

export function filePath(filename) {
  return path.join(config.uploadDir, path.basename(filename));
}
