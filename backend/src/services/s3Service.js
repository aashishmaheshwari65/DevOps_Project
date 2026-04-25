import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import path from 'path';
import { getAwsRegion, getS3Bucket } from '../config/env.js';

const s3 = new S3Client({
  region: getAwsRegion(),
  // On EC2, prefer IAM instance role and omit static keys; SDK picks up credentials automatically
});

/**
 * Build a unique S3 key: prefix/uuid + sanitized original extension.
 * Keeps objects organized and avoids name collisions.
 */
export function buildObjectKey(originalName) {
  const ext = path.extname(originalName || '') || '';
  const safe = ext.replace(/[^a-zA-Z0-9._-]/g, '') || '.bin';
  return `uploads/${randomUUID()}${safe}`;
}

/**
 * Upload file buffer to S3.
 */
export async function uploadToS3({ key, body, contentType }) {
  const bucket = getS3Bucket();
  if (!bucket) throw new Error('S3_BUCKET is not set');

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType || 'application/octet-stream',
    })
  );
  return { bucket, key };
}

/**
 * Create a time-limited pre-signed URL so users can download without public buckets.
 * @param {string} key - S3 object key
 * @param {number} [expiresInSeconds=300] - URL validity (default 5 min)
 */
export async function getPresignedDownloadUrl(key, expiresInSeconds = 300) {
  const bucket = getS3Bucket();
  if (!bucket) throw new Error('S3_BUCKET is not set');

  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}
