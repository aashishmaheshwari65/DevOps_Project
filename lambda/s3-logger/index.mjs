/**
 * AWS Lambda: triggered by S3 "Object created" events.
 * This is a **validation / logging** example: we log the bucket and key to CloudWatch.
 * You can add virus scanning, metadata extraction, or notifications here.
 *
 * In AWS: create a deployment zip with this file (and node_modules if you add deps).
 * Runtime: Node.js 20.x. Handler: index.handler (or wrap export).
 */
export const handler = async (event) => {
  // S3 can batch multiple records in one invocation
  const records = event.Records || [];
  for (const rec of records) {
    const s3 = rec.s3;
    if (!s3) continue;
    const bucket = s3.bucket?.name;
    const key = decodeURIComponent(s3.object?.key || '').replace(/\+/g, ' ');
    const size = s3.object?.size;
    // These lines appear in CloudWatch Logs for this Lambda
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'S3 object created',
        bucket,
        key,
        size,
      })
    );
  }
  return { statusCode: 200, body: 'ok' };
};
