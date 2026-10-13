import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { env } from './env.js';

// Where the built-in development database keeps its files (git-ignored).
export const LOCAL_DB_PATH = path.resolve(import.meta.dirname, '../../.data/db');
const LOCAL_DB_NAME = 'gemini-chat';

let localServer = null;

// Development without MONGODB_URI: run a real MongoDB server as a child process,
// storing data in server/.data/db so it survives restarts. No Docker or install needed;
// the MongoDB binary is downloaded once (~100 MB) and cached in node_modules/.cache.
async function startLocalMongo() {
  // Imported lazily: it's a devDependency and is never installed in production.
  const { MongoMemoryServer } = await import('mongodb-memory-server-core');
  await fs.mkdir(LOCAL_DB_PATH, { recursive: true });

  console.log('Starting built-in local MongoDB (data: server/.data/db)...');
  localServer = await MongoMemoryServer.create({
    instance: { dbPath: LOCAL_DB_PATH, storageEngine: 'wiredTiger' },
  });
  return localServer.getUri(LOCAL_DB_NAME);
}

export async function connectDB() {
  mongoose.set('strictQuery', true);

  const uri = env.mongoUri || (await startLocalMongo());

  // Fail within 5s (instead of hanging for 30s) when MongoDB isn't reachable.
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });

  const { host, port, name } = mongoose.connection;
  console.log(localServer ? `Local MongoDB ready at ${uri}` : `MongoDB connected: ${host}:${port}/${name}`);
}

export async function disconnectDB() {
  await mongoose.disconnect();
  // Stop the local server but keep its data folder.
  await localServer?.stop({ doCleanup: false });
}
