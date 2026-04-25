import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Load .env from project root (when running from backend/) or cwd.
 * Makes local development predictable.
 */
export function loadEnv() {
  // backend/src/config → repo root is ../../../
  const monorepoRootEnv = path.resolve(__dirname, '../../../.env');
  const backendEnv = path.resolve(__dirname, '../../.env');
  if (existsSync(monorepoRootEnv)) dotenv.config({ path: monorepoRootEnv });
  else if (existsSync(backendEnv)) dotenv.config({ path: backendEnv });
  else dotenv.config();
}

export function getAwsRegion() {
  return process.env.AWS_REGION || 'us-east-1';
}

export function getS3Bucket() {
  return process.env.S3_BUCKET;
}

/**
 * After upload, the Lambda in this project logs basic info.
 * Set LAMBDA_LOG_PREFIX to a known prefix in S3 to correlate (optional).
 */
export function isConfiguredForS3() {
  return Boolean(getS3Bucket() && process.env.AWS_ACCESS_KEY_ID);
}
