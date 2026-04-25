import mongoose from 'mongoose';

/**
 * File metadata we store in MongoDB (the actual bytes live in S3).
 * @property {String} s3Key — unique object key in the bucket
 * @property {String} originalName — filename shown to users
 * @property {String} contentType — MIME type (e.g. image/png)
 * @property {Number} size — bytes
 * @property {Date} expiresAt — optional; if set, download links are rejected after this time
 * @property {String} userLabel — optional scoping (no auth in v1; use header in API)
 */
const fileRecordSchema = new mongoose.Schema(
  {
    s3Key: { type: String, required: true, unique: true, index: true },
    originalName: { type: String, required: true },
    contentType: { type: String, default: 'application/octet-stream' },
    size: { type: Number, required: true },
    expiresAt: { type: Date, default: null },
    userLabel: { type: String, default: 'default', index: true },
  },
  { timestamps: { createdAt: 'uploadedAt', updatedAt: 'updatedAt' } }
);

export const FileRecord = mongoose.model('FileRecord', fileRecordSchema);
