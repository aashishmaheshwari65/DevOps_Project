import { createApp } from './app.js';
import { loadEnv, getS3Bucket } from './config/env.js';
import { connectDb } from './config/db.js';

loadEnv();

const port = Number(process.env.PORT) || 3000;

/**
 * Start HTTP server after DB is ready.
 * On EC2 behind Nginx, listen on 127.0.0.1 or 0.0.0.0 as you prefer; Docker uses 0.0.0.0.
 */
async function main() {
  if (!getS3Bucket()) {
    console.warn('Warning: S3_BUCKET is not set. Uploads will fail until configured.');
  }

  await connectDb();
  const app = createApp();
  const host = process.env.BIND_HOST || '0.0.0.0';
  app.listen(port, host, () => {
    console.log(`API listening on http://${host}:${port}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
