import { Router } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { FileRecord } from '../models/FileRecord.js';
import { buildObjectKey, uploadToS3, getPresignedDownloadUrl } from '../services/s3Service.js';

function isValidId(id) {
  return typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);
}

// Keep uploads in memory for simplicity; for very large files, use streaming + multipart upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB — adjust in production
});

const router = Router();

/**
 * Optional multi-tenant label without full auth: client sends X-User-Label (default: default)
 */
function userLabel(req) {
  const h = req.headers['x-user-label'];
  return (typeof h === 'string' && h.trim()) || 'default';
}

/**
 * POST /api/files/upload
 * multipart: field "file" + optional "expiresInDays" (number of days from now, or empty)
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file under field "file"' });
    }

    const key = buildObjectKey(req.file.originalname);
    await uploadToS3({
      key,
      body: req.file.buffer,
      contentType: req.file.mimetype,
    });

    let expiresAt = null;
    const days = req.body.expiresInDays;
    if (days !== undefined && days !== '' && !Number.isNaN(Number(days))) {
      const d = new Date();
      d.setDate(d.getDate() + Number(days));
      expiresAt = d;
    }

    const doc = await FileRecord.create({
      s3Key: key,
      originalName: req.file.originalname,
      contentType: req.file.mimetype,
      size: req.file.size,
      expiresAt,
      userLabel: userLabel(req),
    });

    return res.status(201).json({
      id: doc._id,
      originalName: doc.originalName,
      size: doc.size,
      contentType: doc.contentType,
      uploadedAt: doc.uploadedAt,
      expiresAt: doc.expiresAt,
    });
  } catch (err) {
    console.error('upload', err);
    return res.status(500).json({ error: 'Upload failed', detail: err.message });
  }
});

/**
 * GET /api/files — list metadata for this user label
 */
router.get('/', async (req, res) => {
  try {
    const list = await FileRecord.find({ userLabel: userLabel(req) })
      .sort({ uploadedAt: -1 })
      .lean();
    return res.json(
      list.map((f) => ({
        id: f._id,
        originalName: f.originalName,
        size: f.size,
        contentType: f.contentType,
        uploadedAt: f.uploadedAt,
        expiresAt: f.expiresAt,
      }))
    );
  } catch (err) {
    console.error('list', err);
    return res.status(500).json({ error: 'Failed to list files' });
  }
});

/**
 * GET /api/files/:id/presign — return a short-lived pre-signed download URL
 */
router.get('/:id/presign', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid file id' });
    }
    const file = await FileRecord.findOne({
      _id: req.params.id,
      userLabel: userLabel(req),
    });
    if (!file) return res.status(404).json({ error: 'File not found' });

    if (file.expiresAt && new Date(file.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'File has expired' });
    }

    const url = await getPresignedDownloadUrl(file.s3Key, 300);
    return res.json({ url, expiresInSeconds: 300, originalName: file.originalName });
  } catch (err) {
    console.error('presign', err);
    return res.status(500).json({ error: 'Could not create download link' });
  }
});

/**
 * GET /api/files/:id — metadata only (handy for clients that poll)
 */
router.get('/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid file id' });
    }
    const file = await FileRecord.findOne({
      _id: req.params.id,
      userLabel: userLabel(req),
    });
    if (!file) return res.status(404).json({ error: 'File not found' });
    return res.json({
      id: file._id,
      originalName: file.originalName,
      size: file.size,
      contentType: file.contentType,
      uploadedAt: file.uploadedAt,
      expiresAt: file.expiresAt,
    });
  } catch (err) {
    console.error('get', err);
    return res.status(500).json({ error: 'Not found' });
  }
});

export { router as filesRouter };
