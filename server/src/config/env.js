import path from 'node:path';
import dotenv from 'dotenv';

// Load server/.env no matter which directory the process was started from.
dotenv.config({ path: path.resolve(import.meta.dirname, '../../.env'), quiet: true });

const nodeEnv = process.env.NODE_ENV ?? 'development';
export const isProd = nodeEnv === 'production';

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}. Run \`npm run setup\` from the project root, or add it to server/.env.`);
  }
  return value;
}

export const env = {
  nodeEnv,
  port: Number(process.env.PORT) || 4000,
  // Origins allowed by CORS. Comma-separated, e.g. "https://my-app.vercel.app,https://chat.example.com"
  clientUrls: (process.env.CLIENT_URL ?? 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean),
  // Number of reverse proxies in front of the app (0 locally, usually 1 in production).
  // Needed so rate limiting sees the real client IP instead of the proxy's.
  trustProxy: Number(process.env.TRUST_PROXY) || 0,

  // Required in production. In development, leaving it empty starts a built-in local MongoDB (see db.js).
  mongoUri: isProd ? required('MONGODB_URI') : (process.env.MONGODB_URI ?? ''),

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',

  // Optional at boot: the server starts without it, and chat requests return 503 until it is set.
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-3.8-flash',
};

if (isProd && env.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production.');
}
