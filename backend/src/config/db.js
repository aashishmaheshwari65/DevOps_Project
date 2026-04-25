import mongoose from 'mongoose';

/**
 * Connect to MongoDB.
 * In production, use a connection string from env (e.g. MongoDB Atlas or EC2-hosted Mongo).
 */
export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is required. Set it in your .env file.');
  }
  await mongoose.connect(uri, {
    // Sensible defaults for small apps
  });
  console.log('MongoDB connected');
}
