// One-time local setup: creates server/.env from the template with a fresh JWT secret.
// Usage (from the project root): npm run setup
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const templatePath = path.join(root, 'server', '.env.example');
const envPath = path.join(root, 'server', '.env');

if (fs.existsSync(envPath)) {
  console.log('server/.env already exists - leaving it unchanged.');
} else {
  const secret = crypto.randomBytes(64).toString('hex');
  const content = fs.readFileSync(templatePath, 'utf8').replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`);
  fs.writeFileSync(envPath, content);
  console.log('Created server/.env with a newly generated JWT_SECRET.');
}

const hasKey = /^GEMINI_API_KEY=\S+/m.test(fs.readFileSync(envPath, 'utf8'));
console.log(
  hasKey
    ? '\nAll set. Start the app with: npm run dev'
    : '\nNext: open server/.env, paste your Gemini API key after GEMINI_API_KEY=\n(get one free at https://aistudio.google.com/apikey), then run: npm run dev'
);
