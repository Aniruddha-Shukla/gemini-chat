import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
  mongoose.set('strictQuery', true);

  // Fail within 5s (instead of hanging for 30s) when MongoDB isn't reachable.
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });

  const { host, port, name } = mongoose.connection;
  console.log(`MongoDB connected: ${host}:${port}/${name}`);
}

export function disconnectDB() {
  return mongoose.disconnect();
}
