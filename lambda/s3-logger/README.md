# S3 → Lambda (logging example)

1. In AWS Console: **Lambda** → **Create function** → Node.js 20.x, name e.g. `s3-smartfile-logger`.
2. Upload a zip of `index.mjs` (or paste code inline).
3. **Configuration** → **Permissions**: ensure the execution role can write to CloudWatch Logs (default).
4. Add trigger: **S3** → your bucket → event type **All object create events** (or prefix `uploads/`).
5. After uploads, open **CloudWatch** → **Log groups** → `/aws/lambda/s3-smartfile-logger` to see JSON lines for each new object.

To package:

```bash
cd lambda/s3-logger
zip -r function.zip index.mjs
```

Upload `function.zip` in the Lambda code tab.

### Cost note

Frequent small uploads can generate many invocations. For class projects, this is usually fine. In production, filter by prefix and consider async processing for heavy work.
