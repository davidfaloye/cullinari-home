// Uploaded files can be stored in one of two places, chosen by the STORAGE_DRIVER env var:
//   gridfs  (default)  MongoDB GridFS, in the same database as everything else.
//                      Survives deploys and restarts, so it works on Render's free plan.
//   disk               Files on the local filesystem at UPLOAD_DIR. Only use this with a
//                      Render persistent disk (paid plan), otherwise files vanish on deploy.
// multer holds each upload in memory (max 15 MB), then storeFile() writes it to the chosen driver.
// Everything else in the app only uses storeFile / readFile / removeFile, so switching is one env var.
// Switching does NOT move files that were already uploaded to the other driver.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import mongoose from 'mongoose';
import { config } from '../config.js';
import { HttpError } from '../middleware/errors.js';

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

const DRIVER = config.storage.driver;
if (!['gridfs', 'disk'].includes(DRIVER)) {
  throw new Error(`STORAGE_DRIVER must be "gridfs" or "disk" (got "${DRIVER}")`);
}
if (DRIVER === 'disk') fs.mkdirSync(config.storage.uploadDir, { recursive: true });
console.log(`[uploads] storage driver: ${DRIVER}${DRIVER === 'disk' ? ` (${config.storage.uploadDir})` : ''}`);

// Parses one multipart upload (field "file") into memory, with the type and size limits for its kind.
export function uploader(kind) {
  const spec = KINDS[kind];
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: spec.maxBytes, files: 1 },
    fileFilter: (_req, f, cb) => {
      if (spec.types[f.mimetype]) return cb(null, true);
      cb(new HttpError(400, `Upload a ${spec.label} file.`));
    },
  }).single('file');
}

// ---------- GridFS driver ----------
// Created per call because the Mongo connection is opened after this module loads.
const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });

const gridfs = {
  save(filename, file) {
    return new Promise((resolve, reject) => {
      const s = bucket().openUploadStream(filename, { contentType: file.mimetype });
      s.on('error', reject);
      s.on('finish', resolve);
      s.end(file.buffer);
    });
  },
  async open(filename) {
    const b = bucket();
    const [doc] = await b.find({ filename }).limit(1).toArray();
    if (!doc) return null;
    return { body: b.openDownloadStreamByName(filename), size: doc.length };
  },
  async remove(filename) {
    const b = bucket();
    const docs = await b.find({ filename }).toArray();
    await Promise.all(docs.map((d) => b.delete(d._id)));
  },
};

// ---------- Disk driver ----------
const diskPath = (filename) => path.join(config.storage.uploadDir, path.basename(filename));

const disk = {
  save(filename, file) {
    return fs.promises.writeFile(diskPath(filename), file.buffer);
  },
  async open(filename) {
    try {
      const { size } = await fs.promises.stat(diskPath(filename));
      return { body: fs.createReadStream(diskPath(filename)), size };
    } catch (err) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  },
  async remove(filename) {
    await fs.promises.unlink(diskPath(filename));
  },
};

const driver = DRIVER === 'disk' ? disk : gridfs;

// ---------- Public API (used by the routes) ----------

// Saves an uploaded file (from multer) under a random name and returns that name.
export async function storeFile(file, kind) {
  const filename = `${crypto.randomBytes(16).toString('hex')}${KINDS[kind].types[file.mimetype] || ''}`;
  await driver.save(filename, file);
  return filename;
}

// Opens a stored file. Returns { body (readable stream), size } or null if it does not exist.
export function readFile(filename) {
  return driver.open(path.basename(filename));
}

// Deletes a stored file. Fire-and-forget: a failed delete must never break the request.
export function removeFile(filename) {
  if (!filename) return;
  driver.remove(path.basename(filename)).catch(() => {});
}