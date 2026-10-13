import { app } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';
import { isGeminiConfigured } from './services/gemini.service.js';

try {
  await connectDB();
} catch (err) {
  if (env.mongoUri) {
    console.error(`Could not connect to MongoDB at ${env.mongoUri.replace(/\/\/[^@]*@/, '//***@')}`);
    console.error(`  ${err.message}`);
    console.error('  Check MONGODB_URI in server/.env, or remove its value to use the built-in local database.');
  } else {
    console.error('Could not start the built-in local MongoDB.');
    console.error(`  ${err.message}`);
    console.error('  The first run needs internet access to download MongoDB. Or set MONGODB_URI in server/.env to a MongoDB Atlas URI.');
  }
  await disconnectDB().catch(() => {});
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

// Stop accepting connections, close open streams, then disconnect from MongoDB
// (and stop the local database cleanly, so its data files aren't left locked).
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down...`);
  server.close();
  server.closeAllConnections();
  await disconnectDB();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
