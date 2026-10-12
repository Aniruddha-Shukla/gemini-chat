import { app } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';
import { isGeminiConfigured } from './services/gemini.service.js';

try {
  await connectDB();
} catch (err) {
  console.error(`Could not connect to MongoDB at ${env.mongoUri.replace(/\/\/[^@]*@/, '//***@')}`);
  console.error(`  ${err.message}`);
  console.error('  Local dev: run `npm run db:up` from the project root (needs Docker), or set MONGODB_URI to a MongoDB Atlas URI.');
  process.exit(1);
}

const server = app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port} (${env.nodeEnv})`);
  if (!isGeminiConfigured()) {
    console.warn("GEMINI_API_KEY is not set: login works, but chat requests will return 503 until it is set (server/.env locally, or your host's environment variables).");
  } else {
    console.log(`Gemini model: ${env.geminiModel}`);
  }
});

// Stop accepting connections, close open streams, then disconnect from MongoDB.
async function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  server.close();
  server.closeAllConnections();
  await disconnectDB();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
